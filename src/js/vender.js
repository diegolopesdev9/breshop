import "../css/main.css";
import { renderLayout } from "./layout.js";
import { initAuth } from "./auth.js";
import { supabase } from "./supabase.js"; // Correção da importação aqui
import { initCheckoutListeners } from "./checkout.js";

renderLayout();

const compressImage = async (file, maxWidth, maxHeight, quality = 0.8) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                    const newFile = new File([blob], newFileName, {
                        type: 'image/webp',
                        lastModified: Date.now()
                    });
                    resolve(newFile);
                }, 'image/webp', quality);
            };
        };
    });
};

document.addEventListener("DOMContentLoaded", async () => {
    initCheckoutListeners();
    await initAuth();

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = "/";
        return;
    }

    const { data: customer } = await supabase.from('customers').select('cep_origem').eq('id', session.user.id).single();
    if (!customer || !customer.cep_origem) {
        alert("Para anunciar, você precisa ativar sua lojinha primeiro informando o CEP.");
        window.location.href = "/minha-conta";
        return;
    }

    const chkAvaria = document.getElementById('vender-has-avaria');
    const avisoAvaria = document.getElementById('aviso-avaria');
    
    if (chkAvaria && avisoAvaria) {
        chkAvaria.addEventListener('change', (e) => {
            if (e.target.checked) {
                avisoAvaria.classList.remove('hidden');
            } else {
                avisoAvaria.classList.add('hidden');
            }
        });
    }

    const form = document.getElementById("form-vender");
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById("btn-submit-vender");
        const originalText = btn.innerHTML;
        btn.textContent = "TRATANDO FOTOS E PUBLICANDO...";
        btn.disabled = true;

        try {
            const files = Array.from(document.getElementById("vender-fotos").files).slice(0, 4);
            if (files.length === 0) throw new Error("Selecione pelo menos uma foto.");

            let uploadedUrls = [];

            for (const originalFile of files) {
                const processedFile = await compressImage(originalFile, 1200, 1200, 0.8);
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
                const filePath = `produtos/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('fotos').upload(filePath, processedFile, { 
                    cacheControl: '31536000',
                    contentType: 'image/webp'
                });
                
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('fotos').getPublicUrl(filePath);
                uploadedUrls.push(publicUrlData.publicUrl);
            }

            const fotosString = uploadedUrls.join(', ');

            const payload = {
                seller_id: session.user.id,
                nome: document.getElementById("vender-nome").value,
                descricao: document.getElementById("vender-descricao").value,
                preco: parseFloat(document.getElementById("vender-preco").value),
                tamanho: document.getElementById("vender-tamanho").value,
                categoria: document.getElementById("vender-categoria").value,
                marca: document.getElementById("vender-marca").value || "Sem Marca",
                status: 'disponivel',
                is_active: true,
                url_foto: fotosString,
                peso: 0.5,
                comprimento: 20,
                largura: 15,
                altura: 10,
                is_vintage: document.getElementById('vender-is-vintage').checked,
                has_avaria: document.getElementById('vender-has-avaria').checked
            };

            const { error: dbError } = await supabase.from('produtos').insert([payload]);
            if (dbError) throw dbError;

            alert("Desapego anunciado com sucesso!");
            window.location.href = "/minha-conta";

        } catch (error) {
            alert(`Erro ao anunciar: ${error.message}`);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
});