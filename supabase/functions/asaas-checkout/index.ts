import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { customer, address, items, freight, paymentMethod, total } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const asaasKey = Deno.env.get("ASAAS_API_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- NOVA LÓGICA DINÂMICA DA TAXA ---
    const { data: config } = await supabase.from('site_config').select('marketplace_fee').limit(1).single();
    const PLATFORM_FEE_PERCENTAGE = config?.marketplace_fee ? (config.marketplace_fee / 100) : 0.15;
    // ------------------------------------

    // 1. Verifica ou cria o Cliente no Asaas
    let asaasCustomerId = "";
    const { data: customerDb } = await supabase.from('customers').select('asaas_customer_id').eq('id', customer.id).single();
    
    if (customerDb && customerDb.asaas_customer_id) {
      asaasCustomerId = customerDb.asaas_customer_id;
    } else {
      const asaasRes = await fetch("https://sandbox.asaas.com/api/v3/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify({
          name: customer.name,
          cpfCnpj: customer.cpf.replace(/\D/g, ''),
          email: customer.email,
          phone: customer.phone,
        })
      });
      const asaasData = await asaasRes.json();
      if (!asaasRes.ok) throw new Error(`Erro ao criar cliente Asaas: ${asaasData.errors[0].description}`);
      
      asaasCustomerId = asaasData.id;
      await supabase.from('customers').update({ asaas_customer_id: asaasCustomerId }).eq('id', customer.id);
    }

    // 2. Cria o Pedido no Supabase
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      customer_id: customer.id,
      payment_method: paymentMethod,
      total_amount: total,
      address_zip: address.cep.replace(/\D/g, ''),
      address_street: address.rua,
      address_number: address.num,
      address_complement: address.comp,
      status: 'pending'
    }).select().single();

    if (orderError) throw new Error("Erro ao criar pedido no banco.");

    // 3. Calcula o Split Financeiro agrupado por vendedor
    const splitData: any[] = [];
    const orderItemsToInsert = [];
    const sellerSplits: Record<string, number> = {};

    for (const item of items) {
      const sellerId = item.seller_id;
      const precoPeca = Number(item.price);
      
      // O frete não entra no split do vendedor (fica na plataforma para pagar a etiqueta)
      const taxaPlataforma = precoPeca * PLATFORM_FEE_PERCENTAGE;
      const valorLiquido = precoPeca - taxaPlataforma;

      orderItemsToInsert.push({
        order_id: orderData.id,
        product_id: item.id,
        seller_id: sellerId,
        price_at_purchase: precoPeca,
        taxa_plataforma: taxaPlataforma,
        valor_liquido_vendedor: valorLiquido,
        status_repasse: 'bloqueado'
      });

      // Só adiciona ao array do Asaas se a peça tiver um dono cadastrado e configurado
      if (sellerId && sellerId !== 'plataforma') {
        const { data: sellerData } = await supabase.from('customers').select('asaas_wallet_id').eq('id', sellerId).single();
        if (sellerData && sellerData.asaas_wallet_id) {
          if (!sellerSplits[sellerData.asaas_wallet_id]) {
            sellerSplits[sellerData.asaas_wallet_id] = 0;
          }
          sellerSplits[sellerData.asaas_wallet_id] += valorLiquido;
        }
      }
    }

    // Monta o array de split exigido pelo Asaas
    for (const walletId of Object.keys(sellerSplits)) {
      splitData.push({
        walletId: walletId,
        fixedValue: parseFloat(sellerSplits[walletId].toFixed(2))
      });
    }

    // 4. Insere os itens no banco
    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsError) throw new Error("Erro ao registrar os itens do pedido.");

    // 5. Cria a cobrança no Asaas com o Split
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Vence amanhã

    const asaasPayload: any = {
      customer: asaasCustomerId,
      billingType: paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD',
      value: total,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Breshop - Pedido #${orderData.id.split('-')[0]}`,
      externalReference: orderData.id,
    };

    if (splitData.length > 0) {
      asaasPayload.split = splitData;
    }

    const asaasChargeRes = await fetch("https://sandbox.asaas.com/api/v3/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": asaasKey },
      body: JSON.stringify(asaasPayload)
    });

    const asaasChargeData = await asaasChargeRes.json();
    if (!asaasChargeRes.ok) throw new Error(`Erro ao gerar cobrança: ${asaasChargeData.errors[0]?.description}`);

    await supabase.from('orders').update({ gateway_payment_id: asaasChargeData.id }).eq('id', orderData.id);

    return new Response(JSON.stringify({
      success: true,
      initPoint: asaasChargeData.invoiceUrl 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});