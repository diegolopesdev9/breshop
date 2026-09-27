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
    const { cep_destino, items } = await req.json();
    const token = Deno.env.get("MELHOR_ENVIO_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!token) throw new Error("Token do Melhor Envio ausente.");

    // Agrupa os itens do carrinho pelo ID do vendedor
    const itemsBySeller: Record<string, any[]> = {};
    for (const item of items) {
      const seller = item.seller_id || 'plataforma';
      if (!itemsBySeller[seller]) itemsBySeller[seller] = [];
      itemsBySeller[seller].push(item);
    }

    let freteEconomicoTotal = 0;
    let freteExpressoTotal = 0;
    let prazoMaximoEconomico = 0;
    let prazoMaximoExpresso = 0;

    // Faz uma cotação separada para cada vendedor
    for (const sellerId of Object.keys(itemsBySeller)) {
      const sellerItems = itemsBySeller[sellerId];
      let cepOrigem = "";

      if (sellerId !== 'plataforma') {
        const { data: sellerData } = await supabase
          .from('customers')
          .select('cep_origem')
          .eq('id', sellerId)
          .single();
          
        if (sellerData && sellerData.cep_origem) {
          cepOrigem = sellerData.cep_origem;
        } else {
          throw new Error("Uma das lojas deste pedido não possui CEP de origem cadastrado.");
        }
      } else {
        throw new Error("Vendedor inválido para cálculo logístico C2C.");
      }

      const melhorenvioProducts = [];
      for (const item of sellerItems) {
        const { data: prodData } = await supabase
          .from('produtos')
          .select('peso, comprimento, largura, altura')
          .eq('id', item.id)
          .single();

        melhorenvioProducts.push({
          id: item.id,
          width: prodData?.largura || 15,
          height: prodData?.altura || 10,
          length: prodData?.comprimento || 20,
          weight: prodData?.peso || 0.5,
          insurance_value: Number(item.price),
          quantity: 1
        });
      }

      const payloadCalculo = {
        from: { postal_code: cepOrigem.replace(/\D/g, "") },
        to: { postal_code: cep_destino.replace(/\D/g, "") },
        products: melhorenvioProducts,
        options: { receipt: false, own_hand: false }
      };

      const response = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "User-Agent": "Breshop (suporte@breshop.com.br)"
        },
        body: JSON.stringify(payloadCalculo)
      });

      const transportadoras = await response.json();
      if (!response.ok) throw new Error("Erro ao consultar frete para um dos pacotes na transportadora.");

      const validOptions = transportadoras.filter((t: any) => !t.error);
      
      if (validOptions.length === 0) {
          throw new Error("Nenhuma transportadora atende a rota solicitada.");
      }
      
      const economico = validOptions.reduce((prev: any, curr: any) => 
        (parseFloat(prev.price) < parseFloat(curr.price) ? prev : curr)
      );
      const expresso = validOptions.reduce((prev: any, curr: any) => 
        (parseInt(prev.delivery_time) < parseInt(curr.delivery_time) ? prev : curr)
      );

      freteEconomicoTotal += parseFloat(economico.price);
      freteExpressoTotal += parseFloat(expresso.price);
      prazoMaximoEconomico = Math.max(prazoMaximoEconomico, parseInt(economico.delivery_time));
      prazoMaximoExpresso = Math.max(prazoMaximoExpresso, parseInt(expresso.delivery_time));
    }

    const fretesConsolidados = [
      { id: "eco", nome: "Econômico", empresa: "Transportadoras Parceiras", preco: freteEconomicoTotal, prazo: prazoMaximoEconomico },
      { id: "exp", nome: "Expresso", empresa: "Transportadoras Parceiras", preco: freteExpressoTotal, prazo: prazoMaximoExpresso }
    ];

    return new Response(JSON.stringify(fretesConsolidados), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});