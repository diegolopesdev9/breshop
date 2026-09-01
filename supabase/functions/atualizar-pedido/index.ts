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
    const { orderId, logisticsStatus, trackingCode } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Atualiza a coluna certa de logística no banco de dados
    const { error: updateError } = await supabase
      .from('orders')
      .update({ logistics_status: logisticsStatus, tracking_code: trackingCode })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Dispara e-mail apenas se o status logístico pedir
    if ((logisticsStatus === 'separando' || logisticsStatus === 'enviado') && resendApiKey) {
      const { data: orderInfo } = await supabase
        .from("orders")
        .select("*, customers(nome, email)")
        .eq("id", orderId)
        .single();

      if (orderInfo?.customers?.email) {
        let partesNome = orderInfo.customers.nome ? orderInfo.customers.nome.trim().split(/\s+/) : [];
        let textoNome = "Garimpeira";

        if (partesNome.length > 0) {
            if (partesNome[0].length <= 2 && partesNome.length > 1) {
                textoNome = partesNome[0] + " " + partesNome[1];
            } else {
                textoNome = partesNome[0];
            }
        }
        
        const nomeCliente = textoNome.split(" ").map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
        
        let emailSubject = "";
        let emailHtml = "";

        if (logisticsStatus === 'separando') {
            emailSubject = "Seu pedido está sendo preparado! 📦";
            emailHtml = `
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; text-align: center; border: 1px solid #eaeaea;">
                <h2 style="font-size: 20px; font-weight: bold; color: #1a1a1a;">Estamos separando o seu garimpo, ${nomeCliente}!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #333333; margin-top: 20px;">
                  O seu pagamento foi confirmado e a nossa equipe já está separando e embalando as suas peças com muito carinho.
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #666666;">
                  Assim que o pacote for despachado, você receberá outro e-mail com o código de rastreio. Fica de olho na sua caixa de entrada!
                </p>
              </div>
            `;
        } else if (logisticsStatus === 'enviado' && trackingCode) {
            emailSubject = "Seu pedido foi enviado! 🚚";
            emailHtml = `
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; text-align: center; border: 1px solid #eaeaea;">
                <h2 style="font-size: 20px; font-weight: bold; color: #1a1a1a;">Seu garimpo está a caminho, ${nomeCliente}!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #333333; margin-top: 20px;">
                  O seu pedido já foi postado e está a caminho da sua casa.
                </p>
                <p style="font-size: 16px; color: #666666;">Acompanhe a entrega usando o código de rastreio abaixo:</p>
                <div style="background-color: #f4f4f4; padding: 20px; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; color: #1a1a1a;">
                  ${trackingCode}
                </div>
                <p style="font-size: 14px; color: #999999;">Você pode rastrear direto no site dos Correios ou da transportadora escolhida.</p>
              </div>
            `;
        }

        if (emailSubject && emailHtml) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'A Garimpeirabr <contato@agarimpeirabr.com.br>',
                reply_to: 'contato.agarimpeirabr@gmail.com',
                to: orderInfo.customers.email,
                subject: emailSubject,
                html: emailHtml
              })
            });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});