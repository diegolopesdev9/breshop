// src/js/minha-conta.js
import "../css/main.css";
import { renderLayout } from "./layout.js";
import { initCheckoutListeners } from "./checkout.js";
import { initAuth, supabase } from "./auth.js";

// --- UTILITÁRIOS DE CPF ---

// Aplica a máscara: 000.000.000-00
const formatCPF = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após os 3 primeiros
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após os 3 próximos
    .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca traço
    .replace(/(-\d{2})\d+?$/, '$1'); // Impede que passe de 14 caracteres no total
};

// Validação matemática do CPF (Regra da Receita Federal)
const isValidCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, ''); // Tira a formatação para validar
  
  // Verifica se tem 11 dígitos ou se é uma sequência repetida (ex: 111.111.111-11)
  if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  
  let soma = 0, resto;
  
  // Valida primeiro dígito
  for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  
  soma = 0;
  
  // Valida segundo dígito
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
};

// --- INICIALIZAÇÃO DA PÁGINA ---

// Injeta Navbar e Modais
renderLayout();

document.addEventListener("DOMContentLoaded", async () => {
  // Inicializa eventos globais
  initCheckoutListeners();
  await initAuth();

  // 1. Verifica se o usuário tem sessão ativa
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Se tentar acessar a url direto sem estar logado, joga pra home
    window.location.href = "/";
    return;
  }

  // Preenche o campo de e-mail na interface (bloqueado para edição)
  const inputEmail = document.getElementById('conta-email');
  if (inputEmail) {
    inputEmail.value = session.user.email;
  }

  // Configura a máscara no campo de CPF em tempo real
  const inputCpf = document.getElementById('conta-cpf');
  if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
      e.target.value = formatCPF(e.target.value);
    });
  }

  // 2. Busca os dados atuais do cliente no Supabase
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (customer && !fetchError) {
    document.getElementById('conta-nome').value = customer.nome || '';
    if (inputCpf) inputCpf.value = formatCPF(customer.cpf || ''); // Formata o que vier do banco
    document.getElementById('conta-telefone').value = customer.telefone || '';
  }

  // 3. Função de Salvar (UPDATE)
  const formConta = document.getElementById('form-minha-conta');
  if (formConta) {
    formConta.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const rawCpf = inputCpf.value;
      
      // Valida o CPF antes de tentar salvar
      if (!isValidCPF(rawCpf)) {
        alert('Por favor, informe um CPF válido.');
        inputCpf.focus();
        return; // Interrompe o processo aqui
      }

      const btn = formConta.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'SALVANDO...';
      btn.disabled = true;

      const nome = document.getElementById('conta-nome').value;
      const cpfSomenteNumeros = rawCpf.replace(/\D/g, ''); // Limpa a máscara para salvar no banco
      const telefone = document.getElementById('conta-telefone').value;

      const { error: updateError } = await supabase
        .from('customers')
        .update({ nome, cpf: cpfSomenteNumeros, telefone })
        .eq('id', session.user.id);

      btn.textContent = originalText;
      btn.disabled = false;

      if (updateError) {
        alert(`Erro ao salvar: ${updateError.message}`);
      } else {
        alert('Dados atualizados com sucesso!');
      }
    });
  }

  // 4. Função de Sair da Conta (Logout na tela de perfil)
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      const confirmLogout = confirm("Deseja realmente sair da sua conta?");
      if (confirmLogout) {
        await supabase.auth.signOut();
        window.location.href = "/";
      }
    });
  }

  // --- LÓGICA DAS ABAS E HISTÓRICO DE PEDIDOS ---
  
  const tabDados = document.getElementById('tab-dados');
  const tabPedidos = document.getElementById('tab-pedidos');
  const contentDados = document.getElementById('content-dados');
  const contentPedidos = document.getElementById('content-pedidos');
  const listaPedidos = document.getElementById('lista-pedidos');

  // Alternar abas
  const switchTab = (activeTab, inactiveTab, activeContent, inactiveContent) => {
    activeTab.classList.replace('border-transparent', 'border-on-background');
    activeTab.classList.replace('text-on-surface-variant', 'text-on-background');
    
    inactiveTab.classList.replace('border-on-background', 'border-transparent');
    inactiveTab.classList.replace('text-on-background', 'text-on-surface-variant');
    
    activeContent.classList.remove('hidden');
    activeContent.classList.add('block');
    
    inactiveContent.classList.remove('block');
    inactiveContent.classList.add('hidden');
  };

  tabDados.addEventListener('click', () => switchTab(tabDados, tabPedidos, contentDados, contentPedidos));
  
  tabPedidos.addEventListener('click', async () => {
    switchTab(tabPedidos, tabDados, contentPedidos, contentDados);
    await carregarPedidos(session.user.id);
  });

  // Buscar e renderizar pedidos
  async function carregarPedidos(userId) {
    // Busca o customer_id vinculado a este usuário de autenticação
    const { data: customer } = await supabase.from('customers').select('id').eq('id', userId).single();
    if (!customer) return;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, created_at, total_amount, status')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (error || !orders || orders.length === 0) {
      listaPedidos.innerHTML = `<p class="text-sm text-on-surface-variant py-8 text-center italic">Você ainda não possui pedidos.</p>`;
      return;
    }

    // Formata e renderiza cada pedido
    listaPedidos.innerHTML = orders.map(order => {
      const dataFormatada = new Date(order.created_at).toLocaleDateString('pt-BR');
      const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount);
      
      // Define a cor da tag de status
      let statusColor = 'bg-surface-container-highest text-on-background';
      if (order.status === 'approved') statusColor = 'bg-[#10b981] text-white';
      if (order.status === 'rejected' || order.status === 'cancelled') statusColor = 'bg-error text-white';

      return `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-container p-6 hairline-border shadow-sm gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Pedido realizado em ${dataFormatada}</span>
            <span class="text-lg font-serif text-on-background">${valorFormatado}</span>
            <span class="text-xs text-on-surface-variant font-mono mt-1">ID: ${order.id.split('-')[0].toUpperCase()}</span>
          </div>
          <div class="px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest ${statusColor}">
            ${order.status === 'pendente' ? 'Pendente' : order.status}
          </div>
        </div>
      `;
    }).join('');
  }
});