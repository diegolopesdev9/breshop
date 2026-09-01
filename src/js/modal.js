import { cartService } from "./cart.js";
import { openCheckout } from "./checkout.js";

const modalOverlay = document.createElement("div");
modalOverlay.className = "fixed inset-0 bg-background/95 backdrop-blur-md z-[250] hidden opacity-0 transition-opacity duration-300 flex items-center justify-center sm:p-4";
document.body.appendChild(modalOverlay);

export function openProductModal(product) {
  const isInCart = cartService.isItemInCart(product.id);
  const isSoldOut = product.soldOut;

  let btnHtml = "";
  if (isSoldOut) {
    btnHtml = `<button disabled class="w-full bg-error text-on-error font-label-lg text-label-lg uppercase tracking-[0.2em] py-4 cursor-not-allowed border hairline-border">SOLD OUT</button>`;
  } else if (isInCart) {
    btnHtml = `<button disabled class="w-full bg-surface-variant text-on-surface-variant font-label-lg text-label-lg uppercase tracking-[0.2em] py-4 cursor-default border hairline-border">IN BAG</button>`;
  } else {
    btnHtml = `<button id="modal-add-btn" class="w-full bg-on-background text-on-primary font-label-lg text-label-lg uppercase tracking-[0.2em] py-4 hover:bg-primary-container hover:text-on-primary-container hover:border-transparent transition-all duration-300 border hairline-border flex justify-center items-center gap-2">Add to Bag <span class="material-symbols-outlined text-[18px]">east</span></button>`;
  }

  modalOverlay.innerHTML = `
    <div class="bg-background w-full h-full md:h-[90vh] md:max-w-[1200px] border border-outline/20 overflow-y-auto flex flex-col relative transform scale-95 transition-transform duration-300 shadow-2xl" id="modal-content">
        <button id="close-modal" class="absolute top-4 right-4 md:top-6 md:right-6 z-20 text-on-background hover:text-primary transition-colors material-symbols-outlined text-3xl bg-surface/50 rounded-full p-1 backdrop-blur-md">close</button>
        
        <div class="grid grid-cols-1 md:grid-cols-12 gap-gutter min-h-full">
            <div class="md:col-span-7 relative bg-surface-container">
                <img src="${product.image}" alt="${product.title}" class="w-full h-[50vh] md:h-full object-cover md:absolute md:inset-0" />
                <div class="absolute top-4 left-4 flex gap-2">
                    <span class="px-3 py-1 border border-on-background text-on-background font-label-sm text-label-sm uppercase bg-surface/50 backdrop-blur-sm">Archive</span>
                    ${product.badge ? `<span class="px-3 py-1 border border-on-background text-on-background font-label-sm text-label-sm uppercase bg-surface/50 backdrop-blur-sm">${product.badge}</span>` : ''}
                </div>
            </div>
            
            <div class="md:col-span-5 flex flex-col justify-center py-stack-lg px-6 md:px-0 md:pr-12 md:pl-8">
                <nav class="mb-stack-md hidden md:block">
                    <ol class="flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                        <li><span class="hover:text-primary transition-colors cursor-pointer" onclick="document.getElementById('close-modal').click()">Shop</span></li>
                        <li><span class="mx-1">/</span></li>
                        <li><span class="text-on-background">${product.category}</span></li>
                    </ol>
                </nav>

                <div class="mb-stack-lg border-b border-outline/20 pb-stack-sm">
                    <h1 class="font-headline-xl text-headline-xl mb-2 leading-tight">${product.title}</h1>
                    <p class="font-headline-lg text-headline-lg text-primary ${isSoldOut ? 'line-through opacity-50' : ''}">R$ ${product.price}</p>
                </div>
                
                <div class="mb-stack-lg">
                    <p class="font-label-sm text-label-sm uppercase tracking-widest mb-3">Measurements / Specs</p>
                    <div class="flex flex-wrap gap-3">
                        <div class="px-4 py-2 border border-on-background text-center min-w-[80px]">
                            <span class="font-label-sm text-label-sm block uppercase text-on-surface-variant">Condition</span>
                            <span class="font-body-md text-body-md block mt-1">${product.subtitle.split('•')[0] || 'Vintage'}</span>
                        </div>
                    </div>
                </div>

                <div class="mb-stack-lg w-full">
                    ${btnHtml}
                </div>
                
                <div class="prose max-w-none">
                    <h3 class="font-headline-lg text-xl mb-4 italic">The Story</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                        ${product.description || "A rare find, curated for its timeless silhouette and impeccable quality. This piece represents the minimal aesthetics of the late 90s."}
                    </p>
                </div>
            </div>
        </div>
    </div>
  `;

  modalOverlay.classList.remove("hidden");
  setTimeout(() => {
    modalOverlay.classList.add("opacity-100");
    modalOverlay.querySelector("#modal-content").classList.replace("scale-95", "scale-100");
  }, 10);

  modalOverlay.querySelector("#close-modal").addEventListener("click", closeModal);

  const addBtn = modalOverlay.querySelector("#modal-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const result = cartService.addItem(product);
      if (result.success) {
        closeModal();
        openCheckout();
      }
    });
  }
}

export function closeModal() {
  modalOverlay.classList.remove("opacity-100");
  const content = modalOverlay.querySelector("#modal-content");
  if (content) content.classList.replace("scale-100", "scale-95");
  setTimeout(() => modalOverlay.classList.add("hidden"), 300);
}

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});