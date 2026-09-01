import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN") ?? "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { customer, address, items, freight, coupon, discount, paymentMethod, total } = body;

    const orderId = crypto.randomUUID();

    const preferenceData: any = {
      items: items.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.is_custom_pack ? "Pack Customizado de Peças" : "Garimpo",
        picture_url: item.image,
        category_id: "fashion",
        quantity: item.quantity || 1,
        currency_id: "BRL",
        unit_price: item.price
      })),
      payer: {
        email: customer.email,
        name: customer.name.split(" ")[0],
        surname: customer.name.split(" ").slice(1).join(" ") || "",
        identification: {
          type: "CPF",
          number: customer.cpf.replace(/\D/g, '')
        }
      },
      back_urls: {
        success: "https://www.agarimpeirabr.com.br/packs?status=approved",
        failure: "https://www.agarimpeirabr.com.br/packs?status=failure",
        pending: "https://www.agarimpeirabr.com.br/packs?status=pending"
      },
      auto_return: "approved",
      external_reference: orderId,
    };

    // Frete com a descrição correta de embalagem inclusa
    if (freight && freight.price > 0) {
      preferenceData.items.push({
        id: "frete",
        title: `Logística e Embalagem: ${freight.name}`,
        description: "Custo de envio e caixa",
        quantity: 1,
        currency_id: "BRL",
        unit_price: freight.price
      });
    }

    if (discount && discount > 0) {
      preferenceData.items.push({
        id: "desconto",
        title: `Desconto (Cupom: ${coupon || 'Aplicado'})`,
        description: "Desconto promocional",
        quantity: 1,
        currency_id: "BRL",
        unit_price: -Math.abs(discount)
      });
    }

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const err = await mpResponse.text();
      console.error("Erro no Mercado Pago:", err);
      throw new Error("Falha ao gerar o link de pagamento da instituição financeira.");
    }

    const mpData = await mpResponse.json();

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      customer_id: customer.id,
      total_amount: total,
      status: 'pending'
    });

    if (orderError) throw orderError;

    const orderItemsToInsert = items.map((item: any) => ({
      order_id: orderId,
      product_id: item.id,
      price: item.price,
      quantity: item.quantity || 1,
      custom_items: item.custom_items || null 
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);

    if (itemsError) throw itemsError;

    return new Response(JSON.stringify({
      success: true,
      initPoint: mpData.init_point
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro Crítico no Checkout:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});