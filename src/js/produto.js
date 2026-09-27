import "../css/main.css";
import { supabase } from "./supabase.js";
import { renderLayout } from "./layout.js";
import { initAuth } from "./auth.js";
import { cartService } from "./cart.js";
import { openCheckout, openAuthDrawer } from "./checkout.js";

renderLayout();

document.addEventListener("DOMContentLoaded", async () => {
    await initAuth();
    
    const urlParams = new URLSearchParams(window.location.search);
    let pecaId = urlParams.get('id');
    
    const pathParts = window.location.pathname.split('/');
    if (!pecaId && pathParts.length > 2 && pathParts[1] === 'produto') {
        pecaId = pathParts[2];
    }

    if (!pecaId) {
        window.location.href = '/comprar';
        return;
    }

    try {
        const { data: peca, error } = await supabase
            .from('produtos')
            .select(`
                *,
                vw_lojinhas!produtos_seller_id_fkey (nome_loja)
            `)
            .eq('id', pecaId)
            .single();

        if (error || !peca) throw new Error("Peça não encontrada");

        renderizarPeca(peca);
        injetarSEODinamico(peca);
        injetarDadosEstruturadosSEO(peca);

    } catch (err) {
        console.error("Erro ao carregar peça:", err);
        alert("Este desapego não está mais disponível ou foi removido.");
        window.location.href = '/comprar';
    }
});

function injetarSEODinamico(peca) {
    const nome = peca.nome || 'Desapego';
    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const urlBase = `https://www.breshop.com.br/produto/${peca.id}/${slug}`;
    const img = peca.url_foto ? peca.url_foto.split(',')[0].trim() : 'https://www.breshop.com.br/logo.webp';
    const desc = (peca.descricao || '').substring(0, 150);

    document.getElementById('seo-title').textContent = `${nome} | Breshop`;
    document.getElementById('breadcrumb-nome').textContent = nome;

    const setAttr = (id, attr, value) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute(attr, value);
    };

    setAttr('canonical-url', 'href', urlBase);
    setAttr('og-title', 'content', `${nome} | Breshop`);
    setAttr('og-desc', 'content', desc);
    setAttr('og-image', 'content', img);
    setAttr('og-url', 'content', urlBase);
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", desc);
}

function injetarDadosEstruturadosSEO(peca) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": peca.nome,
        "image": peca.url_foto ? peca.url_foto.split(',')[0].trim() : '',
        "description": peca.descricao,
        "brand": { "@type": "Brand", "name": peca.marca || "Vintage" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "BRL",
            "price": peca.preco,
            "availability": (peca.status === 'disponivel') ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": peca.vw_lojinhas?.nome_loja || "Lojinha Breshop" }
        }
    });
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
    const nomeVendedor = peca.vw_lojinhas?.nome_loja || 'Lojinha Breshop';

    let galeriaHtml = '';
    if (fotos.length > 1) {
        galeriaHtml = `
            <div class="flex gap-3 overflow-x-auto snap-x mt-4 scrollbar-hide pb-2">
                ${fotos.map(foto => `
                    <img src="${foto}" onclick="trocarFotoPrincipal('${foto}')" width="96" height="128" class="w-20 h-24 md:w-24 md:h-32 object-cover rounded-xl border-2 border-transparent cursor-pointer hover:border-primary transition-colors snap-start shadow-sm" />
                `).join('')}
            </div>
        `;
    }

    let badgesHtml = "";
    if (peca.marca && peca.marca.toLowerCase() !== "sem marca") {
        badgesHtml += `<span class="bg-white/95 backdrop-blur-sm rounded-full font-label-sm text-[10px] uppercase tracking-widest px-3 py-1 text-[#1E293B] font-black shadow-sm">${peca.marca}</span>`;
    }
    if (peca.is_vintage) {
        badgesHtml += `<span class="bg-[#F59E0B] rounded-full font-label-sm text-[10px] uppercase tracking-widest px-3 py-1 text-white font-black shadow-sm flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">star</span> VINTAGE</span>`;
    }
    if (peca.has_avaria) {
        badgesHtml += `<span class="bg-error rounded-full font-label-sm text-[10px] uppercase tracking-widest px-3 py-1 text-white font-black shadow-sm flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">info</span> AVARIA</span>`;
    }

    container.innerHTML = `
        <div class="flex flex-col">
            <div class="w-full aspect-[3/4] md:aspect-[4/5] bg-surface-container-low rounded-3xl border border-outline-variant relative overflow-hidden shadow-sm">
                <img id="foto-destaque" src="${fotoPrincipal}" alt="${peca.nome}" width="600" height="800" class="w-full h-full object-cover" />
                
                <div class="absolute top-4 left-4 flex flex-col items-start gap-1.5 z-10">
                    ${badgesHtml}
                </div>
                
                ${isEsgotado ? `
                    <div class="absolute inset-0 bg-background/40 flex items-center justify-center z-10">
                        <span class="bg-error text-white text-sm uppercase tracking-widest font-bold px-8 py-3 rounded-full shadow-md">Vendido</span>
                    </div>
                ` : ''}
            </div>
            ${galeriaHtml}
        </div>

        <div class="flex flex-col pt-2 md:pt-8">
            <h1 class="font-headline-xl text-4xl md:text-5xl text-on-background leading-tight mb-4">${peca.nome}</h1>
            
            <p class="text-2xl md:text-3xl font-bold text-primary-dark mb-6">${precoFormatado}</p>

            <div class="bg-surface-container rounded-3xl p-6 mb-8 border border-outline-variant shadow-sm">
                <div class="flex justify-between items-center mb-4">
                    <span class="font-label-lg font-bold text-base text-on-background">Detalhes do Desapego</span>
                    <span class="bg-surface px-3 py-1 rounded-lg font-label-sm text-xs font-bold border border-outline-variant">Tam: ${peca.tamanho || 'U'}</span>
                </div>
                <p class="font-body-md text-sm text-on-surface-variant leading-relaxed mb-4">${descFormatada}</p>
                <div class="flex gap-2">
                    ${peca.categoria ? `<span class="bg-primary-container text-on-primary-container px-4 py-1.5 rounded-full font-label-sm text-[10px] font-bold uppercase tracking-widest">${peca.categoria}</span>` : ''}
                </div>
            </div>

            <button 
                id="btn-add-carrinho"
                class="w-full py-4 font-label-lg text-sm font-bold uppercase tracking-widest rounded-full transition-all shadow-md ${isEsgotado ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-primary text-on-primary hover:opacity-90'}"
                ${isEsgotado ? 'disabled' : ''}
            >
                ${isEsgotado ? 'Peça Indisponível' : 'Adicionar à Sacola'}
            </button>
            
            <div class="mt-6 text-center flex flex-col items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" onclick="window.location.href='/comprar?loja=${peca.seller_id}'">
                <span class="material-symbols-outlined text-outline-variant text-3xl">storefront</span>
                <p class="font-body-md text-xs text-on-surface-variant">Vendido e entregue por: <strong class="text-on-background hover:text-primary transition-colors">${nomeVendedor}</strong></p>
            </div>
        </div>
    `;

    container.classList.remove('hidden');
    setTimeout(() => container.classList.remove('opacity-0'), 50);

    window.trocarFotoPrincipal = (url) => {
        document.getElementById('foto-destaque').src = url;
    };

    const btnAdd = document.getElementById('btn-add-carrinho');
    if (btnAdd) {
        btnAdd.addEventListener('click', async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                openAuthDrawer();
                return;
            }

            const result = cartService.addItem({
                id: peca.id,
                title: peca.nome,
                price: peca.preco,
                image: fotoPrincipal,
                seller_id: peca.seller_id,
                soldOut: isEsgotado
            });

            if (result.success) {
                openCheckout();
            } else {
                alert(result.message);
            }
        });
    }
}