import "../css/main.css";
import { supabase } from "./supabase.js";
import { renderLayout } from "./layout.js";

renderLayout();

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-nova-senha");
  
  // O Supabase mapeia a flag invisível na URL para nós
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      console.log("Modo de recuperação de senha ativado. O usuário está autenticado para a troca.");
    }
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const password = document.getElementById("input-nova-senha").value;
      const btn = form.querySelector("button");
      const originalText = btn.textContent;
      
      btn.textContent = "SALVANDO...";
      btn.disabled = true;

      // Executa o bypass na segurança usando a sessão temporária amarrada no link do email
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      btn.textContent = originalText;
      btn.disabled = false;

      if (error) {
        alert(`Erro ao redefinir a senha: ${error.message}`);
      } else {
        alert("Sua senha foi redefinida com sucesso!");
        window.location.href = "/minha-conta";
      }
    });
  }
});