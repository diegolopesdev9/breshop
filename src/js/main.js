import "../css/main.css";
import { fetchProducts, fetchPacks, supabase } from "./supabase.js";
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

async function applySiteConfig() {
  try {
    const { data, error } = await supabase.from('site_config').select('key, value');

    if (error || !data) return;

    const config = data.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    const heroImg = document.getElementById('hero-img');
    const heroTag = document.getElementById('hero-tag');
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const heroButton = document.getElementById('hero-cta-button');

    if (heroImg && config.hero_img) {
      heroImg.src = config.hero_img;
      localStorage.setItem('garimpeira_hero_cache', config.hero_img);
    }
    
    if (heroTag) {
      if (config.hero_tag && config.hero_tag.trim() !== '') {
        heroTag.textContent = config.hero_tag;
        heroTag.style.display = 'inline-block';
      } else {
        heroTag.style.display = 'none';
      }
    }

    if (heroTitle) {
      if (config.hero_title && config.hero_title.trim() !== '') {
        heroTitle.textContent = config.hero_title;
        heroTitle.style.display = 'block';
      } else {
        heroTitle.style.display = 'none';
      }
    }

    if (heroDesc) {
      if (config.hero_desc && config.hero_desc.trim() !== '') {
        heroDesc.textContent = config.hero_desc;
        heroDesc.style.display = 'block';
      } else {
        heroDesc.style.display = 'none';
      }
    }

    if (heroButton) {
      if (config.hero_btn_visible === 'false' || !config.hero_btn_text) {
        heroButton.style.display = 'none';
      } else {
        heroButton.style.display = 'inline-block'; 
        heroButton.textContent = config.hero_btn_text;
      }
    }

    const editalImg = document.getElementById('edital-img');
    const editalTitle = document.getElementById('edital-title');
    const editalDesc = document.getElementById('edital-desc');

    if (editalImg && config.edital_img) editalImg.src = config.edital_img;
    if (editalTitle && config.edital_title) editalTitle.textContent = config.edital_title;
    if (editalDesc && config.edital_desc) editalDesc.textContent = config.edital_desc;

    const imgGarimpo = document.getElementById('img-garimpo');
    const imgDrops = document.getElementById('img-drops');
    const imgPacks = document.getElementById('img-packs');

    if (imgGarimpo && config.img_garimpo) imgGarimpo.src = config.img_garimpo;
    if (imgDrops && config.img_drops) imgDrops.src = config.img_drops;
    if (imgPacks && config.img_packs) imgPacks.src = config.img_packs;

  } catch (err) {
    console.error("Erro crítico ao aplicar configurações do site:", err);
  }
}

function renderCarousel(itemsToRender = globalProducts) {
  if (!highlightsCarousel) return;

  if (itemsToRender.length === 0) {
    highlightsCarousel.innerHTML = `
      <div class="w-full py-12 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
        <p class="text-xs uppercase tracking-widest">Nenhum destaque disponível.</p>
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
      
      const btnText = isEsgotado ? 'ESGOTADO' : (product.category === 'packs' ? 'Montar Pack' : 'Ver Detalhes');
      
      let precoFormatado = '';
      if (product.category === 'packs') {
          precoFormatado = '<span class="text-[10px] font-normal uppercase tracking-widest text-on-surface-variant">Definido na seleção</span>';
      } else {
          precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || product.preco || 0);
      }

      return `
      <div class="group relative flex flex-col w-[70vw] md:w-[280px] flex-none snap-start ${isEsgotado ? 'cursor-not-allowed opacity-70 grayscale' : 'cursor-pointer'}" 
           data-item-id="${product.id}" 
           data-category="${product.category}">
        <div class="w-full aspect-[3/4] bg-surface-container-low mb-4 overflow-hidden relative border border-transparent ${!isEsgotado ? 'group-hover:border-outline/10' : ''} transition-colors">
            <img loading="lazy" class="w-full h-full object-cover object-center ${!isEsgotado ? 'group-hover:scale-105' : ''} transition-transform duration-700 ease-out" src="${imagemItem}" alt="${tituloItem} — peça second-hand para pack de brechó | A GARIMPEIRAbr"/>
            
            <div class="absolute top-2 left-2 flex gap-1">
                ${product.badge ? `<span class="bg-surface/90 backdrop-blur-sm border border-on-background text-[10px] uppercase tracking-widest px-2 py-1 text-on-background">${product.badge}</span>` : ''}
            </div>
            
            <div class="absolute inset-0 ${isEsgotado ? 'bg-background/40' : 'bg-background/0 group-hover:bg-background/20'} transition-colors duration-300 flex items-center justify-center">
                <span class="${isEsgotado ? 'opacity-100 bg-red-900 text-white' : 'opacity-0 group-hover:opacity-100 bg-on-background text-background'} transition-opacity duration-300 text-xs uppercase tracking-widest font-bold px-6 py-3">${btnText}</span>
            </div>
        </div>
        <div class="flex justify-between items-baseline gap-2">
            <h3 class="text-sm font-bold text-on-background truncate">${tituloItem}</h3>
            <span class="text-sm font-bold text-on-background whitespace-nowrap">${precoFormatado}</span>
        </div>
        <div class="flex justify-between items-start mt-1 gap-2">
            <p class="text-xs text-on-surface-variant/70">${descFormatada}</p>
            <span class="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">${product.pack || product.drop || ''}</span>
        </div>
      </div>
    `;
    })
    .join("");

  highlightsCarousel.querySelectorAll("div[data-item-id]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const itemId = el.getAttribute("data-item-id");
      const clickedItem = itemsToRender.find(p => p.id === itemId);

      if (clickedItem && clickedItem.soldOut) {
          alert("Estoque livre insuficiente no momento para a quantidade de peças exigida neste pack.");
          return;
      }

      const isPack = el.getAttribute("data-category") === 'packs';
      
      if (isPack) {
        window.location.href = `/packs`;
      } else {
        window.location.href = `/peca?id=${itemId}`;
      }
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
        <p class="text-xs uppercase tracking-widest">Nenhuma peça encontrada.</p>
      </div>
    `;
    return;
  }

  searchGrid.innerHTML = itemsToRender.map((product) => {
    const isEsgotado = product.soldOut;
    const tituloItem = product.title || product.nome || 'Sem título';
    const imagemItem = product.image || (product.url_foto ? product.url_foto.split(',')[0].trim() : '');
    const subtituloRaw = product.subtitle || product.descricao || '';
    const descFormatada = subtituloRaw.replace(/tecido:/i, '<br>tecido:');
    
    const btnText = isEsgotado ? 'ESGOTADO' : (product.category === 'packs' ? 'Montar Pack' : 'Ver Detalhes');
    
    let precoFormatado = '';
    if (product.category === 'packs') {
        precoFormatado = '<span class="text-[10px] font-normal uppercase tracking-widest text-on-surface-variant">Definido na seleção</span>';
    } else {
        precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || product.preco || 0);
    }

    return `
    <div class="group relative flex flex-col w-full ${isEsgotado ? 'cursor-not-allowed opacity-70 grayscale' : 'cursor-pointer'}" 
         data-item-id="${product.id}" 
         data-category="${product.category}">
      <div class="w-full aspect-[3/4] bg-surface-container-low mb-4 overflow-hidden relative border border-transparent ${!isEsgotado ? 'group-hover:border-outline/10' : ''} transition-colors">
          <img loading="lazy" class="w-full h-full object-cover object-center ${!isEsgotado ? 'group-hover:scale-105' : ''} transition-transform duration-700 ease-out" src="${imagemItem}" alt="${tituloItem} — peça second-hand para pack de brechó | A GARIMPEIRAbr"/>
          <div class="absolute inset-0 ${isEsgotado ? 'bg-background/40' : 'bg-background/0 group-hover:bg-background/20'} transition-colors duration-300 flex items-center justify-center">
              <span class="${isEsgotado ? 'opacity-100 bg-red-900 text-white' : 'opacity-0 group-hover:opacity-100 bg-on-background text-background'} transition-opacity duration-300 text-xs uppercase tracking-widest font-bold px-6 py-3">${btnText}</span>
          </div>
      </div>
      <div class="flex justify-between items-baseline gap-2">
          <h3 class="text-sm font-bold text-on-background truncate">${tituloItem}</h3>
          <span class="text-sm font-bold text-on-background whitespace-nowrap">${precoFormatado}</span>
      </div>
      <div class="flex justify-between items-start mt-1 gap-2">
          <p class="text-xs text-on-surface-variant/70">${descFormatada}</p>
          <span class="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">${product.pack || product.drop || ''}</span>
      </div>
    </div>
  `;
  }).join("");

  searchGrid.querySelectorAll("div[data-item-id]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const itemId = el.getAttribute("data-item-id");
      const clickedItem = itemsToRender.find(p => p.id === itemId);

      if (clickedItem && clickedItem.soldOut) {
          alert("Estoque livre insuficiente no momento para a quantidade de peças exigida neste pack.");
          return;
      }

      const isPack = el.getAttribute("data-category") === 'packs';
      
      if (isPack) {
        window.location.href = `/packs`;
      } else {
        window.location.href = `/peca?id=${itemId}`;
      }
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

        const filtered = globalProducts.filter( 
          (p) => {
            const searchTitle = p.title || p.nome || '';
            const searchSubtitle = p.subtitle || p.descricao || '';
            return searchTitle.toLowerCase().includes(term) ||
                   searchSubtitle.toLowerCase().includes(term) ||
                   (p.pack && p.pack.toLowerCase().includes(term))
          }
        );
        
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
  
  slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.style.cursor = 'default';
  });
  
  slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.style.cursor = 'default';
  });
  
  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2; 
    slider.scrollLeft = scrollLeft - walk;
  });
}

function setupNewsletter() {
  const anchor = document.getElementById("newsletter-anchor");
  if (!anchor) return;

  const btn = anchor.querySelector("button");

  if(btn) {
      btn.addEventListener("click", async (e) => {
          e.preventDefault();
          
          const currentInputs = anchor.querySelectorAll("input");
          const nome = currentInputs[0]?.value.trim() || '';
          const email = currentInputs[1]?.value.trim() || '';
          const telefone = currentInputs[2]?.value.trim() || '';

          if (!nome || !email || !telefone) {
              alert("Por favor, preencha todos os campos, incluindo o WhatsApp.");
              return;
          }

          const originalText = btn.textContent;
          btn.disabled = true;
          btn.textContent = "ENVIANDO...";

          try {
              const { error } = await supabase.from('newsletter').insert([{ nome, email, telefone }]);
              
              if (error) throw error; 

              anchor.innerHTML = `
                  <div class="flex flex-col gap-4 mt-2">
                      <h4 class="text-sm font-bold uppercase tracking-widest text-primary">Inscrição Confirmada!</h4>
                      <p class="text-xs text-on-surface-variant">Confira sua caixa de entrada para receber o seu cupom de 10% OFF.</p>
                  </div>
              `;
          } catch (err) {
              if (err.code === '23505' || err.message.includes('unique constraint')) {
                  alert("Você já está na nossa lista VIP! 👀 Fique de olho na sua caixa de entrada para as próximas novidades.");
              } else {
                  alert("Ops! Ocorreu um erro ao tentar processar seu cadastro. Tente novamente mais tarde.");
                  console.error("Erro Supabase:", err);
              }
              
              btn.disabled = false;
              btn.textContent = originalText;
          }
      });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (highlightsCarousel) {
    highlightsCarousel.innerHTML = `
      <div class="w-full py-24 flex flex-col items-center justify-center text-on-surface-variant w-full">
        <p class="text-xs uppercase tracking-widest animate-pulse">Carregando destaques...</p>
      </div>
    `;
  }

  const products = await fetchProducts();
  const packs = await fetchPacks();
  
  const availableStockCount = products.filter(p => p.category !== 'packs' && p.soldOut === false).length;

  const adjustedPacks = packs.map(pack => {
      const packQty = parseInt(pack.quantidade_pecas) || parseInt(pack.badge) || 0;
      const isSoldOut = packQty > availableStockCount;
      return { 
          ...pack, 
          category: 'packs', // Injeta a categoria para o sistema reconhecer como pack
          soldOut: isSoldOut, 
          badge: isSoldOut ? 'Esgotado' : (pack.badge || `${packQty} Peças`), 
          subtitle: isSoldOut ? 'Estoque insuficiente para este lote' : (pack.descricao || pack.subtitle) 
      };
  });

  globalProducts = [...products, ...adjustedPacks];

  await applySiteConfig();
  
  const destaques = globalProducts.filter(p => p.isDestaque === true || p.is_destaque === true);
  
  renderCarousel(destaques);
  updateBadge();
  setupGlobalListeners();
  setupCarouselDrag();
  setupNewsletter();

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