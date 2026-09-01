import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function gerarCupom() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = '';
  for (let i = 0; i < 5; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return `AGBR-${resultado}`;
}

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record 

    console.log("1. Novo registro recebido. E-mail:", record?.email);

    if (!record || !record.email) {
      throw new Error("Sem registro ou e-mail na requisição.");
    }

    const { nome, email } = record;
    const cupomExclusivo = gerarCupom();

    console.log("2. Atualizando banco com o cupom:", cupomExclusivo);

    const { error: dbError } = await supabase
      .from('newsletter')
      .update({ cupom: cupomExclusivo })
      .eq('email', email);

    if (dbError) {
      console.error("ERRO NO SUPABASE:", dbError);
      throw dbError;
    }

    console.log("3. Disparando para o Resend...");

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'A Garimpeirabr <contato@agarimpeirabr.com.br>',
        reply_to: 'contato.agarimpeirabr@gmail.com',
        to: email,
        subject: 'Seu garimpo tá prestes a começar 🧡',
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fcfcfc; color: #1a1a1a; border: 1px solid #eaeaea;">
            
            <div style="padding: 40px 32px; text-align: center; border-bottom: 1px solid #eaeaea; background-color: #ffffff;">
              <img src="https://www.agarimpeirabr.com.br/logo.png" alt="A Garimpeirabr" style="width: 200px; max-width: 100%; height: auto; margin: 0 auto; display: block;" />
            </div>

            <div style="padding: 48px 32px; background-color: #fcfcfc;">
              <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px; color: #1a1a1a;">
                bem-vinda, ${nome}!
              </h2>
              <p style="font-size: 16px; margin-top: 0; margin-bottom: 32px; color: #666666;">
                seu garimpo tá prestes a começar 🧡
              </p>

              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px; color: #333333;">
                a gente garimpa, lava, higieniza e revitaliza roupas second-hand e monta em packs prontos pra vender. você foca no seu brechó e a gente cuida do trabalho pesado.
              </p>
              
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 32px; color: #333333;">
                como prometido, aqui está seu desconto de estreia:
              </p>

              <div style="background-color: #1a1a1a; padding: 40px 24px; text-align: center; margin: 32px 0;">
                <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 16px 0; color: #a0a0a0;">
                  CÓDIGO EXCLUSIVO
                </p>
                <div style="font-family: 'Georgia', serif; font-size: 32px; font-weight: normal; letter-spacing: 6px; color: #ffffff; margin-bottom: 16px;">
                  ${cupomExclusivo}
                </div>
                <p style="font-size: 13px; margin: 0; color: #e0e0e0;">
                  10% off no seu primeiro pack
                </p>
              </div>

              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 40px; color: #666666;">
                é só colar esse código no checkout na hora de fechar o pedido. um pack bom não espera 👀
              </p>

              <div style="text-align: center; margin-top: 32px; margin-bottom: 20px;">
                <a href="https://www.agarimpeirabr.com.br/src/pages/packs.html" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                  VER PACKS DISPONÍVEIS
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

    const data = await res.json();

    if (!res.ok) {
      console.error("4. RESEND RECUSOU O E-MAIL:", data);
      throw new Error(JSON.stringify(data));
    }

    console.log("5. E-mail entregue com sucesso no Resend:", data);
    return new Response(JSON.stringify({ success: true, cupom: cupomExclusivo }), { status: 200 });

  } catch (error) {
    console.error("ERRO FATAL NA FUNÇÃO:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})