// src/js/checkout.js
import { cartService } from "./cart.js";
import { currentUser, customerData } from "./auth.js";

let currentPaymentMethod = "mercadopago";
let selectedFreight = 0;
let selectedFreightName = "";
let appliedCoupon = null;
let discountAmount = 0;

export function openCheckout() {
  const drawer = document.getElementById("checkout-drawer");
  if (drawer) {
    drawer.classList.remove("translate-x-full", "hidden");
    drawer.classList.add("translate-x-0");
    renderCheckout();
  }
}

export function closeCheckout() {
  const drawer = document.getElementById("checkout-drawer");
  if (drawer) {
    drawer.classList.remove("translate-x-0");
    drawer.classList.add("translate-x-full");
  }
}

export function openAuthDrawer() {
  const authDrawer = document.getElementById("auth-drawer");
  if (authDrawer) {
    authDrawer.classList.remove("translate-x-full", "hidden");
    authDrawer.classList.add("translate-x-0");
    closeCheckout(); 
  }
}

export function closeAuthDrawer() {
  const authDrawer = document.getElementById("auth-drawer");
  if (authDrawer) {
    authDrawer.classList.remove("translate-x-0");
    authDrawer.classList.add("translate-x-full");
  }
}

export function renderCheckout() {
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartTotalElement = document.getElementById("cart-total");
  const btnSubmit = document.getElementById("btn-submit-order");

  if (!cartItemsContainer) return;

  // Ajusta o contêiner para ter scroll e padding
  cartItemsContainer.classList.add("overflow-y-auto", "max-h-[calc(100vh-280px)]", "pr-2", "pb-4", "scrollbar-hide");

  const items = cartService.getItems();
  
  if (items.length === 0) {
    cartItemsContainer.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-center opacity-50"><span class="material-symbols-outlined text-5xl mb-2 text-on-surface-variant">production_quantity_limits</span><p class="font-body-md text-sm text-on-surface-variant">Sua sacola está vazia.</p></div>';
    if (cartTotalElement) cartTotalElement.textContent = "R$ 0,00";
    if (btnSubmit) btnSubmit.disabled = true;
    selectedFreight = 0;
    selectedFreightName = "";
    appliedCoupon = null;
    discountAmount = 0;
    return;
  }

  // Renderiza os itens no novo formato de Card App
  const itemsHTML = items.map(item => `
    <div class="flex items-center gap-4 bg-surface-container rounded-3xl p-4 mb-4 border border-outline-variant shadow-sm">
      <img src="${item.image}" alt="${item.title}" class="w-20 h-24 object-cover rounded-2xl border border-outline-variant bg-surface">
      <div class="flex-1 overflow-hidden">
        <h4 class="font-label-lg font-bold text-sm text-on-background truncate w-full">${item.title}</h4>
        <p class="font-body-md text-sm text-primary font-bold mt-1">R$ ${item.price.toFixed(2).replace('.', ',')}</p>
        <p class="font-label-sm text-[10px] text-on-surface-variant uppercase mt-1 tracking-widest truncate">Loja: ${item.seller_id ? item.seller_id.split('-')[0] : 'Plataforma'}</p>
      </div>
      <button onclick="cartService.removeItem('${item.id}')" class="text-on-surface-variant hover:text-error bg-surface rounded-full p-2 border border-outline-variant shadow-sm transition-colors shrink-0 flex items-center justify-center">
        <span class="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
  `).join("");

  cartItemsContainer.innerHTML = itemsHTML;

  let freightArea = document.createElement("div");
  freightArea.id = "freight-area";
  freightArea.className = "mt-4 pb-4";
  cartItemsContainer.appendChild(freightArea);

  renderFreightUI(freightArea);
  updateCartTotal();
}

function updateCartTotal() {
  const cartTotalElement = document.getElementById("cart-total");
  const btnSubmit = document.getElementById("btn-submit-order");
  const discountInfoElement = document.getElementById("discount-info-area");
  
  const subtotal = cartService.getTotalPrice();
  
  if (appliedCoupon) {
      discountAmount = subtotal * 0.10;
  } else {
      discountAmount = 0;
  }

  const finalTotal = subtotal - discountAmount + selectedFreight;
  
  if (cartTotalElement) {
      cartTotalElement.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
  }

  if (discountInfoElement) {
      if (appliedCoupon) {
          discountInfoElement.innerHTML = `<p class="text-primary font-label-sm text-[10px] font-bold tracking-widest uppercase mt-2 border border-primary bg-primary-container px-3 py-2 rounded-xl text-center">Cupom aplicado: - R$ ${discountAmount.toFixed(2).replace('.', ',')}</p>`;
      } else {
          discountInfoElement.innerHTML = '';
      }
  }
  
  if (btnSubmit) {
      const addrNumberInput = document.getElementById("addr-number");
      const hasNumber = addrNumberInput ? addrNumberInput.value.trim().length > 0 : false;
      
      btnSubmit.disabled = (selectedFreight === 0 || cartService.getItems().length === 0 || !hasNumber);
      if(btnSubmit.disabled) {
          btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
          btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
      }
  }
}

function renderFreightUI(container) {
  container.innerHTML = `
      <div class="pt-6 border-t border-outline-variant">
         <label class="font-label-lg text-xs font-bold uppercase tracking-widest text-on-background mb-3 block">Calcular Frete & Endereço</label>
         <div class="flex gap-2">
             <input type="text" id="cep-input" placeholder="00000-000" maxlength="9" class="bg-surface border border-outline-variant rounded-full px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md text-center tracking-widest transition-colors">
             <button id="btn-calc-freight" class="bg-primary text-on-primary px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-colors shadow-md">OK</button>
         </div>
         
         <div id="freight-options" class="mt-4 flex flex-col gap-3"></div>

         <div id="address-form-area" class="hidden mt-4 pt-4 border-t border-outline-variant flex-col gap-3">
             <input type="text" id="addr-street" placeholder="Rua / Avenida" disabled class="bg-surface border border-outline-variant rounded-xl px-4 py-3 outline-none w-full text-sm font-body-md text-on-surface-variant opacity-70">
             <div class="flex gap-2">
                 <input type="text" id="addr-number" placeholder="Número *" class="bg-surface border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-1/3 text-sm font-body-md transition-colors">
                 <input type="text" id="addr-comp" placeholder="Complemento" class="bg-surface border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-2/3 text-sm font-body-md transition-colors">
             </div>
             <input type="text" id="addr-district" placeholder="Bairro" disabled class="bg-surface border border-outline-variant rounded-xl px-4 py-3 outline-none w-full text-sm font-body-md text-on-surface-variant opacity-70">
             <div class="flex gap-2">
                 <input type="text" id="addr-city" placeholder="Cidade" disabled class="bg-surface border border-outline-variant rounded-xl px-4 py-3 outline-none w-2/3 text-sm font-body-md text-on-surface-variant opacity-70">
                 <input type="text" id="addr-state" placeholder="UF" disabled class="bg-surface border border-outline-variant rounded-xl px-4 py-3 outline-none w-1/3 text-sm font-body-md text-on-surface-variant opacity-70">
             </div>
         </div>

         <div class="mt-8 pt-6 border-t border-outline-variant">
             <label class="font-label-lg text-xs font-bold uppercase tracking-widest text-on-background mb-3 block">Cupom de Desconto</label>
             <div class="flex gap-2">
                 <input type="text" id="coupon-input" placeholder="CÓDIGO" class="bg-surface border border-outline-variant rounded-full px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md uppercase text-center transition-colors">
                 <button id="btn-apply-coupon" class="bg-surface border border-outline-variant text-on-background px-4 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors shadow-sm">Aplicar</button>
             </div>
             <div id="discount-info-area" class="mt-2"></div>
         </div>
      </div>
  `;

  const cepInput = document.getElementById("cep-input");
  const btnCalc = document.getElementById("btn-calc-freight");
  const addressArea = document.getElementById("address-form-area");
  const addrNumber = document.getElementById("addr-number");
  
  const couponInput = document.getElementById("coupon-input");
  const btnApplyCoupon = document.getElementById("btn-apply-coupon");

  cepInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2');
  });

  addrNumber.addEventListener('input', updateCartTotal);

  btnApplyCoupon.addEventListener('click', async () => {
      const code = couponInput.value.trim().toUpperCase();
      if (!code) return;

      if (!currentUser) {
          alert("Faça login ou crie sua conta primeiro para usar o seu cupom VIP.");
          openAuthDrawer();
          return;
      }

      btnApplyCoupon.disabled = true;
      btnApplyCoupon.textContent = "...";

      try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/checar_cupom_valido`, {
              method: 'POST',
              headers: {
                  "Content-Type": "application/json",
                  "apikey": supabaseAnonKey,
                  "Authorization": `Bearer ${supabaseAnonKey}`
              },
              body: JSON.stringify({ 
                  codigo_cupom: code, 
                  email_cliente: currentUser.email 
              })
          });
          
          const isValid = await response.json();

          if (isValid === true) {
              appliedCoupon = code;
              couponInput.disabled = true;
              btnApplyCoupon.textContent = "✓";
              btnApplyCoupon.classList.replace("bg-surface", "bg-primary");
              btnApplyCoupon.classList.replace("text-on-background", "text-on-primary");
              updateCartTotal();
          } else {
              alert("Cupom inválido, expirado ou não pertence à sua conta.");
              btnApplyCoupon.disabled = false;
              btnApplyCoupon.textContent = "APLICAR";
          }
      } catch (error) {
          alert("Erro ao validar o cupom. Tente novamente.");
          btnApplyCoupon.disabled = false;
          btnApplyCoupon.textContent = "APLICAR";
      }
  });

  btnCalc.addEventListener("click", async () => {
      const cep = cepInput.value.replace(/\D/g, '');
      if (cep.length !== 8) {
          alert("Por favor, digite um CEP válido com 8 dígitos.");
          return;
      }

      const optionsContainer = document.getElementById("freight-options");
      optionsContainer.innerHTML = '<p class="font-body-md text-xs text-on-surface-variant text-center animate-pulse">Calculando rotas e pacotes...</p>';
      btnCalc.disabled = true;
      addressArea.classList.replace("flex", "hidden");

      try {
          const viaCepRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const viaCepData = await viaCepRes.json();

          if (viaCepData.erro) {
              throw new Error("CEP não encontrado.");
          }

          document.getElementById('addr-street').value = viaCepData.logradouro || "";
          document.getElementById('addr-district').value = viaCepData.bairro || "";
          document.getElementById('addr-city').value = viaCepData.localidade || "";
          document.getElementById('addr-state').value = viaCepData.uf || "";
          
          addressArea.classList.replace("hidden", "flex");

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          
          const response = await fetch(`${supabaseUrl}/functions/v1/calcular-frete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  cep_destino: cep,
                  items: cartService.getItems()
              })
          });

          if (!response.ok) throw new Error("Erro na comunicação com a transportadora.");
          
          const fretes = await response.json();
          
          if (!fretes || fretes.length === 0) {
               optionsContainer.innerHTML = '<p class="font-body-md text-xs text-error uppercase tracking-widest text-center">Nenhuma opção de frete disponível para este CEP.</p>';
               return;
          }

          optionsContainer.innerHTML = fretes.map((frete, index) => `
              <label class="flex items-center justify-between p-4 bg-surface rounded-2xl border border-outline-variant cursor-pointer hover:border-primary transition-colors shadow-sm">
                  <div class="flex items-center gap-3">
                      <input type="radio" name="freight_option" value="${frete.preco}" data-name="${frete.empresa} - ${frete.nome}" class="accent-primary w-4 h-4" ${index === 0 ? 'checked' : ''}>
                      <div class="flex flex-col">
                          <span class="font-label-lg text-xs font-bold uppercase tracking-widest text-on-background">${frete.empresa}</span>
                          <span class="font-label-sm text-[10px] text-on-surface-variant uppercase mt-1">Prazo: ${frete.prazo} dias</span>
                      </div>
                  </div>
                  <span class="font-body-md text-sm font-bold text-on-background">R$ ${frete.preco.toFixed(2).replace('.', ',')}</span>
              </label>
          `).join("");

          const radios = optionsContainer.querySelectorAll('input[type="radio"]');
          const updateSelected = () => {
              const checked = Array.from(radios).find(r => r.checked);
              if (checked) {
                  selectedFreight = parseFloat(checked.value);
                  selectedFreightName = checked.getAttribute('data-name');
                  updateCartTotal();
              }
          };
          
          radios.forEach(radio => radio.addEventListener('change', updateSelected));
          updateSelected();

      } catch (error) {
          optionsContainer.innerHTML = `<p class="font-body-md text-xs text-error text-center">${error.message}</p>`;
      } finally {
          btnCalc.disabled = false;
      }
  });
}

export function initCheckoutListeners() {
  const urlParams = new URLSearchParams(window.location.search);
  const isApproved = urlParams.get('status') === 'approved' || urlParams.get('collection_status') === 'approved';
  
  if (isApproved) {
      const paymentId = urlParams.get('payment_id') || urlParams.get('collection_id') || '';
      showSuccessModal(paymentId);
      window.history.replaceState({}, document.title, window.location.pathname);
  }

  const btnCloseDrawer = document.getElementById("close-checkout-drawer");
  const btnCloseAuthDrawer = document.getElementById("close-auth-drawer");
  const btnCartToggle = document.getElementById("cart-toggle-btn");
  
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const authDrawerTitle = document.getElementById("auth-drawer-title");
  
  const btnSubmit = document.getElementById("btn-submit-order");
  const paymentArea = document.getElementById("payment-area");

  if (btnCloseDrawer) btnCloseDrawer.addEventListener("click", closeCheckout);
  if (btnCloseAuthDrawer) btnCloseAuthDrawer.addEventListener("click", closeAuthDrawer);
  
  if (btnCartToggle) {
    btnCartToggle.addEventListener("click", (e) => {
      e.preventDefault();
      openCheckout();
    });
  }

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener("click", () => {
      formLogin.classList.remove("hidden");
      formRegister.classList.add("hidden");
      tabLogin.classList.replace("border-transparent", "border-primary");
      tabLogin.classList.replace("text-on-surface-variant", "text-primary");
      tabRegister.classList.replace("border-primary", "border-transparent");
      tabRegister.classList.replace("text-primary", "text-on-surface-variant");
      authDrawerTitle.textContent = "Entrar";
    });

    tabRegister.addEventListener("click", () => {
      formRegister.classList.remove("hidden");
      formLogin.classList.add("hidden");
      tabRegister.classList.replace("border-transparent", "border-primary");
      tabRegister.classList.replace("text-on-surface-variant", "text-primary");
      tabLogin.classList.replace("border-primary", "border-transparent");
      tabLogin.classList.replace("text-primary", "text-on-surface-variant");
      authDrawerTitle.textContent = "Criar Lojinha";
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!currentUser) {
          openAuthDrawer();
          return; 
      }

      const userMeta = currentUser.user_metadata || {};
      const cepDestino = document.getElementById("cep-input")?.value.replace(/\D/g, '') || "00000000";
      
      const rua = document.getElementById("addr-street")?.value || "";
      const bairro = document.getElementById("addr-district")?.value || "";
      const cidade = document.getElementById("addr-city")?.value || "";
      const uf = document.getElementById("addr-state")?.value || "";
      const enderecoCompleto = `${rua}, ${bairro} - ${cidade}/${uf}`;

      const num = document.getElementById("addr-number")?.value || "S/N";
      const comp = document.getElementById("addr-comp")?.value || "";

      const rawItems = cartService.getItems();
      const mappedItems = rawItems.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: 1,
        seller_id: item.seller_id,
        image: item.image
      }));

      const payload = {
        customer: {
          id: currentUser.id,
          name: customerData?.nome || userMeta.nome || "Cliente", 
          cpf: customerData?.cpf || userMeta.cpf || "",
          phone: customerData?.telefone || userMeta.telefone || "",
          email: currentUser.email
        },
        address: {
          cep: cepDestino, 
          rua: enderecoCompleto, 
          num: num,
          comp: comp,
        },
        items: mappedItems,
        freight: {
          name: selectedFreightName,
          price: selectedFreight
        },
        coupon: appliedCoupon, 
        discount: discountAmount,
        paymentMethod: currentPaymentMethod,
        total: cartService.getTotalPrice() - discountAmount + selectedFreight,
      };

      const originalText = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = "PROCESSANDO...";

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/mp-checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Erro no processamento. Tente novamente.");
        }

        cartService.state.items = [];
        cartService._saveAndNotify();

        if (paymentArea) {
          paymentArea.innerHTML = `
            <div class="text-center flex flex-col items-center justify-center h-full gap-4 py-8">
              <span class="material-symbols-outlined text-5xl text-primary animate-spin">autorenew</span>
              <h4 class="font-headline-xl text-2xl text-on-background">Redirecionando...</h4>
              <p class="font-body-md text-sm text-on-surface-variant">Abrindo ambiente seguro de pagamento.</p>
            </div>
          `;
        }

        window.location.href = result.initPoint;

      } catch (error) {
        alert(`Erro: ${error.message}`);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
      }
    });
  }
}

export function showSuccessModal(orderId = '') {
    const existing = document.getElementById('success-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'success-modal';
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-on-background/50 backdrop-blur-md opacity-0 transition-opacity duration-300 p-4';
    
    modal.innerHTML = `
        <div class="bg-surface p-8 md:p-12 max-w-md w-full rounded-3xl border border-outline-variant shadow-2xl relative transform scale-95 transition-transform duration-300 flex flex-col items-center text-center">
            <div class="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-4xl text-primary">check_circle</span>
            </div>
            
            <h2 class="font-headline-xl text-4xl text-on-background mb-2">Sucesso!</h2>
            <p class="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant mb-6 font-bold bg-surface-container px-3 py-1 rounded-md">
                Pedido ${orderId ? '#' + orderId : 'Confirmado'}
            </p>
            
            <p class="font-body-md text-sm text-on-surface-variant mb-8 leading-relaxed">
                As suas peças foram garantidas! O pagamento foi processado e as lojinhas já foram notificadas para embalarem seus itens.
            </p>
            
            <button id="btn-close-success" class="bg-primary text-on-primary font-label-lg text-sm font-bold uppercase tracking-widest py-4 px-8 rounded-full w-full hover:opacity-90 transition-colors shadow-md">
                Continuar Comprando
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    });

    document.getElementById('btn-close-success').addEventListener('click', () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        document.body.style.overflow = ''; 
        
        setTimeout(() => {
            modal.remove();
            window.location.href = '/comprar'; 
        }, 300);
    });
}

window.cartService = cartService;