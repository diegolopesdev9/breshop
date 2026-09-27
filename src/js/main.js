import "../css/main.css";
import { fetchProducts, supabase } from "./supabase.js";
import { cartService } from "./cart.js";
import { openCheckout, renderCheckout, initCheckoutListeners } from "./checkout.js";
import { initAuth } from './auth.js';
import { renderLayout } from "./layout.js"; 

renderLayout();
initCheckoutListeners(); 
initAuth();

let globalProducts = []; 

const highlightsCarousel = document.getElementById("highlights-carousel");
const getCartCountBadge = () => document.getElementById("cart-count-badge");
const getCartToggleBtn = () => document.getElementById("cart-toggle-btn");
const getSearchInput = () => document.querySelector('header input[type="text"]');

function renderCarousel(itemsToRender = globalProducts) {
  if (!highlightsCarousel) return;

  if (itemsToRender.length === 0) {
    highlightsCarousel.innerHTML = `
      <div class="w-full py-12 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
        <p class="text-xs uppercase tracking-widest font-label-sm">Nenhum desapego disponível.</p>
      </div>
    `;
    return;
  }

  const carouselItems = itemsToRender.slice(0, 8);

  highlightsCarousel.innerHTML = carouselItems
    .map((product) => {
      const isEsgotado = product.soldOut;
      const tituloItem = product.title || product.nome || 'Sem título';
      const imagemItem = product.image || (product.url_foto ? product.url_foto.split(',')[0].trim() : '');
      const subtituloRaw = product.subtitle || product.descricao || '';
      const descFormatada = subtituloRaw.replace(/tecido:/i, '<br>tecido:');
      
      const btnText = isEsgotado ? 'VENDIDO' : 'Ver Detalhes';
      const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || product.preco || 0);

      const slug = tituloItem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const productUrl = `/produto/${product.id}/${slug}`;

      let badgesHtml = "";
      if (product.brand) {
          badgesHtml += `<span class="bg-white/95 backdrop-blur-sm rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-[#1E293B] font-black shadow-sm">${product.brand}</span>`;
      }
      if (product.isVintage) {
          badgesHtml += `<span class="bg-[#F59E0B] rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-white font-black shadow-sm flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">star</span> VINTAGE</span>`;
      }
      if (product.hasAvaria) {
          badgesHtml += `<span class="bg-error rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-white font-black shadow-sm flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">info</span> AVARIA</span>`;
      }

      return `
      <div class="group relative flex flex-col w-[70vw] md:w-[280px] flex-none snap-start ${isEsgotado ? 'cursor-not-allowed opacity-70 grayscale' : 'cursor-pointer'}" 
           data-item-url="${productUrl}" data-item-id="${product.id}">
        <div class="w-full aspect-[3/4] bg-surface-container-low mb-4 overflow-hidden relative border border-transparent rounded-2xl ${!isEsgotado ? 'group-hover:border-primary/30' : ''} transition-colors shadow-sm">
            <img loading="lazy" width="280" height="373" class="w-full h-full object-cover object-center ${!isEsgotado ? 'group-hover:scale-105' : ''} transition-transform duration-700 ease-out" src="${imagemItem}" alt="${tituloItem}"/>
            
            <div class="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10">
                ${badgesHtml}
            </div>
            
            <div class="absolute inset-0 ${isEsgotado ? 'bg-background/40' : 'bg-background/0 group-hover:bg-primary/10'} transition-colors duration-300 flex items-center justify-center">
                <span class="${isEsgotado ? 'opacity-100 bg-error text-white' : 'opacity-0 group-hover:opacity-100 bg-primary text-on-primary'} transition-opacity duration-300 rounded-full font-label-lg text-xs uppercase tracking-widest font-bold px-6 py-3 shadow-md">${btnText}</span>
            </div>
        </div>
        <div class="flex justify-between items-baseline gap-2 px-1">
            <h3 class="text-base font-bold text-on-background truncate font-label-lg">${tituloItem}</h3>
            <span class="text-base font-bold text-primary-dark whitespace-nowrap">${precoFormatado}</span>
        </div>
        <div class="flex justify-between items-start mt-1 gap-2 px-1">
            <p class="text-sm font-body-md text-on-surface-variant truncate">${descFormatada}</p>
            <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap bg-surface-container px-2 py-1 rounded-md">Tam: ${product.size || 'U'}</span>
        </div>
      </div>
    `;
    })
    .join("");

  highlightsCarousel.querySelectorAll("div[data-item-url]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const itemUrl = el.getAttribute("data-item-url");
      const itemId = el.getAttribute("data-item-id");
      const clickedItem = itemsToRender.find(p => p.id === itemId);
      if (clickedItem && clickedItem.soldOut) return;
      window.location.href = itemUrl;
    });
  });
}

function updateBadge() {
  const cartCountBadge = getCartCountBadge();
  if (!cartCountBadge) return;
  const count = cartService.getItemCount();
  cartCountBadge.textContent = count;
  cartCountBadge.classList.toggle("hidden", count === 0);
}

function renderSearchResults(itemsToRender) {
  const searchGrid = document.getElementById("search-grid");
  if (!searchGrid) return;

  if (itemsToRender.length === 0) {
    searchGrid.innerHTML = `
      <div class="col-span-full py-12 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
        <p class="text-sm uppercase tracking-widest font-label-sm">Nenhum desapego encontrado.</p>
      </div>
    `;
    return;
  }

  searchGrid.innerHTML = itemsToRender.map((product) => {
    const isEsgotado = product.soldOut;
    const tituloItem = product.title || product.nome || 'Sem título';
    const imagemItem = product.image || (product.url_foto ? product.url_foto.split(',')[0].trim() : '');
    const subtituloRaw = product.subtitle || product.descricao || '';
    const btnText = isEsgotado ? 'VENDIDO' : 'Ver Detalhes';
    const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || product.preco || 0);

    const slug = tituloItem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const productUrl = `/produto/${product.id}/${slug}`;

    let badgesHtml = "";
    if (product.brand) {
        badgesHtml += `<span class="bg-white/95 backdrop-blur-sm rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-[#1E293B] font-black shadow-sm">${product.brand}</span>`;
    }
    if (product.isVintage) {
        badgesHtml += `<span class="bg-[#F59E0B] rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-white font-black shadow-sm flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">star</span> VINTAGE</span>`;
    }
    if (product.hasAvaria) {
        badgesHtml += `<span class="bg-error rounded-full font-label-sm text-[9px] uppercase tracking-widest px-2.5 py-1 text-white font-black shadow-sm flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">info</span> AVARIA</span>`;
    }

    return `
    <div class="group relative flex flex-col w-full ${isEsgotado ? 'cursor-not-allowed opacity-70 grayscale' : 'cursor-pointer'}" 
         data-item-url="${productUrl}" data-item-id="${product.id}">
      <div class="w-full aspect-[3/4] bg-surface-container-low mb-4 overflow-hidden relative border border-transparent rounded-2xl ${!isEsgotado ? 'group-hover:border-primary/30' : ''} transition-colors shadow-sm">
          <img loading="lazy" width="280" height="373" class="w-full h-full object-cover object-center ${!isEsgotado ? 'group-hover:scale-105' : ''} transition-transform duration-700 ease-out" src="${imagemItem}" alt="${tituloItem}"/>
          <div class="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10">
              ${badgesHtml}
          </div>
          <div class="absolute inset-0 ${isEsgotado ? 'bg-background/40' : 'bg-background/0 group-hover:bg-primary/10'} transition-colors duration-300 flex items-center justify-center">
              <span class="${isEsgotado ? 'opacity-100 bg-error text-white' : 'opacity-0 group-hover:opacity-100 bg-primary text-on-primary'} transition-opacity duration-300 rounded-full font-label-lg text-xs uppercase tracking-widest font-bold px-6 py-3 shadow-md">${btnText}</span>
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
  }).join("");

  searchGrid.querySelectorAll("div[data-item-url]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const itemUrl = el.getAttribute("data-item-url");
      const itemId = el.getAttribute("data-item-id");
      const clickedItem = itemsToRender.find(p => p.id === itemId);
      if (clickedItem && clickedItem.soldOut) return;
      window.location.href = itemUrl;
    });
  });
}

function setupGlobalListeners() {
  const searchResultsSection = document.getElementById("search-results-section");
  const homeContent = document.getElementById("home-content");
  const searchInput = getSearchInput();
  const cartToggleBtn = getCartToggleBtn();

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      const searchGrid = document.getElementById("search-grid");
      
      if (searchGrid) {
        if (term.trim() === '') {
          if (searchResultsSection) searchResultsSection.classList.add("hidden");
          if (homeContent) homeContent.classList.remove("hidden");
          return;
        }
        if (searchResultsSection) searchResultsSection.classList.remove("hidden");
        if (homeContent) homeContent.classList.add("hidden");

        const filtered = globalProducts.filter((p) => {
            const searchTitle = p.title || p.nome || '';
            const searchSubtitle = p.subtitle || p.descricao || '';
            const searchBrand = p.brand || '';
            return searchTitle.toLowerCase().includes(term) ||
                   searchSubtitle.toLowerCase().includes(term) ||
                   searchBrand.toLowerCase().includes(term);
        });
        renderSearchResults(filtered);
      }
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === 'Enter') {
            const term = e.target.value.toLowerCase();
            const searchGrid = document.getElementById("search-grid");
            if (!searchGrid && term.trim() !== '') {
                window.location.href = `/?q=${encodeURIComponent(term)}`;
            }
        }
    });
  }

  if (cartToggleBtn) {
    cartToggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openCheckout();
    });
  }

  window.addEventListener("cart:updated", () => {
    const destaques = globalProducts.filter(p => p.isDestaque === true);
    renderCarousel(destaques);
    updateBadge();
    renderCheckout();
  });
}

function setupCarouselDrag() {
  const slider = document.getElementById('highlights-carousel');
  if (!slider) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    slider.style.cursor = 'grabbing';
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });
  slider.addEventListener('mouseleave', () => { isDown = false; slider.style.cursor = 'default'; });
  slider.addEventListener('mouseup', () => { isDown = false; slider.style.cursor = 'default'; });
  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2; 
    slider.scrollLeft = scrollLeft - walk;
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (highlightsCarousel) {
    highlightsCarousel.innerHTML = `
      <div class="w-full py-24 flex flex-col items-center justify-center text-on-surface-variant w-full">
        <p class="text-sm uppercase tracking-widest font-label-sm animate-pulse">Carregando desapegos...</p>
      </div>
    `;
  }

  const products = await fetchProducts();
  globalProducts = products;
  
  const destaques = globalProducts.filter(p => p.isDestaque === true || p.is_destaque === true);
  renderCarousel(destaques.length > 0 ? destaques : globalProducts);
  
  updateBadge();
  setupGlobalListeners();
  setupCarouselDrag();

  try {
      const { data: config } = await supabase.from('site_config').select('*').limit(1).single();
      if (config) {
          if (config.home_title) {
              const titleEl = document.getElementById('hero-title');
              if (titleEl) titleEl.innerHTML = config.home_title.replace(/\n/g, '<br/>');
          }
          if (config.home_subtitle) {
              const subEl = document.getElementById('hero-subtitle');
              if (subEl) subEl.textContent = config.home_subtitle;
          }
          if (config.full_banner_url) {
              const sectionEl = document.getElementById('hero-section');
              const overlayEl = document.getElementById('hero-overlay');
              const waveEl = document.getElementById('hero-svg-wave');
              if (sectionEl) sectionEl.style.backgroundImage = `url('${config.full_banner_url}')`;
              if (overlayEl) overlayEl.classList.remove('hidden');
              if (waveEl) waveEl.classList.add('hidden'); 
          }
          if (config.hero_image_url) {
              const imgEl = document.getElementById('hero-image-display');
              const iconEl = document.getElementById('hero-icon-placeholder');
              if (imgEl && iconEl) {
                  imgEl.src = config.hero_image_url;
                  imgEl.classList.remove('hidden');
                  iconEl.classList.add('hidden');
              }
          }
          if (config.marketplace_fee) {
              document.querySelectorAll('.dynamic-fee-text').forEach(el => {
                  el.textContent = config.marketplace_fee;
              });
          }
      }
  } catch (err) {
      console.log("Configurações customizadas não encontradas.");
  }

  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  const searchGrid = document.getElementById("search-grid");
  
  if (query && searchGrid) {
      const searchInput = getSearchInput();
      if (searchInput) {
          searchInput.value = query;
          searchInput.dispatchEvent(new Event('input'));
      }
  }
});