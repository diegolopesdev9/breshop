import "../css/main.css";
import { supabase } from "./supabase.js";
import { renderLayout } from "./layout.js";
import { initAuth } from "./auth.js";

// Inicializa header, footer e autenticação padrão
renderLayout();

document.addEventListener("DOMContentLoaded", async () => {
    await initAuth();
    
    const urlParams = new URLSearchParams(window.location.search);
    const pecaId = urlParams.get('id');

    // Se não tiver ID na URL, joga de volta pro acervo
    if (!pecaId) {
        window.location.href = '/garimpos';
        return;
    }

    try {
        const { data: peca, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('id', pecaId)
            .single();

        if (error || !peca) throw new Error("Peça não encontrada");

        renderizarPeca(peca);
        injetarSEODinamico(peca);

    } catch (err) {
        console.error("Erro ao carregar peça:", err);
        alert("Esta peça não está mais disponível ou foi removida.");
        window.location.href = '/garimpos';
    }
});

function injetarSEODinamico(peca) {
    const nome = peca.nome || 'Peça Exclusiva';
    const descricaoRaw = peca.descricao || '';
    const imgUrl = peca.url_foto ? peca.url_foto.split(',')[0].trim() : 'https://www.agarimpeirabr.com.br/banner-social.webp';
    const currentUrl = window.location.href;
    
    const pageTitle = `${nome} — Second-Hand para Brechó | A GARIMPEIRAbr`;
    const metaDesc = `${nome}. ${descricaoRaw.substring(0, 120)}... Monte seu pack e leve esta peça.`;

    // Atualiza as Meta Tags reais do HTML
    document.getElementById('seo-title').textContent = pageTitle;
    document.getElementById('seo-desc').setAttribute('content', metaDesc);
    document.getElementById('seo-canonical').setAttribute('href', currentUrl);

    // Atualiza Open Graph (Preview de WhatsApp/Instagram)
    document.getElementById('og-title').setAttribute('content', pageTitle);
    document.getElementById('og-desc').setAttribute('content', metaDesc);
    document.getElementById('og-image').setAttribute('content', imgUrl);
    document.getElementById('og-url').setAttribute('content', currentUrl);
    
    document.getElementById('breadcrumb-nome').textContent = nome;

    // Injeta Schema.org Product (O que o Google lê de fato)
    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": nome,
        "image": peca.url_foto ? peca.url_foto.split(',').map(u => u.trim()) : [imgUrl],
        "description": descricaoRaw,
        "brand": {
            "@type": "Brand",
            "name": peca.marca || "A Garimpeirabr"
        },
        "offers": {
            "@type": "Offer",
            "url": currentUrl,
            "priceCurrency": "BRL",
            "price": peca.preco || 0,
            "availability": peca.is_active && peca.status === 'disponivel' 
                ? "https://schema.org/InStock" 
                : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/UsedCondition"
        }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
}

function renderizarPeca(peca) {
    const loading = document.getElementById('peca-loading');
    const container = document.getElementById('peca-container');
    
    if (loading) loading.remove();

    const isEsgotado = !peca.is_active || peca.status !== 'disponivel';
    const fotos = peca.url_foto ? peca.url_foto.split(',').map(u => u.trim()) : [];
    const fotoPrincipal = fotos[0] || '';
    
    const descFormatada = (peca.descricao || '').replace(/\n/g, '<br>');
    const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(peca.preco || 0);

    let galeriaHtml = '';
    if (fotos.length > 1) {
        galeriaHtml = `
            <div class="flex gap-2 overflow-x-auto snap-x mt-4 scrollbar-hide">
                ${fotos.map(foto => `
                    <img src="${foto}" onclick="trocarFotoPrincipal('${foto}')" class="w-20 h-24 md:w-24 md:h-32 object-cover border border-outline/10 cursor-pointer hover:border-primary transition-colors snap-start" />
                `).join('')}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="flex flex-col">
            <div class="w-full aspect-[3/4] md:aspect-[4/5] bg-surface-container-low border border-outline/10 relative overflow-hidden">
                <img id="foto-destaque" src="${fotoPrincipal}" alt="${peca.nome}" class="w-full h-full object-cover" />
                
                ${peca.marca ? `<span class="absolute top-4 left-4 bg-surface/90 backdrop-blur-sm border border-on-background text-[10px] uppercase tracking-widest px-3 py-1 text-on-background font-bold">${peca.marca}</span>` : ''}
                
                ${isEsgotado ? `
                    <div class="absolute inset-0 bg-background/40 flex items-center justify-center">
                        <span class="bg-red-900 text-white text-sm uppercase tracking-widest font-bold px-8 py-3">Esgotado</span>
                    </div>
                ` : ''}
            </div>
            ${galeriaHtml}
        </div>

        <div class="flex flex-col pt-2 md:pt-8">
            <div class="flex justify-between items-start gap-4 mb-4">
                <h1 class="font-serif italic text-3xl md:text-5xl text-on-background leading-tight">${peca.nome}</h1>
            </div>
            
            <p class="text-xl md:text-2xl font-light text-on-background mb-8">${precoFormatado} <span class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold ml-2 border border-outline/20 px-2 py-1">Tam: ${peca.tamanho || 'U'}</span></p>

            <div class="border-t border-b border-outline/10 py-6 mb-8 space-y-4">
                <h3 class="text-xs font-bold uppercase tracking-widest text-on-background">Detalhes da Peça</h3>
                <p class="text-sm text-on-surface-variant leading-relaxed">${descFormatada}</p>
                <div class="flex gap-4 pt-2">
                    ${peca.categoria ? `<span class="text-[10px] uppercase tracking-widest text-primary font-bold">Cat: ${peca.categoria}</span>` : ''}
                    ${peca.pack ? `<span class="text-[10px] uppercase tracking-widest text-primary font-bold">Vinculado a: ${peca.pack}</span>` : ''}
                </div>
            </div>

            <button 
                onclick="adicionarAoPack('${peca.id}')"
                class="w-full py-5 text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-xl ${isEsgotado ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-on-background text-background hover:bg-primary-container hover:text-on-primary-container'}"
                ${isEsgotado ? 'disabled' : ''}
            >
                ${isEsgotado ? 'Peça Indisponível' : 'Montar Pack com esta Peça'}
            </button>
            
            <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mt-4 text-center">Para adquirir, selecione um tamanho de pack na próxima etapa.</p>
        </div>
    `;

    container.classList.remove('hidden');
    setTimeout(() => container.classList.remove('opacity-0'), 50);

    window.trocarFotoPrincipal = (url) => {
        document.getElementById('foto-destaque').src = url;
    };

    window.adicionarAoPack = (id) => {
        window.location.href = `/packs?peca_id=${id}`;
    };
}