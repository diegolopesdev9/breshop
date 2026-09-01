// src/js/category.js
import "../css/main.css";
import { fetchProducts, fetchPacks } from "./supabase.js";
import { cartService } from "./cart.js";
import { openCheckout, renderCheckout, initCheckoutListeners } from "./checkout.js";
import { renderLayout } from "./layout.js";
import { initAuth } from "./auth.js";

renderLayout();

let categoryProducts = [];
const productGrid = document.getElementById("category-product-grid");
const cartCountBadge = document.getElementById("cart-count-badge");
const cartToggleBtn = document.getElementById("cart-toggle-btn");
const pageContainer = document.getElementById("category-page-container");

const currentCategory = pageContainer ? pageContainer.getAttribute("data-category") : "todos";

// ============================================================================
// MOTOR DE EMBARALHAMENTO INTELIGENTE (DISTRIBUIÇÃO EM ZÍPER)
// ============================================================================
function mixByBrand(items) {
  if (!items || items.length === 0) return [];
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const groups = {};
  let totalItems = 0;

  shuffled.forEach(item => {
    const key = (item.brand && item.brand.trim() !== '') ? item.brand.toUpperCase() : 'SEM_MARCA';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    totalItems++;
  });

  const mixed = [];
  let lastKey = null;

  while (mixed.length < totalItems) {
    let bestKey = null;
    let maxCount = -1;

    for (const key in groups) {
      if (groups[key].length > 0) {
        const canPick = (key === 'SEM_MARCA' || key !== lastKey);
        if (canPick && groups[key].length > maxCount) {
          maxCount = groups[key].length;
          bestKey = key;
        }
      }
    }
    if (!bestKey) bestKey = lastKey;

    mixed.push(groups[bestKey].shift());
    lastKey = bestKey;

    if (groups[bestKey].length === 0) {
      delete groups[bestKey];
    }
  }
  return mixed;
}

function injectDynamicProductSchema(items) {
  const existingSchema = document.getElementById('dynamic-schema-products');
  if (existingSchema) existingSchema.remove();

  if (!items || items.length === 0) return;

  const itemListElements = items.map((item, index) => {
    const schemaName = item.title || item.nome || 'A Garimpeira';
    const schemaImage = item.image || (item.url_foto ? item.url_foto.split(',')[0].trim() : '');
    const schemaDesc = item.subtitle || item.descricao || schemaName;

    return {
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": schemaName,
        "image": schemaImage,
        "description": schemaDesc,
        "offers": {
          "@type": "Offer",
          "priceCurrency": "BRL",
          "price": item.price || item.preco || 0,
          "availability": item.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
        },
        "brand": {
          "@type": "Brand",
          "name": item.brand || "A Garimpeira"
        }
      }
    };
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": itemListElements
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'dynamic-schema-products';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}

function renderCategoryProducts(itemsToRender = categoryProducts) {
  if (!productGrid) return;

  if (itemsToRender.length === 0) {
    productGrid.innerHTML = `
      <div class="col-span-full py-24 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
        <p class="text-xs uppercase tracking-widest">Nenhum item encontrado nesta categoria.</p>
      </div>
    `;
    return;
  }

  injectDynamicProductSchema(itemsToRender);

  productGrid.innerHTML = itemsToRender
    .map((item) => {
      const isEsgotado = item.soldOut;
      const tituloItem = item.title || item.nome || 'Sem título';
      const imagemItem = item.image || (item.url_foto ? item.url_foto.split(',')[0].trim() : '');
      const subtituloRaw = item.subtitle || item.descricao || '';
      const descFormatada = subtituloRaw.replace(/tecido:/i, '<br>tecido:');
      
      const overlayText = isEsgotado ? 'ESGOTADO' : (item.category === 'packs' ? 'Montar Pack' : 'Ver Detalhes');
      
      let precoFormatado = '';
      if (item.category === 'packs') {
          precoFormatado = '<span class="text-[10px] font-normal uppercase tracking-widest text-on-surface-variant">Calculado na seleção</span>';
      } else {
          precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price || item.preco || 0);
      }

      let marcaHtml = "";
      if (item.brand) {
          marcaHtml = `<span class="bg-surface/90 backdrop-blur-sm border border-on-background text-[10px] font-bold uppercase tracking-widest px-2 py-1 text-on-background">${item.brand}</span>`;
      }

      return `
      <div class="group relative flex flex-col w-full ${isEsgotado ? 'cursor-not-allowed opacity-70 grayscale' : 'cursor-pointer'}" data-item-id="${item.id}">
        <div class="w-full aspect-[3/4] bg-surface-container-low mb-4 overflow-hidden relative border border-transparent ${!isEsgotado ? 'group-hover:border-outline/10' : ''} transition-colors">
            <img class="w-full h-full object-cover object-center ${!isEsgotado ? 'group-hover:scale-105' : ''} transition-transform duration-700 ease-out" src="${imagemItem}" alt="${tituloItem} — peça second-hand para pack de brechó | A GARIMPEIRAbr"/>
            
            <div class="absolute top-2 left-2 flex gap-1 flex-col items-start">
                ${item.badge ? `<span class="bg-surface/90 backdrop-blur-sm border border-on-background text-[10px] uppercase tracking-widest px-2 py-1 text-on-background">${item.badge}</span>` : ''}
                ${marcaHtml}
            </div>
            
            <div class="absolute inset-0 ${isEsgotado ? 'bg-background/40' : 'bg-background/0 group-hover:bg-background/20'} transition-colors duration-300 flex items-center justify-center">
                <span class="${isEsgotado ? 'opacity-100 bg-red-900 text-white' : 'opacity-0 group-hover:opacity-100 bg-on-background text-background'} transition-opacity duration-300 text-xs lowercase tracking-widest font-bold px-6 py-3">${overlayText}</span>
            </div>
        </div>
        <div class="flex justify-between items-baseline gap-2">
            <h3 class="text-sm font-bold text-on-background truncate">${tituloItem}</h3>
            <span class="text-sm font-bold text-on-background whitespace-nowrap">${precoFormatado}</span>
        </div>
        <div class="flex justify-between items-start mt-1 gap-2">
            <p class="text-xs text-on-surface-variant/70">${descFormatada}</p>
            <span class="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">${item.pack || item.drop || ''}</span>
        </div>
      </div>
    `;
    })
    .join("");

  productGrid.querySelectorAll("div[data-item-id]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      const itemId = e.currentTarget.getAttribute("data-item-id");
      const clickedItem = categoryProducts.find(p => p.id === itemId);
      
      if (!clickedItem) return;

      if (clickedItem.soldOut) {
          alert("Estoque livre insuficiente no momento para a quantidade de peças exigida neste pack.");
          return;
      }

      if (clickedItem.category === 'packs') {
          await openCustomPackModal(null, clickedItem);
      } else {
          window.location.href = `/peca?id=${itemId}`;
      }
    });
  });
}

// ============================================================================
// MODAL DE SELEÇÃO DINÂMICA
// ============================================================================
async function openCustomPackModal(initialProduct, basePack) {
  const allProducts = await fetchProducts();
  
  const targetQuantity = parseInt(basePack.badge) || parseInt(basePack.quantidade_pecas) || 5;
  
  let availableItems = allProducts.filter(p => 
      p.category !== 'packs' && 
      p.soldOut === false &&
      !cartService.isItemInCart(p.id)
  );

  availableItems = mixByBrand(availableItems);

  let selectedItems = initialProduct && !cartService.isItemInCart(initialProduct.id) ? [initialProduct] : [];
  let filters = { category: 'all', size: 'all' };
  let filteredItems = [...availableItems];

  let modal = document.getElementById('custom-pack-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'custom-pack-modal';
  modal.className = 'fixed inset-0 z-[400] bg-background flex flex-col transition-opacity duration-300 opacity-0 overflow-hidden';
  document.body.appendChild(modal);

  document.body.style.overflow = 'hidden';

  const categories = [...new Set(availableItems.map(i => i.category || 'GERAL'))].sort();
  const sizes = [...new Set(availableItems.map(i => i.size || 'U'))].sort();

  const tituloDoPack = basePack.title || basePack.nome || 'Pack Especial';

  modal.innerHTML = `
      <div class="shrink-0 w-full bg-surface border-b hairline-border z-20 px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div class="flex justify-between items-center w-full md:w-auto">
              <div>
                  <h2 class="font-serif text-3xl font-bold italic">${tituloDoPack}</h2>
                  <p class="text-xs text-on-surface-variant uppercase tracking-widest mt-1">
                      <span id="pack-counter" class="text-primary font-bold text-sm">${selectedItems.length}/${targetQuantity}</span> Peças Selecionadas
                  </p>
              </div>
              <button id="close-custom-modal-mobile" class="md:hidden text-on-surface-variant hover:text-on-background transition-colors text-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
          </div>
          <div class="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div class="flex gap-2 w-full md:w-auto">
                  <select id="filter-cat" class="flex-1 bg-transparent border-b hairline-border text-[10px] md:text-xs uppercase tracking-widest text-on-background outline-none py-3 md:py-2 cursor-pointer">
                      <option value="all">CATEGORIAS</option>
                      ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                  <select id="filter-size" class="flex-1 bg-transparent border-b hairline-border text-[10px] md:text-xs uppercase tracking-widest text-on-background outline-none py-3 md:py-2 cursor-pointer">
                      <option value="all">TAMANHOS</option>
                      ${sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
                  </select>
              </div>

              <button id="btn-finish-pack" disabled class="bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50 px-4 py-3 md:px-6 md:py-3 text-[10px] md:text-xs uppercase tracking-widest font-bold transition-colors border hairline-border whitespace-nowrap w-full md:w-auto mt-2 md:mt-0">
                  FECHAR PACK
              </button>
              
              <button id="close-custom-modal" class="hidden md:block text-on-surface-variant hover:text-on-background transition-colors text-2xl ml-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
          </div>
      </div>
      
      <div class="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 overflow-y-auto pb-24">
          <div id="custom-pack-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"></div>
      </div>
  `;

  setTimeout(() => modal.classList.remove('opacity-0'), 10);

  function applyFilters() {
      filteredItems = availableItems.filter(item => {
          const itemCat = item.category || 'GERAL';
          const itemSize = item.size || 'U';

          const catMatch = filters.category === 'all' || itemCat === filters.category;
          const sizeMatch = filters.size === 'all' || itemSize === filters.size;
          return catMatch && sizeMatch;
      });
      updateGrid();
  }

  function updateGrid() {
      document.getElementById('pack-counter').textContent = `${selectedItems.length}/${targetQuantity}`;

      const dynamicPrice = selectedItems.reduce((sum, item) => sum + (item.price || item.preco || 0), 0);
      const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicPrice);

      const btn = document.getElementById('btn-finish-pack');

      if (selectedItems.length === targetQuantity) {
          btn.textContent = `FECHAR PACK (${precoFormatado})`;
          btn.className = "bg-on-background text-background px-6 py-3 text-xs uppercase tracking-widest font-bold transition-colors hover:bg-primary-container hover:text-on-primary-container border hairline-border whitespace-nowrap shadow-xl ml-auto md:ml-4";
          btn.disabled = false;
      } else {
          btn.textContent = selectedItems.length === 0 ? 'SELECIONE PEÇAS' : `VALOR: ${precoFormatado} (FALTAM ${targetQuantity - selectedItems.length})`;
          btn.className = "bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50 px-6 py-3 text-xs uppercase tracking-widest font-bold transition-colors border hairline-border whitespace-nowrap ml-auto md:ml-4";
          btn.disabled = true;
      }

      const grid = document.getElementById('custom-pack-grid');
      
      if (filteredItems.length === 0) {
          grid.innerHTML = `<p class="col-span-full text-center py-12 text-xs uppercase tracking-widest text-on-surface-variant">Nenhuma peça atende a estes filtros.</p>`;
          return;
      }

      grid.innerHTML = filteredItems.map(item => {
          const isSelected = selectedItems.some(si => si.id === item.id);
          const borderClass = isSelected ? 'border-primary border-2 shadow-lg scale-[1.02]' : 'border-transparent hover:border-outline/20 scale-100';

          const tituloItemModal = item.title || item.nome || 'Sem título';
          let fotoSrc = "";
          if (item.images && item.images.length > 0) fotoSrc = item.images[0];
          else if (item.image) fotoSrc = item.image;
          else if (item.url_foto) fotoSrc = item.url_foto.split(',')[0].trim();

          const todasAsFotos = item.images ? item.images.join(',') : (item.url_foto || item.image || '');
          const itemTamanho = item.size || 'U';
          
          let marcaHtml = "";
          if (item.brand) {
              marcaHtml = `<span class="bg-surface/90 backdrop-blur-sm border border-on-background text-[8px] font-bold uppercase tracking-widest px-2 py-1 text-on-background absolute top-2 left-2">${item.brand}</span>`;
          }

          const precoPecaHtml = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price || item.preco || 0);

          return `
          <div class="group relative flex flex-col transition-all duration-300 ${borderClass}" data-custom-item-id="${item.id}">
              <div 
                class="w-full aspect-[3/4] bg-surface-container-low mb-3 overflow-hidden relative border ${isSelected ? 'border-transparent' : 'border-outline/5'} cursor-zoom-in"
                onclick="event.stopPropagation(); abrirLightbox('${todasAsFotos}')"
              >
                  <img class="w-full h-full object-cover" src="${fotoSrc}" alt="${tituloItemModal}"/>
                  ${marcaHtml}
                  
                  <div class="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                      <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-on-background text-background text-xs lowercase tracking-widest font-bold px-4 py-2">Ver fotos</span>
                  </div>
              </div>
              
              <div class="px-1 pb-2 flex flex-col gap-2">
                  <div>
                      <h3 class="text-sm font-bold text-on-background truncate">${tituloItemModal}</h3>
                      <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Tam: ${itemTamanho} <span class="mx-1">•</span> ${precoPecaHtml}</p>
                  </div>
                  
                  <button class="btn-toggle-item w-full py-2 mt-1 text-[10px] font-bold uppercase tracking-widest border hairline-border transition-colors ${isSelected ? 'bg-primary text-on-primary border-primary' : 'bg-transparent text-on-background hover:bg-surface-variant'}" data-id="${item.id}">
                      ${isSelected ? '✓ SELECIONADO' : '+ ADICIONAR'}
                  </button>
              </div>
          </div>
          `;
      }).join('');

      grid.querySelectorAll('.btn-toggle-item').forEach(btn => {
          btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const id = btn.getAttribute('data-id');
              const itemInfo = availableItems.find(i => i.id === id);

              const isSelected = selectedItems.some(si => si.id === id);
              
              if (isSelected) {
                  selectedItems = selectedItems.filter(si => si.id !== id);
              } else {
                  if (selectedItems.length >= targetQuantity) {
                      alert(`Atenção! Este lote é limitado a exatamente ${targetQuantity} peças.`);
                      return;
                  }
                  selectedItems.push(itemInfo);
              }
              updateGrid();
          });
      });
  }

  updateGrid();

  document.getElementById('filter-cat').addEventListener('change', (e) => {
      filters.category = e.target.value;
      applyFilters();
  });
  
  document.getElementById('filter-size').addEventListener('change', (e) => {
      filters.size = e.target.value;
      applyFilters();
  });

  const fecharModalPack = () => {
      modal.classList.add('opacity-0');
      document.body.style.overflow = ''; 
      setTimeout(() => modal.remove(), 300);
  };

  document.getElementById('close-custom-modal')?.addEventListener('click', fecharModalPack);
  document.getElementById('close-custom-modal-mobile')?.addEventListener('click', fecharModalPack);

  document.getElementById('btn-finish-pack').addEventListener('click', () => {
      if (selectedItems.length !== targetQuantity) return;
      
      const res = cartService.addCustomPack(selectedItems, basePack);
      
      if (res.success) {
          modal.classList.add('opacity-0');
          document.body.style.overflow = ''; 
          setTimeout(() => {
              modal.remove();
              openCheckout(); 
          }, 300);
      } else {
          alert(res.message);
      }
  });
}

function updateBadge() {
  const badge = document.getElementById("cart-count-badge");
  if (!badge) return;
  const count = cartService.getItemCount();
  badge.textContent = count;
  badge.classList.toggle("hidden", count === 0);
}

function setupGlobalListeners() {
  const toggleBtn = document.getElementById("cart-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openCheckout();
    });
  }

  window.addEventListener("cart:updated", () => {
    renderCategoryProducts();
    updateBadge();
    renderCheckout();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initCheckoutListeners();
  await initAuth();

  if (productGrid) {
    productGrid.innerHTML = `
      <div class="col-span-full py-24 flex flex-col items-center justify-center text-on-surface-variant">
        <p class="text-xs uppercase tracking-widest animate-pulse">Sincronizando arquivo...</p>
      </div>
    `;
  }

  const allProducts = await fetchProducts();
  const availableStockCount = allProducts.filter(p => p.category !== 'packs' && p.soldOut === false).length;

  if (currentCategory === "packs") {
    const rawPacks = await fetchPacks();
    categoryProducts = rawPacks.map(pack => {
        const packQty = parseInt(pack.quantidade_pecas) || parseInt(pack.badge) || 0;
        const isSoldOut = packQty > availableStockCount;
        return { 
            ...pack, 
            category: 'packs', // Injeta a categoria 'packs'
            soldOut: isSoldOut, 
            badge: isSoldOut ? 'Esgotado' : (pack.badge || `${packQty} Peças`), 
            subtitle: isSoldOut ? 'Estoque insuficiente para este lote' : (pack.descricao || pack.subtitle) 
        };
    });
  } else {
    if (currentCategory === "garimpos") {
      categoryProducts = mixByBrand(allProducts.filter(p => p.category !== 'packs'));
    } else {
      categoryProducts = mixByBrand(allProducts.filter(p => p.category === currentCategory));
    }
  }

  renderCategoryProducts();
  updateBadge();
  setupGlobalListeners();
});

// ==========================================
// LIGHTBOX GLOBAL
// ==========================================
window.lightboxImages = [];
window.lightboxIndex = 0;

window.abrirLightbox = function(imagesStr) {
  if (!imagesStr) return;
  window.lightboxImages = imagesStr.split(',').map(img => img.trim()).filter(img => img !== "");
  window.lightboxIndex = 0;

  let lightbox = document.getElementById('image-lightbox');
  
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'image-lightbox';
    lightbox.className = 'fixed inset-0 z-[9999] hidden bg-background/95 flex items-center justify-center opacity-0 transition-opacity duration-300 backdrop-blur-md cursor-zoom-out';
    
    lightbox.innerHTML = `
      <button id="close-lightbox" class="absolute top-4 right-4 md:top-6 md:right-6 text-on-background hover:text-primary transition-colors cursor-pointer bg-surface/50 rounded-full p-1 backdrop-blur-md z-50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
      <button id="prev-lightbox" class="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-on-background hover:text-primary transition-colors cursor-pointer bg-surface/50 rounded-full p-2 backdrop-blur-md z-50 hidden flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button id="next-lightbox" class="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-on-background hover:text-primary transition-colors cursor-pointer bg-surface/50 rounded-full p-2 backdrop-blur-md z-50 hidden flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      <img id="lightbox-img" src="" class="max-w-[95vw] max-h-[95vh] object-contain shadow-2xl scale-95 transition-all duration-300" />
    `;
    
    document.body.appendChild(lightbox);

    lightbox.addEventListener('click', (e) => {
      if (e.target.id === 'image-lightbox' || e.target.closest('#close-lightbox')) window.fecharLightbox();
    });

    document.getElementById('prev-lightbox').addEventListener('click', (e) => {
        e.stopPropagation();
        window.mudarLightbox(-1);
    });

    document.getElementById('next-lightbox').addEventListener('click', (e) => {
        e.stopPropagation();
        window.mudarLightbox(1);
    });

    document.addEventListener('keydown', (e) => {
      if (document.getElementById('image-lightbox').classList.contains('hidden')) return;
      if (e.key === 'Escape') window.fecharLightbox();
      if (e.key === 'ArrowLeft') window.mudarLightbox(-1);
      if (e.key === 'ArrowRight') window.mudarLightbox(1);
    });
  }

  window.atualizarImagemLightbox();
  lightbox.classList.remove('hidden');
  void lightbox.offsetWidth; 
  lightbox.classList.remove('opacity-0');
  lightbox.classList.add('opacity-100');
  document.getElementById('lightbox-img').classList.remove('scale-95');
  document.getElementById('lightbox-img').classList.add('scale-100');
};

window.mudarLightbox = function(direcao) {
    window.lightboxIndex += direcao;
    if (window.lightboxIndex < 0) window.lightboxIndex = window.lightboxImages.length - 1;
    if (window.lightboxIndex >= window.lightboxImages.length) window.lightboxIndex = 0;
    window.atualizarImagemLightbox();
};

window.atualizarImagemLightbox = function() {
    const img = document.getElementById('lightbox-img');
    const prevBtn = document.getElementById('prev-lightbox');
    const nextBtn = document.getElementById('next-lightbox');

    if (window.lightboxImages.length > 1) {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    } else {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    }

    img.classList.remove('scale-100');
    img.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        img.src = window.lightboxImages[window.lightboxIndex];
        img.classList.remove('scale-95', 'opacity-0');
        img.classList.add('scale-100');
    }, 150);
};

window.fecharLightbox = function() {
  const lightbox = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lightbox) return;

  lightbox.classList.remove('opacity-100');
  lightbox.classList.add('opacity-0');
  img.classList.remove('scale-100');
  img.classList.add('scale-95');

  setTimeout(() => {
    lightbox.classList.add('hidden');
    img.src = '';
  }, 300);
};