import "../css/main.css";
import { supabase, fetchProducts } from "./supabase.js";
import { cartService } from "./cart.js";
import { openCheckout, renderCheckout, initCheckoutListeners } from "./checkout.js";
import { renderLayout } from "./layout.js";
import { initAuth } from "./auth.js";

renderLayout();

let categoryProducts = [];
const productGrid = document.getElementById("category-product-grid");

function renderCategoryProducts(itemsToRender = categoryProducts) {
  if (!productGrid) return;

  if (itemsToRender.length === 0) {
    productGrid.innerHTML = `
      <div class="col-span-full py-24 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
        <p class="text-sm uppercase tracking-widest font-label-sm">Nenhum desapego encontrado nesta categoria.</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = itemsToRender
    .map((item) => {
      const isEsgotado = item.soldOut;
      const tituloItem = item.title || item.nome || 'Sem título';
      const imagemItem = item.image || (item.url_foto ? item.url_foto.split(',')[0].trim() : '');
      const subtituloRaw = item.subtitle || item.descricao || '';
      const overlayText = isEsgotado ? 'VENDIDO' : 'Ver Detalhes';
      const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price || item.preco || 0);

      const slug = tituloItem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const productUrl = `/produto/${item.id}/${slug}`;

      let badgesHtml = "";
      if (item.brand) {
          badgesHtml += `<span class="bg-white/95 backdrop-blur-sm rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-[#1E293B] font-black shadow-sm">${item.brand}</span>`;
      }
      if (item.isVintage) {
          badgesHtml += `<span class="bg-[#F59E0B] rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-white font-black shadow-sm flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">star</span> VINTAGE</span>`;
      }
      if (item.hasAvaria) {
          badgesHtml += `<span class="bg-error rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-white font-black shadow-sm flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">info</span> AVARIA</span>`;
      }

      return `
      <div class="group relative flex flex-col w-full ${isEsgotado ? 'cursor-not-allowed opacity-70 grayscale' : 'cursor-pointer'}" data-item-url="${productUrl}" data-item-id="${item.id}">
        <div class="w-full aspect-[3/4] bg-surface-container-low mb-4 overflow-hidden relative border border-transparent rounded-2xl ${!isEsgotado ? 'group-hover:border-primary/30' : ''} transition-colors shadow-sm">
            <img loading="lazy" width="280" height="373" class="w-full h-full object-cover object-center ${!isEsgotado ? 'group-hover:scale-105' : ''} transition-transform duration-700 ease-out" src="${imagemItem}" alt="${tituloItem}"/>
            
            <div class="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10">
                ${badgesHtml}
            </div>

            <div class="absolute inset-0 ${isEsgotado ? 'bg-background/40' : 'bg-background/0 group-hover:bg-primary/10'} transition-colors duration-300 flex items-center justify-center">
                <span class="${isEsgotado ? 'opacity-100 bg-error text-white' : 'opacity-0 group-hover:opacity-100 bg-primary text-on-primary'} transition-opacity duration-300 rounded-full font-label-lg text-xs uppercase tracking-widest font-bold px-6 py-3 shadow-md">${overlayText}</span>
            </div>
        </div>
        <div class="flex justify-between items-baseline gap-2 px-1">
            <h3 class="text-base font-bold text-on-background truncate font-label-lg">${tituloItem}</h3>
            <span class="text-base font-bold text-primary-dark whitespace-nowrap">${precoFormatado}</span>
        </div>
        <div class="flex justify-between items-start mt-1 gap-2 px-1">
            <p class="text-sm font-body-md text-on-surface-variant truncate">${subtituloRaw}</p>
        </div>
      </div>
    `;
    })
    .join("");

  productGrid.querySelectorAll("div[data-item-url]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      const itemUrl = el.currentTarget.getAttribute("data-item-url");
      const itemId = el.currentTarget.getAttribute("data-item-id");
      const clickedItem = categoryProducts.find(p => p.id === itemId);
      if (!clickedItem || clickedItem.soldOut) return;
      window.location.href = itemUrl;
    });
  });
}

function updateBadge() {
  const badge = document.getElementById("cart-count-badge");
  if (!badge) return;
  const count = cartService.getItemCount();
  badge.textContent = count;
  badge.classList.toggle("hidden", count === 0);
}

document.addEventListener("DOMContentLoaded", async () => {
  initCheckoutListeners();
  await initAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const lojaId = urlParams.get('loja');
  const nomeLoja = urlParams.get('nome');

  if (nomeLoja) {
      const titleEl = document.getElementById('comprar-title');
      const subEl = document.getElementById('comprar-subtitle');
      if (titleEl) titleEl.textContent = nomeLoja;
      if (subEl) subEl.textContent = "Peças exclusivas desta lojinha.";
  }

  if (productGrid) {
    productGrid.innerHTML = `
      <div class="col-span-full py-24 flex flex-col items-center justify-center text-on-surface-variant">
        <p class="text-sm uppercase tracking-widest font-label-sm animate-pulse">Sincronizando acervo...</p>
      </div>
    `;
  }

  let allProducts = await fetchProducts();
  
  if (allProducts.length > 0 && !allProducts[0].seller_id) {
     const { data } = await supabase.from('produtos').select('id, seller_id');
     if (data) {
         allProducts = allProducts.map(p => {
             const match = data.find(db => String(db.id) === p.id);
             return { ...p, seller_id: match ? match.seller_id : null };
         });
     }
  }

  if (lojaId) {
      categoryProducts = allProducts.filter(p => p.seller_id === lojaId);
  } else {
      categoryProducts = allProducts;
  }

  renderCategoryProducts();
  updateBadge();

  const toggleBtn = document.getElementById("cart-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => { e.preventDefault(); openCheckout(); });
  }
  window.addEventListener("cart:updated", () => { updateBadge(); renderCheckout(); });
});