import { createClient } from '@supabase/supabase-js';
import { closeAuthDrawer, openAuthDrawer } from './checkout.js'; 

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export let currentUser = null;
export let customerData = null; 

export async function initAuth() {
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const formForgot = document.getElementById("form-forgot");
  const authToggleBtn = document.getElementById("auth-toggle-btn");
  
  const showForgotBtn = document.getElementById("show-forgot-password");
  const backToLoginBtn = document.getElementById("back-to-login");
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");

  // Chamada inicial
  const { data: { session } } = await supabase.auth.getSession();
  await updateAuthState(session);

  supabase.auth.onAuthStateChange(async (event, session) => {
    // Evita a dupla requisição bloqueando o evento inicial que o Supabase emite sozinho
    if (event !== 'INITIAL_SESSION') {
        await updateAuthState(session);
    }
  });

  if (showForgotBtn && backToLoginBtn) {
    showForgotBtn.addEventListener("click", () => {
      formLogin.classList.add("hidden");
      formForgot.classList.remove("hidden");
    });
    backToLoginBtn.addEventListener("click", () => {
      formForgot.classList.add("hidden");
      formLogin.classList.remove("hidden");
    });
  }

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener("click", () => {
      if(formForgot) formForgot.classList.add("hidden");
    });
    tabRegister.addEventListener("click", () => {
      if(formForgot) formForgot.classList.add("hidden");
    });
  }

  if (formForgot) {
    formForgot.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = formForgot.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = "ENVIANDO...";
      btn.disabled = true;

      const email = document.getElementById("forgot-email").value;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/nova-senha'
      });

      btn.textContent = originalText;
      btn.disabled = false;

      if (error) {
        alert(`Erro: ${error.message}`);
      } else {
        alert("Link enviado! Verifique sua caixa de entrada e SPAM.");
        formForgot.reset();
        backToLoginBtn.click();
      }
    });
  }

  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = formRegister.querySelector('button');
      const originalText = btn.textContent;
      btn.textContent = "CRIANDO...";
      btn.disabled = true;

      const nome = document.getElementById("reg-nome").value;
      const cpf = document.getElementById("reg-cpf").value;
      const telefone = document.getElementById("reg-telefone").value;
      const email = document.getElementById("reg-email").value;
      const senha = document.getElementById("reg-senha").value;
      
      const checkboxNewsletter = document.getElementById("reg-newsletter");
      const aceitaNewsletter = checkboxNewsletter ? checkboxNewsletter.checked : true;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { 
              nome, 
              cpf, 
              telefone,
              aceita_newsletter: aceitaNewsletter 
          } 
        }
      });

      if (error) {
        alert(`Erro no cadastro: ${error.message}`);
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      if (aceitaNewsletter) {
          try {
              await supabase.from('newsletter').insert([{ nome, email, telefone }]);
          } catch (err) {
              console.log("Lead ignorado. E-mail já existe na base de contatos.");
          }
      }

      btn.textContent = originalText;
      btn.disabled = false;
      
      formRegister.reset();
      closeAuthDrawer();
    });
  }

  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = formLogin.querySelector('button');
      const originalText = btn.textContent;
      btn.textContent = "ENTRANDO...";
      btn.disabled = true;

      const email = document.getElementById("login-email").value;
      const senha = document.getElementById("login-senha").value;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });

      btn.textContent = originalText;
      btn.disabled = false;

      if (error) {
        alert(`Erro ao entrar: ${error.message}`);
        return;
      }

      formLogin.reset();
      closeAuthDrawer();
    });
  }

  if (authToggleBtn) {
    authToggleBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (currentUser) {
        window.location.href = "/minha-conta";
      } else {
        openAuthDrawer();
      }
    });
  }
}

async function updateAuthState(session) {
  const authToggleBtn = document.getElementById("auth-toggle-btn");

  if (session) {
    currentUser = session.user;
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (!error && data) {
      customerData = data;
    }

    if (authToggleBtn) {
      authToggleBtn.classList.add("text-primary");
      authToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }
  } else {
    currentUser = null;
    customerData = null;
    
    if (authToggleBtn) {
      authToggleBtn.classList.remove("text-primary");
      authToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }
  }
}