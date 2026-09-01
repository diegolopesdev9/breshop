import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Headers para o frontend conseguir acessar a API sem bloqueio de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tratamento do preflight request do navegador
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { customer, items, paymentMethod, total, address } = await req.json();

    // Inicializa o cliente do Supabase com a Service Role para bypassar RLS na inserção interna
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const asaasKey = Deno.env.get("ASAAS_API_KEY") ?? "";

    // 1. Inserir ou atualizar cliente (Upsert pelo CPF)
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          name: customer.name,
          cpf: customer.cpf.replace(/\D/g, ""),
          phone: customer.phone,
          email: customer.email || null,
        },
        { onConflict: "cpf" },
      )
      .select()
      .single();

    if (customerError) throw new Error("Falha ao registrar cliente no banco.");

    // 2. Criar Pedido com status inicial PENDING
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerData.id,
        payment_method: paymentMethod,
        total_amount: total,
        address_zip: address.cep.replace(/\D/g, ""),
        address_street: address.rua,
        address_number: address.num,
        address_complement: address.comp || "",
      })
      .select()
      .single();

    if (orderError) throw new Error("Falha ao gerar o número do pedido.");

    // 3. Tentar Inserir Itens do Pedido
    // AQUI A MÁGICA ACONTECE: Se a trigger 'trg_check_availability' bater, ela lança um erro e para a execução.
    const orderItems = items.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.id,
      price_at_purchase: item.price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw new Error(
        "Ops! Alguém foi mais rápido e um desses garimpos acabou de ser vendido.",
      );
    }

    // 4. Integração com Asaas (Exemplo de Payload para cobrança Pix)
    // Para produção real no Asaas, você cria o customer lá primeiro e passa o id dele.
    const asaasResponse = await fetch(
      "https://sandbox.asaas.com/api/v3/payments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: asaasKey,
        },
        body: JSON.stringify({
          customer: "cus_000000000000", // Substituir pela lógica de get/create customer no Asaas
          billingType: paymentMethod === "pix" ? "PIX" : "CREDIT_CARD",
          value: total,
          dueDate: new Date().toISOString().split("T")[0],
          description: `A Garimpeira - Pedido ${orderData.id}`,
        }),
      },
    );

    const asaasData = await asaasResponse.json();

    if (!asaasResponse.ok) {
      // Rollback do pedido caso a API do Asaas caia ou recuse
      await supabase
        .from("orders")
        .update({ status: "CANCELLED" })
        .eq("id", orderData.id);
      throw new Error(
        `Erro no gateway: ${asaasData.errors[0]?.description || "Recusado"}`,
      );
    }

    // 5. Salvar o ID da transação do Asaas no nosso banco
    await supabase
      .from("orders")
      .update({ asaas_payment_id: asaasData.id })
      .eq("id", orderData.id);

    // Retornar o sucesso e os dados de pagamento (Ex: QR Code Pix ou status do Cartão) para o frontend
    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderData.id,
        paymentInfo: asaasData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
