// src/js/layout.js

export function renderLayout() {
    const consent = localStorage.getItem('garimpeira_cookie_consent');

    function loadGA4() {
        if (!document.querySelector('script[src*="G-B1YYB2TB3V"]')) {
            const gtagScript = document.createElement('script');
            gtagScript.async = true;
            gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-B1YYB2TB3V';
            document.head.appendChild(gtagScript);

            const inlineScript = document.createElement('script');
            inlineScript.innerHTML = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-B1YYB2TB3V');
            `;
            document.head.appendChild(inlineScript);
        }
    }

    if (consent === 'accepted') {
        loadGA4();
    } else if (!consent) {
        const bannerHTML = `
            <div id="cookie-banner" class="fixed bottom-0 left-0 w-full bg-surface-container-highest border-t hairline-border p-4 md:p-6 z-[999] flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl transform translate-y-0 transition-transform duration-500">
                <div class="text-xs text-on-background max-w-3xl">
                    <strong class="uppercase tracking-widest block mb-1">Aviso de Privacidade</strong>
                    Utilizamos cookies essenciais para o funcionamento da sua sacola e cookies analíticos para melhorar sua experiência. Ao continuar, você concorda com a nossa <a href="/privacidade" class="text-primary hover:underline">Política de Privacidade</a>.
                </div>
                <div class="flex gap-2 w-full md:w-auto shrink-0">
                    <button id="btn-reject-cookies" class="flex-1 md:flex-none border hairline-border px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container transition-colors">Recusar</button>
                    <button id="btn-accept-cookies" class="flex-1 md:flex-none bg-on-background text-background px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-primary-container transition-colors shadow-lg">Entendi e Aceito</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', bannerHTML);

        document.getElementById('btn-accept-cookies').addEventListener('click', () => {
            localStorage.setItem('garimpeira_cookie_consent', 'accepted');
            const banner = document.getElementById('cookie-banner');
            banner.classList.add('translate-y-full');
            setTimeout(() => banner.remove(), 500);
            loadGA4();
        });

        document.getElementById('btn-reject-cookies').addEventListener('click', () => {
            localStorage.setItem('garimpeira_cookie_consent', 'rejected');
            const banner = document.getElementById('cookie-banner');
            banner.classList.add('translate-y-full');
            setTimeout(() => banner.remove(), 500);
        });
    }

    const headerHTML = `
    <header class="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 bg-surface/80 backdrop-blur-xl border-b border-outline/10 transition-all duration-300">
        <div class="md:hidden flex items-center">
            <button id="hamburger-btn" aria-label="Abrir menu lateral" class="text-on-background flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
        </div>
        
        <a href="/" class="flex-shrink-0 cursor-pointer" aria-label="Ir para a página inicial">
            <img src="/logo.webp" alt="A Garimpeira" class="h-6 md:h-8 object-contain" />
        </a>
        
        <nav id="nav-links" class="hidden md:flex gap-12 items-center">
            <a href="/garimpos" class="text-base lowercase tracking-[0.4em] font-normal text-on-surface-variant hover:text-primary transition-all duration-300">Acervo</a>
            <a href="/packs" class="text-base lowercase tracking-[0.4em] font-normal text-on-surface-variant hover:text-primary transition-all duration-300">Packs</a>
        </nav>
        
        <div class="flex items-center gap-4">
            <div class="relative hidden lg:block mr-2">
                <input aria-label="Campo de busca" class="bg-transparent border-b hairline-border px-0 py-1 text-xs uppercase tracking-wider focus:ring-0 focus:border-primary transition-all w-40 outline-none" placeholder="Search..." type="text" />
            </div>
            
            <button id="auth-toggle-btn" aria-label="Acessar minha conta" class="text-on-background hover:text-primary transition-colors relative flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>

            <button id="cart-toggle-btn" aria-label="Abrir carrinho de compras" class="text-on-background hover:text-primary transition-colors relative flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span id="cart-count-badge" class="absolute -top-1 -right-2 bg-on-background text-background text-[10px] rounded-full w-4 h-4 flex items-center justify-center hidden font-bold">0</span>
            </button>
        </div>
    </header>
    `;

    const footerHTML = `
    <footer id="footer" class="w-full py-16 px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 items-start bg-surface-container-lowest border-t border-outline/20 mt-auto">
        <div class="col-span-1">
            <img src="/logo.webp" alt="A Garimpeira" class="h-10 object-contain mb-4" />
            <p class="text-sm text-on-surface-variant font-bold mb-1">A GARIMPEIRAbr</p>
            <p class="text-xs text-on-surface-variant mb-1">CNPJ: 66.487.157/0001-00</p>
            <p class="text-xs text-on-surface-variant mb-4">Itapetininga, SP</p>
            <p class="text-[10px] text-on-surface-variant uppercase tracking-widest">© 2026 Todos os direitos reservados.</p>
        </div>
        
        <div class="col-span-1 flex flex-col gap-4">
            <h3 class="text-xs font-bold uppercase tracking-widest text-on-background">SAC & Legal</h3>
            <div class="flex flex-col gap-3">
                <a class="text-sm text-on-surface-variant hover:text-primary transition-all" href="/trocas">Políticas de Troca</a>
                <a class="text-sm text-on-surface-variant hover:text-primary transition-all" href="/faq">Perguntas Frequentes</a>
                <a class="text-sm text-on-surface-variant hover:text-primary transition-all" href="/privacidade">Política de Privacidade</a>
                <a class="text-sm text-on-surface-variant hover:text-primary transition-all" href="/termos">Termos e Condições</a>
            </div>
        </div>

        <div class="col-span-1 flex flex-col gap-4">
            <h3 class="text-xs font-bold uppercase tracking-widest text-on-background">Links Úteis</h3>
            <div class="flex flex-col gap-3">
                <a class="text-sm text-on-surface-variant hover:text-primary transition-all" href="/sobre">Quem Somos</a>
                <a class="text-sm text-on-surface-variant hover:text-primary transition-all" href="https://www.instagram.com/a.garimpeirabr" target="_blank" rel="noopener noreferrer">Nosso Instagram</a>
                <a class="text-sm text-on-surface-variant hover:text-primary transition-all" href="/contato">Fale Conosco</a>
            </div>
        </div>

        <div id="newsletter-anchor" class="col-span-1 flex flex-col gap-4 bg-surface-container p-6 hairline-border">
            <h3 class="text-xs font-bold uppercase tracking-widest text-on-background">Não perca o próximo pack!</h3>
            <p class="text-xs text-on-surface-variant">ganhe 10% off no seu primeiro pack e seja avisada assim que um novo lote for lançado, pack bom não espera 👀.</p>
            <form class="flex flex-col gap-3 mt-2">
                <input aria-label="Seu Nome" type="text" placeholder="Seu Nome" class="bg-transparent border-b hairline-border px-0 py-2 outline-none focus:border-primary w-full text-sm text-on-background">
                <input aria-label="Seu E-mail" type="email" placeholder="Seu E-mail" class="bg-transparent border-b hairline-border px-0 py-2 outline-none focus:border-primary w-full text-sm text-on-background">
                <input aria-label="Seu WhatsApp" type="tel" placeholder="Seu WhatsApp (com DDD)" class="bg-transparent border-b hairline-border px-0 py-2 outline-none focus:border-primary w-full text-sm text-on-background">
                <button type="button" class="mt-4 w-full bg-on-background text-background px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors">Quero ser avisada</button>
            </form>
        </div>
    </footer>
    `;

    const drawersHTML = `
    <!-- Drawer: THE BAG -->
    <div id="checkout-drawer" class="fixed inset-y-0 right-0 w-full md:w-[450px] bg-background border-l hairline-border transform translate-x-full transition-transform duration-300 z-[200] flex flex-col hidden shadow-2xl">
        <div class="p-6 border-b hairline-border flex justify-between items-center bg-background">
            <h2 class="font-serif text-2xl font-bold">Sua Sacola.</h2>
            <button id="close-checkout-drawer" aria-label="Fechar carrinho" class="text-on-surface-variant hover:text-on-background flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>
        
        <div id="cart-items-container" class="flex-1 overflow-y-auto p-6 space-y-6"></div>

        <div id="payment-area" class="p-6 border-t hairline-border bg-surface-container-low flex flex-col gap-4">
            <div class="flex flex-col gap-1 mb-2">
              <div class="flex justify-between items-center text-xl font-bold">
                  <span>Total</span>
                  <span id="cart-total">R$ 0,00</span>
              </div>
              <p class="text-[10px] text-on-surface-variant uppercase tracking-widest text-right mt-1">Aceitamos Cartão de Crédito e Pix</p>
            </div>
            <button id="btn-submit-order" class="w-full mt-2 bg-on-background text-on-primary text-sm uppercase tracking-[0.2em] py-4 hover:bg-primary-container transition-all duration-300 font-bold">
                Finalizar Pedido
            </button>
        </div>
    </div>

    <!-- Drawer: AUTH -->
    <div id="auth-drawer" class="fixed inset-y-0 right-0 w-full md:w-[450px] bg-background border-l hairline-border transform translate-x-full transition-transform duration-300 z-[200] flex flex-col hidden shadow-2xl">
        <div class="p-6 border-b hairline-border flex justify-between items-center bg-background">
            <h2 class="font-serif text-2xl font-bold" id="auth-drawer-title">Entrar.</h2>
            <button id="close-auth-drawer" aria-label="Fechar área de login" class="text-on-surface-variant hover:text-on-background flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>

        <div class="flex border-b hairline-border">
            <button id="tab-login" class="flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 border-primary text-primary transition-colors">Login</button>
            <button id="tab-register" class="flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-on-surface-variant hover:text-primary transition-colors">Cadastrar</button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
            <form id="form-login" class="flex flex-col gap-4">
                <input aria-label="E-mail de acesso" type="email" id="login-email" placeholder="E-mail" required class="bg-transparent border-b hairline-border px-0 py-3 outline-none focus:border-primary w-full text-sm text-on-background">
                <input aria-label="Senha de acesso" type="password" id="login-senha" placeholder="Senha" required class="bg-transparent border-b hairline-border px-0 py-3 outline-none focus:border-primary w-full text-sm text-on-background">
                <button type="submit" class="w-full mt-4 bg-on-background text-on-primary text-sm uppercase tracking-[0.2em] py-4 hover:bg-primary-container transition-all duration-300 font-bold">Entrar</button>
                <button type="button" id="show-forgot-password" class="text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary mt-2 text-center underline transition-colors">Esqueci minha senha</button>
            </form>

            <form id="form-forgot" class="flex flex-col gap-4 hidden">
                <p class="text-xs text-on-surface-variant mb-2 text-center leading-relaxed">Enviaremos um link seguro para você redefinir sua senha.</p>
                <input aria-label="E-mail de recuperação" type="email" id="forgot-email" placeholder="Seu E-mail de cadastro" required class="bg-transparent border-b hairline-border px-0 py-3 outline-none focus:border-primary w-full text-sm text-on-background">
                <button type="submit" class="w-full mt-2 bg-on-background text-on-primary text-sm uppercase tracking-[0.2em] py-4 hover:bg-primary-container transition-all duration-300 font-bold">Enviar Link</button>
                <button type="button" id="back-to-login" class="text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary mt-2 text-center underline transition-colors">Voltar para Login</button>
            </form>

            <form id="form-register" class="flex flex-col gap-4 hidden">
                <input aria-label="Seu Nome Completo" type="text" id="reg-nome" placeholder="Nome Completo" required class="bg-transparent border-b hairline-border px-0 py-3 outline-none focus:border-primary w-full text-sm text-on-background">
                <input aria-label="Seu CPF" type="text" id="reg-cpf" placeholder="CPF" required class="bg-transparent border-b hairline-border px-0 py-3 outline-none focus:border-primary w-full text-sm text-on-background">
                <input aria-label="Seu Telefone" type="tel" id="reg-telefone" placeholder="Telefone / WhatsApp" required class="bg-transparent border-b hairline-border px-0 py-3 outline-none focus:border-primary w-full text-sm text-on-background">
                <input aria-label="Seu E-mail" type="email" id="reg-email" placeholder="E-mail" required class="bg-transparent border-b hairline-border px-0 py-3 outline-none focus:border-primary w-full text-sm text-on-background">
                <input aria-label="Crie uma Senha" type="password" id="reg-senha" placeholder="Senha" required class="bg-transparent border-b hairline-border px-0 py-3 outline-none focus:border-primary w-full text-sm text-on-background">
                
                <!-- CHECKBOX DA NEWSLETTER -->
                <label class="flex items-center gap-2 mt-2 mb-2 cursor-pointer">
                    <input type="checkbox" id="reg-newsletter" checked class="accent-on-background w-4 h-4" />
                    <span class="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Quero receber alertas de novas peças no acervo</span>
                </label>

                <button type="submit" class="w-full bg-on-background text-on-primary text-sm uppercase tracking-[0.2em] py-4 hover:bg-primary-container transition-all duration-300 font-bold">Criar Conta</button>
            </form>
        </div>
    </div>

    <!-- Drawer: MOBILE MENU -->
    <div id="mobile-menu-overlay" class="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 hidden opacity-0 transition-opacity duration-300"></div>
    <div id="mobile-menu-drawer" class="fixed top-0 left-0 h-full w-[80vw] max-w-[300px] bg-surface-container z-50 transform -translate-x-full transition-transform duration-300 ease-in-out p-6 border-r hairline-border flex flex-col">
        <div class="flex justify-between items-center mb-12">
            <img src="/logo.webp" alt="A Garimpeira" class="h-6" />
            <button id="close-mobile-menu" aria-label="Fechar menu lateral" class="text-on-background hover:text-primary transition-colors flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>
        <nav class="flex flex-col gap-6">
            <a href="/garimpos" class="text-lg font-serif italic text-on-background hover:text-primary transition-colors lowercase tracking-widest">acervo</a>
            <a href="/packs" class="text-lg font-serif italic text-on-background hover:text-primary transition-colors lowercase tracking-widest">packs</a>
        </nav>
    </div>

    <!-- Botão WhatsApp Flutuante -->
    <a href="https://wa.me/5515998332211" target="_blank" rel="noopener noreferrer" 
       class="fixed bottom-6 right-6 z-[100] bg-[#25D366] text-white p-3 md:p-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 flex items-center justify-center cursor-pointer"
       aria-label="Fale conosco no WhatsApp">
       <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
         <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
       </svg>
    </a>
    `;

    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);
    document.body.insertAdjacentHTML('beforeend', drawersHTML);

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const menuDrawer = document.getElementById('mobile-menu-drawer');
    const menuOverlay = document.getElementById('mobile-menu-overlay');
    const closeMenuBtn = document.getElementById('close-mobile-menu');

    function openMobileMenu() {
        if (!menuOverlay || !menuDrawer) return;
        menuOverlay.classList.remove('hidden');
        setTimeout(() => {
            menuOverlay.classList.remove('opacity-0');
            menuDrawer.classList.remove('-translate-x-full');
        }, 10);
    }

    function closeMobileMenu() {
        if (!menuOverlay || !menuDrawer) return;
        menuOverlay.classList.add('opacity-0');
        menuDrawer.classList.add('-translate-x-full');
        setTimeout(() => menuOverlay.classList.add('hidden'), 300);
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', closeMobileMenu);
}