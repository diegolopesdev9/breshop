import "../css/main.css";
import { supabase } from "./supabase.js";
import { renderLayout } from "./layout.js";
import { initAuth } from "./auth.js";
import { initCheckoutListeners } from "./checkout.js";

renderLayout();

document.addEventListener("DOMContentLoaded", async () => {
    initCheckoutListeners();
    await initAuth();

    const grid = document.getElementById("lojinhas-grid");
    grid.innerHTML = '<p class="font-label-sm text-sm uppercase tracking-widest animate-pulse col-span-full text-center py-12">Buscando lojinhas ativas...</p>';

    try {
        // Busca da View Segura para não expor CPFs e dados sensíveis (Adequação LGPD)
        const { data: lojinhas, error } = await supabase
            .from('vw_lojinhas')
            .select('id, nome_loja, logo_url, banner_url');

        if (error) throw error;

        if (!lojinhas || lojinhas.length === 0) {
            grid.innerHTML = '<p class="font-body-md text-sm text-on-surface-variant col-span-full text-center py-12">Nenhuma lojinha ativa no momento.</p>';
            return;
        }

        grid.innerHTML = lojinhas.map(loja => {
            const banner = loja.banner_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop';
            const logo = loja.logo_url || '/logo.png';
            const nome = loja.nome_loja || 'Lojinha Breshop';

            return `
            <div class="bg-surface-container rounded-3xl border border-outline-variant overflow-hidden shadow-sm hover:border-primary/50 transition-colors flex flex-col group cursor-pointer" onclick="window.location.href='/comprar?loja=${loja.id}&nome=${encodeURIComponent(nome)}'">
                <div class="h-32 w-full bg-surface-container-high relative overflow-hidden">
                    <img src="${banner}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Banner da Lojinha">
                    <div class="absolute inset-0 bg-black/20"></div>
                </div>
                <div class="px-6 pb-6 pt-0 flex flex-col items-center -mt-12 relative z-10">
                    <img src="${logo}" class="w-24 h-24 rounded-full object-cover border-4 border-surface-container bg-surface shadow-sm mb-4">
                    <h3 class="font-headline-xl text-2xl text-on-background text-center truncate w-full">${nome}</h3>
                    <button class="mt-4 bg-primary text-on-primary font-label-lg text-xs uppercase tracking-widest py-3 px-6 rounded-full font-bold group-hover:opacity-90 transition-opacity">Ver Desapegos</button>
                </div>
            </div>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p class="text-error text-center py-12">Erro ao carregar as lojinhas.</p>';
    }
});