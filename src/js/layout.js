import { supabase } from './supabase.js';

export function renderLayout() {
    document.documentElement.style.fontSize = "14.5px";

    const headerHTML = `
    <header id="main-header" class="fixed top-0 left-0 w-full z-50 bg-surface shadow-sm border-b border-outline-variant transition-all duration-300" style="background-image: url('/ondas-bg.webp'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        <div class="max-w-7xl mx-auto px-4 md:px-8 py-2 md:py-3 flex justify-between items-center gap-4 bg-black/10 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none rounded-b-2xl md:rounded-none">
            
            <button id="hamburger-btn" aria-label="Abrir menu" class="md:hidden text-white p-1">
                <span class="material-symbols-outlined">menu</span>
            </button>
            
            <a href="/" class="flex-shrink-0 cursor-pointer flex items-center">
                <img src="/logo.webp" alt="Breshop" class="h-10 md:h-12 w-auto object-contain" width="120" height="48" />
            </a>
            
            <form id="search-form" class="hidden md:flex flex-1 max-w-2xl relative mx-8" toolname="buscar_produtos" tooldescription="Busca peças e marcas no catálogo do Breshop">
                <input aria-label="Buscar peças ou marcas" class="w-full bg-white/80 backdrop-blur-md border border-[#285059]/30 rounded-full px-6 py-2.5 text-sm font-body-md text-[#285059] placeholder-[#285059]/60 focus:outline-none focus:border-[#285059] focus:ring-1 focus:ring-[#285059] transition-all" placeholder="Buscar por roupas, marcas ou lojinhas..." type="text" toolparamdescription="Termo da busca" />
                <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#285059]/70">search</span>
            </form>
            
            <div class="flex items-center gap-3 md:gap-4 shrink-0">
                <a href="/comprar" class="hidden md:flex items-center font-label-lg text-xs md:text-sm font-bold text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full transition-all">
                    Comprar
                </a>
                <a href="/lojinhas" class="hidden md:flex items-center font-label-lg text-xs md:text-sm font-bold text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full transition-all">
                    Lojinhas
                </a>
                
                <a href="/vender" class="hidden md:flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-full font-label-lg text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-all shadow-md">
                    <span class="material-symbols-outlined text-[16px]">add_circle</span>
                    Vender
                </a>
                
                <button id="auth-toggle-btn" aria-label="Minha Conta" class="text-white hover:opacity-80 transition-all p-1.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm">
                    <span class="material-symbols-outlined text-[22px]">person</span>
                </button>

                <button id="cart-toggle-btn" aria-label="Sacola" class="text-white hover:opacity-80 transition-all p-1.5 relative flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm">
                    <span class="material-symbols-outlined text-[22px]">shopping_bag</span>
                    <span id="cart-count-badge" class="absolute -top-1 -right-1 bg-error text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center hidden font-bold shadow-sm">0</span>
                </button>
            </div>
        </div>
        <form id="mobile-search-form" class="md:hidden px-4 pb-2" toolname="buscar_produtos" tooldescription="Busca peças e marcas no catálogo do Breshop">
            <div class="relative w-full">
                <input aria-label="Buscar peças" class="w-full bg-white/80 backdrop-blur-md border border-[#285059]/30 rounded-full px-4 py-2 text-sm font-body-md text-[#285059] placeholder-[#285059]/60 focus:outline-none focus:border-[#285059] transition-all shadow-sm" placeholder="Buscar peças..." type="text" toolparamdescription="Termo da busca" />
            </div>
        </form>
    </header>
    `;

    const footerHTML = `
    <footer id="footer" class="w-full py-12 px-4 md:px-8 bg-surface-container-low border-t border-outline-variant mt-auto relative overflow-hidden" style="background-image: url('/ondas-bg.webp'); background-size: cover; background-position: bottom; background-repeat: no-repeat;">
        <div class="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-0"></div>
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            <div class="col-span-1 md:col-span-2">
                <img src="/logo.webp" alt="Breshop" class="h-12 md:h-14 w-auto object-contain mb-4" width="140" height="56"/>
                <p class="text-sm font-body-md text-[#285059] max-w-sm mb-4 font-medium">A moda do desapego. A plataforma digital que conecta brechós online e pessoas apaixonadas por moda sustentável.</p>
                <p class="text-[10px] font-label-sm text-[#285059]/80 uppercase tracking-widest font-bold">© 2026 Breshop. Todos os direitos reservados.</p>
                <p class="text-[10px] font-label-sm text-[#285059]/80 uppercase tracking-widest font-bold mt-1">Encarregado de Dados (DPO): dpo@breshop.com.br</p>
            </div>
            
            <div class="col-span-1 flex flex-col gap-3">
                <h3 class="font-label-lg font-black text-sm text-[#285059] mb-2 uppercase tracking-widest">Marketplace</h3>
                <a class="text-sm font-body-md text-[#285059] hover:opacity-70 font-medium transition-all" href="/comprar">Comprar Roupas</a>
                <a class="text-sm font-body-md text-[#285059] hover:opacity-70 font-medium transition-all" href="/lojinhas">Ver Lojinhas</a>
                <a class="text-sm font-body-md text-[#285059] hover:opacity-70 font-medium transition-all" href="/vender">Quero Vender</a>
                <a class="text-sm font-body-md text-[#285059] hover:opacity-70 font-medium transition-all" href="/minha-conta">Minha Conta</a>
            </div>

            <div class="col-span-1 flex flex-col gap-3">
                <h3 class="font-label-lg font-black text-sm text-[#285059] mb-2 uppercase tracking-widest">Ajuda & Legal</h3>
                <a class="text-sm font-body-md text-[#285059] hover:opacity-70 font-medium transition-all" href="/faq">Como Funciona</a>
                <a class="text-sm font-body-md text-[#285059] hover:opacity-70 font-medium transition-all" href="/termos">Termos de Uso</a>
                <a class="text-sm font-body-md text-[#285059] hover:opacity-70 font-medium transition-all" href="/privacidade">Privacidade</a>
            </div>
        </div>
    </footer>
    `;

    const drawersHTML = `
    <!-- Drawer: CARINHO -->
    <div id="checkout-drawer" class="fixed inset-y-0 right-0 w-full md:w-[400px] bg-surface transform translate-x-full transition-transform duration-300 z-[200] flex flex-col hidden shadow-2xl rounded-l-3xl">
        <div class="p-6 border-b border-[#285059]/20 flex justify-between items-center bg-[#285059]/5">
            <h2 class="font-label-lg text-xl font-bold text-[#285059]">Sua Sacola</h2>
            <button id="close-checkout-drawer" class="text-[#285059] hover:text-error bg-white rounded-full p-2 shadow-sm">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div id="cart-items-container" class="flex-1 overflow-y-auto p-6 space-y-4"></div>
        <div id="payment-area" class="p-6 border-t border-[#285059]/20 bg-[#285059]/5 flex flex-col gap-4 rounded-bl-3xl">
            <div class="flex flex-col gap-1 mb-2">
              <div class="flex justify-between items-center text-xl font-bold font-label-lg text-[#285059]">
                  <span>Total</span>
                  <span id="cart-total" class="text-primary-dark font-black">R$ 0,00</span>
              </div>
            </div>
            <button id="btn-submit-order" class="w-full bg-primary text-on-primary font-label-lg text-sm uppercase tracking-widest py-4 rounded-full hover:opacity-90 transition-all duration-300 font-bold shadow-md">
                Finalizar Compra
            </button>
        </div>
    </div>

    <!-- Drawer: AUTH -->
    <div id="auth-drawer" class="fixed inset-y-0 right-0 w-full md:w-[400px] bg-surface transform translate-x-full transition-transform duration-300 z-[200] flex flex-col hidden shadow-2xl rounded-l-3xl">
        <div class="p-6 border-b border-[#285059]/20 flex justify-between items-center bg-[#285059]/5">
            <h2 class="font-label-lg text-xl font-bold text-[#285059]" id="auth-drawer-title">Entrar</h2>
            <button id="close-auth-drawer" class="text-[#285059] hover:text-error bg-white rounded-full p-2 shadow-sm">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="flex border-b border-[#285059]/20">
            <button id="tab-login" class="flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 border-primary text-primary transition-colors">Login</button>
            <button id="tab-register" class="flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-[#285059] hover:text-primary transition-colors">Criar Lojinha</button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
            <form id="form-login" class="flex flex-col gap-4" toolname="login_usuario" tooldescription="Login na conta do Breshop">
                <input type="email" id="login-email" placeholder="Seu e-mail" required class="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md text-[#285059]" toolparamdescription="Email do usuário">
                <input type="password" id="login-senha" placeholder="Sua senha" required class="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md text-[#285059]" toolparamdescription="Senha do usuário">
                <button type="submit" class="w-full mt-4 bg-primary text-on-primary font-label-lg text-sm uppercase tracking-widest py-4 rounded-full hover:opacity-90 transition-all font-bold shadow-md">Entrar</button>
                <button type="button" id="show-forgot-password" class="text-xs font-label-sm text-[#285059] hover:text-primary mt-2 text-center underline font-medium">Esqueci minha senha</button>
            </form>
            
            <form id="form-register" class="flex flex-col gap-4 hidden" toolname="criar_lojinha" tooldescription="Cadastro de novo usuário/lojinha no Breshop">
                <div class="flex gap-4 mb-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="reg-tipo" value="pf" checked class="accent-primary w-4 h-4">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-[#285059]">Pessoa Física</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="reg-tipo" value="pj" class="accent-primary w-4 h-4">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-[#285059]">Pessoa Jurídica</span>
                    </label>
                </div>

                <input type="text" id="reg-nome" placeholder="Nome ou Nome da Lojinha" required class="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md text-[#285059]" toolparamdescription="Nome do cliente ou loja">
                <input type="text" id="reg-doc" placeholder="CPF" required class="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md text-[#285059]" toolparamdescription="CPF ou CNPJ">
                <p class="text-[9px] text-[#285059]/70 leading-tight -mt-3 mb-1">Seu documento é exigido pelo Banco Central para a criação da sua carteira de pagamentos (Asaas). Nunca será compartilhado publicamente.</p>
                <input type="tel" id="reg-telefone" placeholder="WhatsApp" required class="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md text-[#285059]" toolparamdescription="Número do WhatsApp">
                <input type="email" id="reg-email" placeholder="E-mail" required class="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md text-[#285059]" toolparamdescription="E-mail">
                <input type="password" id="reg-senha" placeholder="Crie uma senha" required class="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary w-full text-sm font-body-md text-[#285059]" toolparamdescription="Senha">
                <button type="submit" class="w-full mt-2 bg-primary text-on-primary font-label-lg text-sm uppercase tracking-widest py-4 rounded-full hover:opacity-90 transition-all font-bold shadow-md">Cadastrar</button>
            </form>
        </div>
    </div>

    <!-- Drawer: MOBILE MENU -->
    <div id="mobile-menu-overlay" class="fixed inset-0 bg-[#285059]/50 backdrop-blur-sm z-40 hidden opacity-0 transition-opacity duration-300"></div>
    <div id="mobile-menu-drawer" class="fixed top-0 left-0 h-full w-[80vw] max-w-[300px] bg-surface z-50 transform -translate-x-full transition-transform duration-300 ease-in-out p-6 rounded-r-3xl flex flex-col">
        <div class="flex justify-between items-center mb-8 pb-4 border-b border-[#285059]/20">
            <img src="/logo.webp" alt="Breshop" class="h-8 w-auto object-contain" width="100" height="32" />
            <button id="close-mobile-menu" class="text-[#285059] bg-[#285059]/10 rounded-full p-2">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <nav class="flex flex-col gap-4">
            <a href="/comprar" class="font-label-lg text-lg font-bold text-[#285059] hover:text-primary flex items-center gap-3 bg-[#285059]/5 p-4 rounded-2xl transition-colors">
                <span class="material-symbols-outlined">search</span> Comprar
            </a>
            <a href="/lojinhas" class="font-label-lg text-lg font-bold text-[#285059] hover:text-primary flex items-center gap-3 bg-[#285059]/5 p-4 rounded-2xl transition-colors">
                <span class="material-symbols-outlined">storefront</span> Lojinhas
            </a>
            <a href="/vender" class="font-label-lg text-lg font-bold text-on-primary bg-primary hover:opacity-90 flex items-center gap-3 p-4 rounded-2xl shadow-md transition-opacity">
                <span class="material-symbols-outlined">add_circle</span> Vender
            </a>
            <a href="/minha-conta" class="font-label-lg text-lg font-bold text-[#285059] hover:text-primary flex items-center gap-3 bg-[#285059]/5 p-4 rounded-2xl mt-4 transition-colors">
                <span class="material-symbols-outlined">manage_accounts</span> Minha Conta
            </a>
        </nav>
    </div>

    <!-- Banner LGPD -->
    <div id="lgpd-banner" class="fixed bottom-0 left-0 w-full bg-[#1E293B] text-white p-4 z-[300] flex flex-col md:flex-row justify-between items-center gap-4 transition-transform transform translate-y-full">
        <p class="text-xs font-body-md text-center md:text-left">Usamos cookies para gerenciar sua sessão e sacola de compras. Ao continuar, você concorda com nossa <a href="/privacidade" class="text-primary underline">Política de Privacidade</a>.</p>
        <button id="btn-aceitar-cookies" class="bg-primary px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 whitespace-nowrap">Entendi</button>
    </div>
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

    const headerEl = document.getElementById('main-header');
    const mainEl = document.querySelector('main');
    if (headerEl && mainEl) {
        const adjustMainPadding = () => {
            const headerHeight = headerEl.offsetHeight;
            mainEl.style.paddingTop = `${headerHeight + 24}px`; 
        };
        
        adjustMainPadding();
        window.addEventListener('resize', adjustMainPadding);
        setTimeout(adjustMainPadding, 300); 
    }

    document.querySelectorAll('a[href="/vender"], a[href="/vender/"]').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const { data } = await supabase.auth.getSession();
            
            if (!data.session) {
                const authDrawer = document.getElementById("auth-drawer");
                if (authDrawer) {
                    authDrawer.classList.remove("translate-x-full", "hidden");
                    authDrawer.classList.add("translate-x-0");
                    const tabRegister = document.getElementById("tab-register");
                    if (tabRegister) tabRegister.click();
                    closeMobileMenu(); 
                }
            } else {
                window.location.href = '/vender';
            }
        });
    });

    const lgpdBanner = document.getElementById('lgpd-banner');
    const btnAceitarCookies = document.getElementById('btn-aceitar-cookies');
    if (lgpdBanner && !localStorage.getItem('breshop_lgpd_accepted')) {
        setTimeout(() => lgpdBanner.classList.remove('translate-y-full'), 1000);
        btnAceitarCookies.addEventListener('click', () => {
            localStorage.setItem('breshop_lgpd_accepted', 'true');
            lgpdBanner.classList.add('translate-y-full');
        });
    }
}