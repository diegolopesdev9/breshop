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

    if (!token) {
      throw new Error("Token do Melhor Envio ausente no Supabase.");
    }

    const cepOrigem = "18200358";
    const melhorenvioProducts = [];
    let custoTotalEmbalagens = 0; // Armazena a soma das caixas

    // Consulta as medidas e custos de embalagem reais
    for (const item of items) {
      let medidasBanco = null;

      if (item.is_custom_pack) {
        // Busca a caixa exata para o pack de 5, 10, 20 ou 30 peças
        const qtdePecas = item.custom_items ? item.custom_items.length : 5;
        const { data } = await supabase
          .from('packs')
          .select('peso, comprimento, largura, altura, valor_embalagem')
          .ilike('nome', '%monte seu pack%')
          .eq('quantidade_pecas', qtdePecas)
          .single();
          
        if (data) {
            medidasBanco = data;
            custoTotalEmbalagens += Number(data.valor_embalagem || 0);
        }
      } else if (item.category === 'packs') {
        const { data } = await supabase
          .from('packs')
          .select('peso, comprimento, largura, altura, valor_embalagem')
          .eq('id', item.id)
          .single();
          
        if (data) {
            medidasBanco = data;
            custoTotalEmbalagens += Number(data.valor_embalagem || 0);
        }
      } else {
        const { data } = await supabase
          .from('produtos')
          .select('peso, comprimento, largura, altura')
          .eq('id', item.id)
          .single();
        if (data) medidasBanco = data;
      }

      melhorenvioProducts.push({
        id: item.id,
        width: medidasBanco?.largura || 15,
        height: medidasBanco?.altura || 10,
        length: medidasBanco?.comprimento || 20,
        weight: medidasBanco?.peso || 0.5,
        insurance_value: Number(item.price), 
        quantity: 1
      });
    }

    const payloadCalculo = {
      from: { postal_code: cepOrigem },
      to: { postal_code: cep_destino.replace(/\D/g, "") },
      products: melhorenvioProducts,
      options: {
        receipt: false,
        own_hand: false
      }
    };

    const response = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "agarimpeira (diegolopes.dev9@gmail.com)"
      },
      body: JSON.stringify(payloadCalculo)
    });

    const transportadoras = await response.json();

    if (!response.ok) {
        console.error("Erro Melhor Envio:", transportadoras);
        const erroDetalhado = transportadoras.message || JSON.stringify(transportadoras);
        throw new Error(`Erro na transportadora: ${erroDetalhado}`);
    }

    // Soma o custoTotalEmbalagens no frete cotado para proteger a margem de lucro
    const fretesDisponiveis = transportadoras.filter((t: any) => 
      !t.error && (t.company.name.toLowerCase().includes("correios") || t.company.name.toLowerCase().includes("jadlog"))
    ).map((t: any) => ({
      id: t.id,
      nome: t.name,
      empresa: t.company.name,
      preco: parseFloat(t.price) + custoTotalEmbalagens, // Taxa inserida aqui!
      prazo: t.delivery_time
    }));

    return new Response(JSON.stringify(fretesDisponiveis), {
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