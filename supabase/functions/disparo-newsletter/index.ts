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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Token de autenticação não enviado.");
    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey); 

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Sessão inválida ou expirada.");

    const { data: userData } = await supabaseAdmin.from('customers').select('is_admin').eq('id', user.id).single();
    if (!userData?.is_admin) throw new Error("Você não tem privilégios de administrador.");

    const { data: contatos, error: contatosError } = await supabaseAdmin
        .from('vw_mala_direta')
        .select('email, nome');
        
    if (contatosError || !contatos || contatos.length === 0) {
        throw new Error("Nenhum contato encontrado na Mala Direta.");
    }

    const BATCH_SIZE = 100;
    let emailsEnviados = 0;

    for (let i = 0; i < contatos.length; i += BATCH_SIZE) {
        const batch = contatos.slice(i, i + BATCH_SIZE).map(contato => {
            
            // Nova Lógica de Tratamento de Nomes Curtos
            let partesNome = contato.nome ? contato.nome.trim().split(/\s+/) : [];
            let textoNome = "Garimpeira";

            if (partesNome.length > 0) {
                // Se o primeiro nome tiver 1 ou 2 letras (ex: "A", "M.", "Zé") e tiver sobrenome, pega os dois.
                if (partesNome[0].length <= 2 && partesNome.length > 1) {
                    textoNome = partesNome[0] + " " + partesNome[1];
                } else {
                    textoNome = partesNome[0];
                }
            }

            // Capitaliza a(s) palavra(s) do nome escolhido
            const nomeFormatado = textoNome
                .split(" ")
                .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
                .join(" ");

            return {
                from: 'A Garimpeirabr <contato@agarimpeirabr.com.br>',
                to: contato.email,
                subject: 'Acabou de chegar! Novas peças no acervo 👀',
                html: `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fcfcfc; color: #1a1a1a; border: 1px solid #eaeaea;">
                        <div style="padding: 40px 32px; text-align: center; border-bottom: 1px solid #eaeaea; background-color: #ffffff;">
                            <img src="https://www.agarimpeirabr.com.br/logo.png" alt="A Garimpeirabr" style="width: 200px; max-width: 100%; height: auto; margin: 0 auto; display: block;" />
                        </div>
                        <div style="padding: 48px 32px; background-color: #fcfcfc; text-align: center;">
                            <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px; color: #1a1a1a;">
                                Oi, ${nomeFormatado}!
                            </h2>
                            <p style="font-size: 16px; margin-top: 0; margin-bottom: 32px; color: #666666;">
                                acabamos de liberar novas peças exclusivas no nosso acervo.
                            </p>
                            <p style="font-size: 15px; line-height: 1.6; margin-bottom: 40px; color: #333333;">
                                corra lá, escolha as suas favoritas e monte seu pack personalizado de 5 a 30 peças. garimpo bom voa, então não perde tempo.
                            </p>
                            <a href="https://www.agarimpeirabr.com.br/garimpos" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                                GARIMPAR AGORA
                            </a>
                        </div>
                    </div>
                `
            };
        });

        const res = await fetch('https://api.resend.com/emails/batch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(batch)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error("Erro da API Resend: " + errText);
        } else {
            emailsEnviados += batch.length;
        }
    }

    return new Response(JSON.stringify({ success: true, count: emailsEnviados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});