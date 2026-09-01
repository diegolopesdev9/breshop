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

  cartItemsContainer.classList.add("overflow-y-auto", "max-h-[calc(100vh-280px)]", "pr-2", "pb-4");

  const items = cartService.getItems();
  
  if (items.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-on-surface-variant text-sm font-label-lg uppercase tracking-widest">Sua sacola está vazia.</p>';
    if (cartTotalElement) cartTotalElement.textContent = "R$ 0,00";
    if (btnSubmit) btnSubmit.disabled = true;
    selectedFreight = 0;
    selectedFreightName = "";
    appliedCoupon = null;
    discountAmount = 0;
    return;
  }

  const itemsHTML = items.map(item => `
    <div class="flex items-center gap-4 border-b hairline-border pb-4 mb-4">
      <img src="${item.image}" alt="${item.title}" class="w-20 h-24 object-cover border hairline-border bg-surface-container">
      <div class="flex-1">
        <h4 class="font-label-lg text-label-lg text-on-background uppercase tracking-widest leading-tight">${item.title}</h4>
        <p class="font-body-md text-body-md text-on-surface-variant mt-1">R$ ${item.price.toFixed(2).replace('.', ',')}</p>
      </div>
      <button onclick="cartService.removeItem('${item.id}')" class="text-on-surface-variant hover:text-error material-symbols-outlined transition-colors">delete</button>
    </div>
  `).join("");

  cartItemsContainer.innerHTML = itemsHTML;

  let freightArea = document.createElement("div");
  freightArea.id = "freight-area";
  freightArea.className = "mt-2 pb-4";
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
          discountInfoElement.innerHTML = `<p class="text-primary text-xs font-bold tracking-widest uppercase mt-2 border border-primary/20 bg-primary/5 px-3 py-2">Cupom aplicado: - R$ ${discountAmount.toFixed(2).replace('.', ',')}</p>`;
      } else {
          discountInfoElement.innerHTML = '';
      }
  }
  
  if (btnSubmit) {
      const addrNumberInput = document.getElementById("addr-number");
      const hasNumber = addrNumberInput ? addrNumberInput.value.trim().length > 0 : false;
      
      btnSubmit.disabled = (selectedFreight === 0 || cartService.getItems().length === 0 || !hasNumber);
  }
}

function renderFreightUI(container) {
  container.innerHTML = `
      <div class="pt-4 border-t hairline-border">
         <label class="text-[10px] font-bold uppercase tracking-widest text-on-background mb-3 block">Calcular Frete & Endereço</label>
         <div class="flex gap-2">
             <input type="text" id="cep-input" placeholder="00000-000" maxlength="9" class="bg-transparent border-b hairline-border px-0 py-2 outline-none w-full text-sm text-on-background">
             <button id="btn-calc-freight" class="bg-on-background text-background px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors">OK</button>
         </div>
         
         <div id="freight-options" class="mt-4 flex flex-col gap-2"></div>

         <div id="address-form-area" class="hidden mt-4 pt-4 border-t hairline-border flex-col gap-3">
             <input type="text" id="addr-street" placeholder="Rua / Avenida" disabled class="bg-transparent border-b hairline-border px-0 py-2 outline-none w-full text-sm text-on-background opacity-70">
             <div class="flex gap-2">
                 <input type="text" id="addr-number" placeholder="Número *" class="bg-transparent border-b hairline-border px-0 py-2 outline-none w-1/3 text-sm text-on-background transition-colors focus:border-primary">
                 <input type="text" id="addr-comp" placeholder="Complemento" class="bg-transparent border-b hairline-border px-0 py-2 outline-none w-2/3 text-sm text-on-background">
             </div>
             <input type="text" id="addr-district" placeholder="Bairro" disabled class="bg-transparent border-b hairline-border px-0 py-2 outline-none w-full text-sm text-on-background opacity-70">
             <div class="flex gap-2">
                 <input type="text" id="addr-city" placeholder="Cidade" disabled class="bg-transparent border-b hairline-border px-0 py-2 outline-none w-2/3 text-sm text-on-background opacity-70">
                 <input type="text" id="addr-state" placeholder="UF" disabled class="bg-transparent border-b hairline-border px-0 py-2 outline-none w-1/3 text-sm text-on-background opacity-70">
             </div>
         </div>

         <div class="mt-8 pt-4 border-t hairline-border">
             <label class="text-[10px] font-bold uppercase tracking-widest text-on-background mb-3 block">Cupom de Desconto</label>
             <div class="flex gap-2">
                 <input type="text" id="coupon-input" placeholder="AGBR-XXXXX" class="bg-transparent border-b hairline-border px-0 py-2 outline-none w-full text-sm text-on-background uppercase">
                 <button id="btn-apply-coupon" class="bg-surface-container text-on-background px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-on-background hover:text-background transition-colors border hairline-border">Aplicar</button>
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
              btnApplyCoupon.classList.replace("bg-surface-container", "bg-primary-container");
              btnApplyCoupon.classList.replace("text-on-background", "text-on-primary-container");
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
      optionsContainer.innerHTML = '<p class="text-xs text-on-surface-variant italic animate-pulse">Consultando fretes e endereço...</p>';
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

          const subtotal = cartService.getTotalPrice();
          if (subtotal >= 1200) {
              optionsContainer.innerHTML = `
                  <label class="flex items-center justify-between p-3 border hairline-border cursor-pointer bg-surface-container-low transition-colors">
                      <div class="flex items-center gap-3">
                          <input type="radio" name="freight_option" value="0" data-name="Frete Grátis VIP" class="accent-on-background w-4 h-4" checked>
                          <div class="flex flex-col">
                              <span class="text-xs font-bold uppercase tracking-widest text-on-background">CORTESIA</span>
                              <span class="text-[10px] text-on-surface-variant uppercase">Promoção Compras Acima de R$ 1.200</span>
                          </div>
                      </div>
                      <span class="text-sm font-bold text-primary uppercase">Grátis</span>
                  </label>
              `;
              
              const checkedRadio = optionsContainer.querySelector('input[type="radio"]');
              selectedFreight = 0;
              selectedFreightName = checkedRadio.getAttribute('data-name');
              
              checkedRadio.addEventListener('change', () => {
                  selectedFreight = parseFloat(checkedRadio.value);
                  selectedFreightName = checkedRadio.getAttribute('data-name');
                  updateCartTotal();
              });
              
              updateCartTotal();
              return; 
          }

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
               optionsContainer.innerHTML = '<p class="text-xs text-error uppercase tracking-widest">Nenhuma opção de frete disponível para este CEP.</p>';
               return;
          }

          optionsContainer.innerHTML = fretes.map((frete, index) => `
              <label class="flex items-center justify-between p-3 border hairline-border cursor-pointer hover:bg-surface-container transition-colors">
                  <div class="flex items-center gap-3">
                      <input type="radio" name="freight_option" value="${frete.preco}" data-name="${frete.empresa} - ${frete.nome}" class="accent-on-background w-4 h-4" ${index === 0 ? 'checked' : ''}>
                      <div class="flex flex-col">
                          <span class="text-xs font-bold uppercase tracking-widest text-on-background">${frete.empresa}</span>
                          <span class="text-[10px] text-on-surface-variant uppercase">${frete.nome} + Embalagem (Prazo: ${frete.prazo} dias)</span>
                      </div>
                  </div>
                  <span class="text-sm font-serif text-on-background">R$ ${frete.preco.toFixed(2).replace('.', ',')}</span>
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
          optionsContainer.innerHTML = `<p class="text-xs text-error uppercase">${error.message}</p>`;
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
      authDrawerTitle.textContent = "Entrar.";
    });

    tabRegister.addEventListener("click", () => {
      formRegister.classList.remove("hidden");
      formLogin.classList.add("hidden");
      tabRegister.classList.replace("border-transparent", "border-primary");
      tabRegister.classList.replace("text-on-surface-variant", "text-primary");
      tabLogin.classList.replace("border-primary", "border-transparent");
      tabLogin.classList.replace("text-primary", "text-on-surface-variant");
      authDrawerTitle.textContent = "Criar Conta.";
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
        quantity: item.quantity || 1,
        custom_items: item.custom_items || null,
        is_custom_pack: item.is_custom_pack || false,
        image: item.image || item.url_foto || ""
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
            <div class="text-center flex flex-col items-center justify-center h-full gap-4">
              <span class="material-symbols-outlined text-4xl text-primary animate-spin">autorenew</span>
              <h4 class="font-headline-lg text-xl uppercase">Redirecionando...</h4>
              <p class="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Abrindo ambiente seguro do Mercado Pago.</p>
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
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-stone-900/80 backdrop-blur-md opacity-0 transition-opacity duration-300 p-4';
    
    modal.innerHTML = `
        <div class="bg-background p-8 md:p-12 max-w-md w-full border hairline-border shadow-2xl relative transform scale-95 transition-transform duration-300 flex flex-col items-center text-center">
            <span class="material-symbols-outlined text-6xl text-primary mb-6">check_circle</span>
            
            <h2 class="font-serif text-4xl md:text-5xl text-on-background italic mb-2">Sucesso.</h2>
            <p class="text-[10px] uppercase tracking-widest text-on-surface-variant mb-6 font-bold">
                Pedido ${orderId ? '#' + orderId : 'Confirmado'}
            </p>
            
            <p class="text-sm text-on-background/80 mb-8 leading-relaxed">
                O seu pack foi garantido! Enviamos todos os detalhes e o recibo para o seu e-mail. Agora é com a gente: vamos embalar suas peças com carinho para que cheguem prontas para a sua arara.
            </p>
            
            <button id="btn-close-success" class="bg-on-background text-background text-xs font-bold uppercase tracking-[0.2em] py-4 px-8 w-full hover:bg-primary transition-colors shadow-lg">
                Continuar Garimpando
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
            window.location.href = '/packs'; 
        }, 300);
    });
}

window.cartService = cartService;