import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {

  console.log("🔔 ALERTA: WEBHOOK BATEU NA PORTA!", req.url);

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    console.log("📦 DADOS RECEBIDOS:", body);

    const paymentId = url.searchParams.get("data.id") || body?.data?.id;
    const eventType = url.searchParams.get("type") || body?.type || body?.action;

    if (paymentId && eventType?.includes("payment")) {
      const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN") ?? "";
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

      const supabase = createClient(supabaseUrl, supabaseKey);

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": `Bearer ${mpAccessToken}` }
      });
      const paymentData = await mpResponse.json();

      const orderId = paymentData.external_reference; 
      const status = paymentData.status; 

      if (orderId) {
        // Atualiza o status do pedido
        await supabase.from("orders").update({ status: status }).eq("id", orderId);

        // Busca os itens do pedido (Puxando a nova coluna custom_items)
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, custom_items")
          .eq("order_id", orderId);

        // 1. PAGAMENTO APROVADO - BAIXA NO ESTOQUE E DISPARA E-MAILS
        if (status === "approved") {
          
          if (orderItems) {
            for (const item of orderItems) {
              // Verifica se é o "Monte seu Pack" (possui o array de peças)
              if (item.custom_items && Array.isArray(item.custom_items) && item.custom_items.length > 0) {
                // Dá baixa nas 5 peças simultaneamente
                await supabase.from("produtos")
                  .update({ status: "vendido", is_active: false })
                  .in("id", item.custom_items);
              } else {
                // Tratamento normal para Peça Solta ou Pack Fechado
                await supabase.from("produtos").update({ status: "vendido", is_active: false }).eq("id", item.product_id);
                await supabase.from("packs").update({ is_active: false }).eq("id", item.product_id);

                const { data: packData } = await supabase.from("packs").select("nome").eq("id", item.product_id).single();

                if (packData && packData.nome) {
                  await supabase.from("produtos")
                    .update({ status: "vendido", is_active: false })
                    .ilike("pack", packData.nome);
                }
              }
            }
          }

          if (resendApiKey) {
            const { data: orderInfo } = await supabase
              .from("orders")
              .select("*, customers(nome, email)")
              .eq("id", orderId)
              .single();

            if (orderInfo && orderInfo.customers && orderInfo.customers.email) {
              const nomeCliente = orderInfo.customers.nome.split(" ")[0];
              const emailCliente = orderInfo.customers.email;
              const valorTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderInfo.total_amount);

              // Disparo via Resend para a CLIENTE
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: 'A Garimpeirabr <contato@agarimpeirabr.com.br>',
                  reply_to: 'contato.agarimpeirabr@gmail.com',
                  to: emailCliente,
                  subject: `Oba! Pagamento Aprovado 🧡`,
                  html: `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fcfcfc; color: #1a1a1a; border: 1px solid #eaeaea;">
                      <div style="padding: 40px 32px; text-align: center; border-bottom: 1px solid #eaeaea; background-color: #ffffff;">
                        <img src="https://www.agarimpeirabr.com.br/logo.png" alt="A Garimpeirabr" style="width: 200px; max-width: 100%; height: auto; margin: 0 auto; display: block;" />
                      </div>
                      <div style="padding: 48px 32px; background-color: #fcfcfc;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px; color: #1a1a1a;">
                          pagamento confirmado, ${nomeCliente.toLowerCase()}!
                        </h2>
                        <p style="font-size: 16px; margin-top: 0; margin-bottom: 32px; color: #666666;">
                          seu garimpo agora é oficialmente seu 🧡
                        </p>
                        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px; color: #333333;">
                          recebemos o seu pagamento no valor de <strong>${valorTotal}</strong> e o seu pedido já está na nossa fila de separação.
                        </p>
                        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 40px; color: #666666;">
                          assim que ele for despachado, você receberá um novo aviso. relaxa e deixa o trabalho pesado com a gente.
                        </p>
                        <div style="text-align: center; margin-top: 32px; margin-bottom: 20px;">
                          <a href="https://www.agarimpeirabr.com.br/src/pages/minha-conta.html" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                            ACOMPANHAR PEDIDO
                          </a>
                        </div>
                      </div>
                      <div style="padding: 40px 32px; background-color: #ffffff; border-top: 1px solid #eaeaea; text-align: center;">
                        <img src="https://www.agarimpeirabr.com.br/icone.png" alt="Ícone A Garimpeira" style="width: 48px; height: auto; margin-bottom: 16px; display: inline-block;" />
                        <p style="font-size: 12px; margin: 0 0 8px 0; color: #666666;">
                          © 2026 A Garimpeira. Packs de roupas second-hand.
                        </p>
                        <p style="font-size: 12px; margin: 0; color: #999999;">
                          Itapetininga, SP
                        </p>
                      </div>
                    </div>
                  `
                })
              });

              // Disparo de aviso interno para o LOJISTA
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: 'Sistema A Garimpeira <contato@agarimpeirabr.com.br>',
                  to: [
                    'contato.agarimpeirabr@gmail.com',
                    'diegolopes.dev9@gmail.com',
                    'aimee.pavanelli@gmail.com'
                  ],
                  subject: `💰 NOVA VENDA: Pedido #${orderId}`,
                  html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                      <h2>Aê! Venda confirmada.</h2>
                      <p>Você acabou de receber um pagamento de <strong>${valorTotal}</strong>.</p>
                      <p><strong>Cliente:</strong> ${nomeCliente} (${emailCliente})</p>
                      <p>Acesse o painel executivo para ver os detalhes e separar o pack.</p>
                    </div>
                  `
                })
              });
            }
          }
        }

        // 2. PAGAMENTO RECUSADO/CANCELADO - DEVOLVE PARA A VITRINE
        if (status === "rejected" || status === "cancelled" || status === "refunded") {
          
          if (orderItems) {
            for (const item of orderItems) {
              // Devolve as 5 peças do "Monte seu Pack" para o acervo
              if (item.custom_items && Array.isArray(item.custom_items) && item.custom_items.length > 0) {
                await supabase.from("produtos")
                  .update({ status: "disponivel", is_active: true })
                  .in("id", item.custom_items);
              } else {
                // Devolve as peças normais
                await supabase.from("produtos").update({ status: "disponivel", is_active: true }).eq("id", item.product_id);
                await supabase.from("packs").update({ is_active: true }).eq("id", item.product_id);

                const { data: packData } = await supabase.from("packs").select("nome").eq("id", item.product_id).single();

                if (packData && packData.nome) {
                  await supabase.from("produtos")
                    .update({ status: "disponivel", is_active: true })
                    .ilike("pack", packData.nome);
                }
              }
            }
          }
        }
      }
    }
    
    return new Response("Webhook processado", { status: 200 });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return new Response("Erro interno", { status: 500 });
  }
});