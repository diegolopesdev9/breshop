import "../css/main.css";
import { renderLayout } from "./layout.js";
import { initCheckoutListeners } from "./checkout.js";
import { initAuth } from "./auth.js";
import { supabase } from "./supabase.js"; 

const formatCPF = (value) => {
  if (!value) return '';
  return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
};

const isValidCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  return resto === parseInt(cpf.substring(10, 11));
};

renderLayout();

let customerData = null;
let plataformaFee = 15;
let sessionUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  initCheckoutListeners();
  await initAuth();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "/";
    return;
  }
  sessionUser = session.user;

  const { data: config } = await supabase.from('site_config').select('marketplace_fee').limit(1).single();
  if (config && config.marketplace_fee) plataformaFee = config.marketplace_fee;

  const inputEmail = document.getElementById('conta-email');
  if (inputEmail) inputEmail.value = session.user.email;

  const inputCpf = document.getElementById('conta-cpf');
  if (inputCpf) {
    inputCpf.addEventListener('input', (e) => e.target.value = formatCPF(e.target.value));
  }

  const toggleCpf = document.getElementById('toggle-cpf');
  if (toggleCpf && inputCpf) {
      toggleCpf.addEventListener('click', () => {
          const type = inputCpf.getAttribute('type') === 'password' ? 'text' : 'password';
          inputCpf.setAttribute('type', type);
          toggleCpf.innerHTML = `<span class="material-symbols-outlined text-[20px]">${type === 'password' ? 'visibility' : 'visibility_off'}</span>`;
      });
  }

  const { data: customer, error: fetchError } = await supabase.from('customers').select('*').eq('id', session.user.id).single();

  if (customer && !fetchError) {
    customerData = customer;
    document.getElementById('conta-nome').value = customer.nome || '';
    if (inputCpf) inputCpf.value = formatCPF(customer.cpf || customer.cnpj || '');
    document.getElementById('conta-telefone').value = customer.telefone || '';
  }

  const formConta = document.getElementById('form-minha-conta');
  if (formConta) {
    formConta.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawDoc = inputCpf.value.replace(/\D/g, '');
      
      const btn = formConta.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'SALVANDO...';
      btn.disabled = true;

      const { error: updateError } = await supabase.from('customers').update({ 
        nome: document.getElementById('conta-nome').value, 
        cpf: rawDoc, 
        telefone: document.getElementById('conta-telefone').value 
      }).eq('id', session.user.id);

      btn.textContent = originalText;
      btn.disabled = false;

      if (updateError) alert(`Erro ao salvar: ${updateError.message}`);
      else alert('Dados atualizados com sucesso!');
    });
  }

  const btnExportar = document.getElementById('btn-exportar-dados');
  if (btnExportar) {
      btnExportar.addEventListener('click', () => {
          const dataToExport = {
              email: sessionUser.email,
              perfil: customerData,
              plataforma: "Breshop"
          };
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
          const downloadNode = document.createElement('a');
          downloadNode.setAttribute("href", dataStr);
          downloadNode.setAttribute("download", `breshop_dados_pessoais_${customerData?.cpf || 'conta'}.json`);
          document.body.appendChild(downloadNode);
          downloadNode.click();
          downloadNode.remove();
      });
  }

  const btnExcluir = document.getElementById('btn-excluir-conta');
  if (btnExcluir) {
      btnExcluir.addEventListener('click', async () => {
          const confirmacao = prompt("Tem certeza? Esta ação apagará sua vitrine e removerá seu acesso. Digite EXCLUIR para confirmar:");
          if (confirmacao === 'EXCLUIR') {
              try {
                  await supabase.from('customers').update({ status: 'excluido', seller_status: 'bloqueado' }).eq('id', sessionUser.id);
                  await supabase.auth.signOut();
                  alert("Sua conta foi inativada. Os dados seguirão a política de retenção regulatória da LGPD.");
                  window.location.href = "/";
              } catch (err) {
                  alert("Ocorreu um erro ao processar a exclusão.");
              }
          }
      });
  }

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm("Deseja realmente sair da sua conta?")) {
        await supabase.auth.signOut();
        window.location.href = "/";
      }
    });
  }

  const tabs = {
    dados: { btn: document.getElementById('tab-dados'), content: document.getElementById('content-dados') },
    pedidos: { btn: document.getElementById('tab-pedidos'), content: document.getElementById('content-pedidos') },
    lojinha: { btn: document.getElementById('tab-lojinha'), content: document.getElementById('content-lojinha') }
  };

  const switchTab = (activeTabKey) => {
    Object.keys(tabs).forEach(key => {
      if (!tabs[key].btn || !tabs[key].content) return;
      if (key === activeTabKey) {
        tabs[key].btn.classList.add('bg-surface', 'text-on-background', 'shadow-sm');
        tabs[key].btn.classList.remove('text-on-surface-variant', 'hover:bg-surface/50');
        tabs[key].content.classList.replace('hidden', 'flex');
        if (key === 'dados') tabs[key].content.classList.replace('flex', 'block'); 
      } else {
        tabs[key].btn.classList.remove('bg-surface', 'text-on-background', 'shadow-sm');
        tabs[key].btn.classList.add('text-on-surface-variant', 'hover:bg-surface/50');
        tabs[key].content.classList.replace('flex', 'hidden');
        tabs[key].content.classList.replace('block', 'hidden');
      }
    });
  };

  if(tabs.dados.btn) tabs.dados.btn.addEventListener('click', () => switchTab('dados'));
  if(tabs.pedidos.btn) tabs.pedidos.btn.addEventListener('click', async () => {
    switchTab('pedidos');
    await carregarPedidos(customerData.id);
  });
  if(tabs.lojinha.btn) tabs.lojinha.btn.addEventListener('click', async () => {
    switchTab('lojinha');
    await carregarPainelLojinha(customerData);
  });

  async function carregarPedidos(customerId) {
    const listaPedidos = document.getElementById('lista-pedidos');
    const { data: orders, error } = await supabase.from('orders').select('id, created_at, total_amount, status').eq('customer_id', customerId).order('created_at', { ascending: false });

    if (error || !orders || orders.length === 0) {
      listaPedidos.innerHTML = `<p class="font-body-md text-sm text-on-surface-variant py-8 text-center">Você ainda não realizou compras.</p>`;
      return;
    }

    listaPedidos.innerHTML = orders.map(order => {
      const statusColor = order.status === 'approved' ? 'bg-[#10b981] text-white border-transparent' : (order.status === 'rejected' || order.status === 'cancelled' ? 'bg-error text-white border-transparent' : 'bg-surface text-on-surface-variant border-outline-variant');
      return `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-container rounded-2xl p-6 border border-outline-variant shadow-sm gap-4">
          <div class="flex flex-col gap-1">
            <span class="font-label-sm text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Realizado em ${new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
            <span class="font-headline-xl text-xl text-on-background">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}</span>
            <span class="font-body-md text-xs text-on-surface-variant mt-1">ID: ${order.id.split('-')[0].toUpperCase()}</span>
          </div>
          <div class="px-4 py-2 rounded-full font-label-sm text-[10px] font-bold uppercase tracking-widest border ${statusColor}">${order.status}</div>
        </div>
      `;
    }).join('');
  }

  function toggleModal(modalId, contentId, state) {
      const modal = document.getElementById(modalId);
      const content = document.getElementById(contentId);
      if(state === 'open') {
          modal.classList.remove('hidden');
          modal.classList.add('flex');
          setTimeout(() => {
              modal.classList.remove('opacity-0');
              content.classList.remove('scale-95');
          }, 10);
      } else {
          modal.classList.add('opacity-0');
          content.classList.add('scale-95');
          setTimeout(() => {
              modal.classList.add('hidden');
              modal.classList.remove('flex');
          }, 300);
      }
  }

  document.getElementById('close-modal-estoque').addEventListener('click', () => toggleModal('modal-estoque', 'modal-estoque-content', 'close'));
  document.getElementById('close-modal-vendas').addEventListener('click', () => toggleModal('modal-vendas', 'modal-vendas-content', 'close'));

  window.toggleProductSeller = async (id, currentStatus) => {
      const newStatus = currentStatus === 'suspenso' ? 'disponivel' : 'suspenso';
      const btn = document.getElementById(`btn-pause-${id}`);
      if(btn) btn.disabled = true;
      try {
          await supabase.from('produtos').update({ status: newStatus, is_active: newStatus === 'disponivel' }).eq('id', id);
          if(customerData) await carregarPainelLojinha(customerData, true);
      } catch(e) {
          alert('Erro ao atualizar peça.');
          if(btn) btn.disabled = false;
      }
  };

  window.deleteProductSeller = async (id) => {
      if(!confirm("Deseja realmente excluir este desapego da sua lojinha?")) return;
      const btn = document.getElementById(`btn-del-${id}`);
      if(btn) btn.disabled = true;
      try {
          await supabase.from('produtos').delete().eq('id', id);
          if(customerData) await carregarPainelLojinha(customerData, true); 
      } catch(e) {
          alert('Erro ao excluir peça.');
          if(btn) btn.disabled = false;
      }
  };

  function renderEstoqueList(emEstoque) {
      const lista = document.getElementById('estoque-lista');
      if (emEstoque.length === 0) {
          lista.innerHTML = '<p class="text-center text-on-surface-variant font-body-md text-sm py-8">Nenhuma peça no seu estoque.</p>';
          return;
      }
      lista.innerHTML = emEstoque.map(p => `
          <div class="flex items-center gap-4 bg-surface-container rounded-2xl p-4 border border-outline-variant shadow-sm transition-all ${p.status === 'suspenso' ? 'opacity-60 grayscale' : ''}">
              <img src="${p.url_foto ? p.url_foto.split(',')[0] : ''}" class="w-16 h-20 object-cover rounded-xl border border-outline-variant bg-surface" />
              <div class="flex-1 overflow-hidden">
                  <h4 class="font-label-lg font-bold text-sm text-on-background truncate w-full">${p.nome}</h4>
                  <p class="font-body-md text-sm text-primary-dark font-bold mt-1">R$ ${p.preco.toFixed(2).replace('.', ',')}</p>
                  <span class="inline-block mt-1 px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold border ${p.status === 'disponivel' ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'}">${p.status}</span>
              </div>
              <div class="flex flex-col gap-2">
                  <button id="btn-pause-${p.id}" onclick="window.toggleProductSeller('${p.id}', '${p.status}')" class="p-2 rounded bg-surface border border-outline-variant hover:border-primary hover:text-primary transition-colors flex items-center justify-center shadow-sm" title="${p.status === 'suspenso' ? 'Reativar' : 'Pausar Anúncio'}">
                      <span class="material-symbols-outlined text-[18px]">${p.status === 'suspenso' ? 'play_arrow' : 'pause'}</span>
                  </button>
                  <button id="btn-del-${p.id}" onclick="window.deleteProductSeller('${p.id}')" class="p-2 rounded bg-surface border border-outline-variant hover:bg-error hover:text-white hover:border-error transition-colors flex items-center justify-center shadow-sm" title="Excluir Definitivamente">
                      <span class="material-symbols-outlined text-[18px]">delete</span>
                  </button>
              </div>
          </div>
      `).join('');
  }

  function renderVendasList(vendidas) {
      const lista = document.getElementById('vendas-lista');
      if (vendidas.length === 0) {
          lista.innerHTML = '<p class="text-center text-on-surface-variant font-body-md text-sm py-8">Nenhuma peça vendida ainda.</p>';
          return;
      }
      lista.innerHTML = vendidas.map(p => {
          const valorBruto = p.preco || 0;
          const taxa = valorBruto * (plataformaFee / 100);
          const valorLiquido = valorBruto - taxa;
          
          return `
          <div class="flex flex-col md:flex-row items-start md:items-center gap-4 bg-surface-container rounded-2xl p-4 border border-outline-variant shadow-sm">
              <img src="${p.url_foto ? p.url_foto.split(',')[0] : ''}" class="w-16 h-20 object-cover rounded-xl border border-outline-variant bg-surface shrink-0" />
              <div class="flex-1 w-full">
                  <h4 class="font-label-lg font-bold text-sm text-on-background truncate w-full">${p.nome}</h4>
                  <p class="font-label-sm text-[10px] text-on-surface-variant mt-1 uppercase tracking-widest">ID: ${p.id.split('-')[0]}</p>
              </div>
              <div class="flex flex-col w-full md:w-auto bg-surface p-3 rounded-xl border border-outline-variant shrink-0 min-w-[180px]">
                  <div class="flex justify-between items-center mb-1">
                      <span class="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Valor de Venda</span>
                      <span class="text-xs font-bold text-on-background">R$ ${valorBruto.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div class="flex justify-between items-center mb-2 pb-2 border-b border-outline-variant">
                      <span class="text-[10px] font-bold text-error uppercase tracking-widest">Taxa (${plataformaFee}%)</span>
                      <span class="text-xs font-bold text-error">- R$ ${taxa.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div class="flex justify-between items-center">
                      <span class="text-[10px] font-black text-primary uppercase tracking-widest">Seu Repasse</span>
                      <span class="text-sm font-black text-primary-dark">R$ ${valorLiquido.toFixed(2).replace('.', ',')}</span>
                  </div>
              </div>
          </div>
          `;
      }).join('');
  }

  async function carregarPainelLojinha(customer, refreshOnly = false) {
      const containerOnboarding = document.getElementById('lojinha-onboarding');
      const containerDashboard = document.getElementById('lojinha-dashboard');
      
      if (!customer.cep_origem) {
          containerOnboarding.classList.replace('hidden', 'flex');
          containerDashboard.classList.replace('flex', 'hidden');
          
          const cepInput = document.getElementById('lojinha-cep');
          cepInput.addEventListener('input', (e) => e.target.value = e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2'));

          const formAtivar = document.getElementById('form-ativar-lojinha');
          formAtivar.addEventListener('submit', async (e) => {
              e.preventDefault();
              const cep = cepInput.value.replace(/\D/g, '');
              const nomeLoja = document.getElementById('lojinha-nome-ativar').value;

              if (cep.length !== 8) return alert("Digite um CEP válido.");
              
              const btn = formAtivar.querySelector('button');
              btn.textContent = "ATIVANDO...";
              btn.disabled = true;

              const { error } = await supabase.from('customers').update({ 
                  cep_origem: cep, 
                  nome_loja: nomeLoja,
                  seller_status: 'approved' 
              }).eq('id', customer.id);
              
              if (error) {
                  alert("Erro ao ativar lojinha.");
                  btn.textContent = "Ativar Minha Lojinha";
                  btn.disabled = false;
              } else {
                  customerData.cep_origem = cep;
                  customerData.nome_loja = nomeLoja;
                  await carregarPainelLojinha(customerData);
              }
          });
      } else {
          containerOnboarding.classList.replace('flex', 'hidden');
          containerDashboard.classList.replace('hidden', 'flex');

          if(!refreshOnly) {
              document.getElementById('lojinha-nome-edit').value = customer.nome_loja || '';
              
              const cepEditInput = document.getElementById('lojinha-cep-edit');
              if (cepEditInput) {
                  cepEditInput.value = (customer.cep_origem || '').replace(/^(\d{5})(\d)/, '$1-$2');
                  cepEditInput.oninput = (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2');
                  };
              }

              if(customer.logo_url) document.getElementById('preview-logo').src = customer.logo_url;
              if(customer.banner_url) document.getElementById('preview-banner').src = customer.banner_url;
          }

          const { data: produtos } = await supabase.from('produtos').select('*').eq('seller_id', customer.id).order('created_at', { ascending: false });
          
          let emEstoque = [];
          let vendidas = [];
          
          if(produtos) {
              emEstoque = produtos.filter(p => p.status === 'disponivel' || p.status === 'suspenso');
              vendidas = produtos.filter(p => p.status === 'vendido');
          }

          const valorEstoqueBruto = emEstoque.reduce((acc, p) => acc + (p.preco || 0), 0);
          const valorVendidasBruto = vendidas.reduce((acc, p) => acc + (p.preco || 0), 0);
          const saldoLiquido = valorVendidasBruto * (1 - (plataformaFee / 100));
          const formatoDinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

          document.getElementById('metric-ativas').textContent = emEstoque.length;
          document.getElementById('metric-vendidas').textContent = vendidas.length;
          
          const metricValorEstoque = document.getElementById('metric-valor-estoque');
          if (metricValorEstoque) metricValorEstoque.textContent = formatoDinheiro.format(valorEstoqueBruto);
          
          const metricSaldo = document.getElementById('metric-saldo');
          if (metricSaldo) metricSaldo.textContent = formatoDinheiro.format(saldoLiquido);

          renderEstoqueList(emEstoque);
          renderVendasList(vendidas);

          if(!refreshOnly) {
              document.getElementById('card-ativas').addEventListener('click', () => toggleModal('modal-estoque', 'modal-estoque-content', 'open'));
              document.getElementById('card-valor-estoque').addEventListener('click', () => toggleModal('modal-estoque', 'modal-estoque-content', 'open'));
              document.getElementById('card-vendidas').addEventListener('click', () => toggleModal('modal-vendas', 'modal-vendas-content', 'open'));
              document.getElementById('card-saldo').addEventListener('click', () => toggleModal('modal-vendas', 'modal-vendas-content', 'open'));

              const formPersonalizar = document.getElementById('form-personalizar-lojinha');
              formPersonalizar.addEventListener('submit', async (e) => {
                  e.preventDefault();
                  
                  const btn = document.getElementById('btn-salvar-personalizacao');
                  const textOriginal = btn.textContent;
                  btn.textContent = "SALVANDO ARQUIVOS...";
                  btn.disabled = true;

                  try {
                      const nomeEditado = document.getElementById('lojinha-nome-edit').value;
                      const cepEditado = document.getElementById('lojinha-cep-edit').value.replace(/\D/g, '');

                      if (cepEditado.length !== 8) {
                          alert("Digite um CEP válido com 8 dígitos para o cálculo de frete funcionar.");
                          btn.textContent = textOriginal;
                          btn.disabled = false;
                          return;
                      }

                      const logoFile = document.getElementById('upload-logo').files[0];
                      const bannerFile = document.getElementById('upload-banner').files[0];
                      
                      let urlLogo = customerData.logo_url;
                      let urlBanner = customerData.banner_url;

                      const compressImage = async (file, maxWidth, maxHeight, quality = 0.8) => {
                          return new Promise((resolve) => {
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = (event) => {
                                  const img = new Image();
                                  img.src = event.target.result;
                                  img.onload = () => {
                                      let width = img.width;
                                      let height = img.height;

                                      if (width > height) {
                                          if (width > maxWidth) {
                                              height = Math.round((height * maxWidth) / width);
                                              width = maxWidth;
                                          }
                                      } else {
                                          if (height > maxHeight) {
                                              width = Math.round((width * maxHeight) / height);
                                              height = maxHeight;
                                      }
                                      }

                                      const canvas = document.createElement('canvas');
                                      canvas.width = width;
                                      canvas.height = height;
                                      const ctx = canvas.getContext('2d');
                                      ctx.drawImage(img, 0, 0, width, height);

                                      canvas.toBlob((blob) => {
                                          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                                          const newFile = new File([blob], newFileName, { type: 'image/webp' });
                                          resolve(newFile);
                                      }, 'image/webp', quality);
                                  };
                              };
                          });
                      };

                      const uploadImage = async (file, type, maxWidth, maxHeight) => {
                          const processedFile = await compressImage(file, maxWidth, maxHeight, 0.8);
                          const fileName = `${customer.id}_${type}_${Date.now()}.webp`;
                          const filePath = `lojinha/${fileName}`;
                          
                          const { error: uploadError } = await supabase.storage.from('fotos').upload(filePath, processedFile, { 
                              cacheControl: '31536000',
                              contentType: 'image/webp'
                          });
                          
                          if (uploadError) throw uploadError;
                          const { data } = supabase.storage.from('fotos').getPublicUrl(filePath);
                          return data.publicUrl;
                      };

                      if (logoFile) urlLogo = await uploadImage(logoFile, 'logo', 400, 400);
                      if (bannerFile) urlBanner = await uploadImage(bannerFile, 'banner', 1200, 800);

                      const { error } = await supabase.from('customers').update({
                          nome_loja: nomeEditado,
                          cep_origem: cepEditado,
                          logo_url: urlLogo,
                          banner_url: urlBanner
                      }).eq('id', customer.id);

                      if (error) throw error;

                      customerData.nome_loja = nomeEditado;
                      customerData.cep_origem = cepEditado;
                      customerData.logo_url = urlLogo;
                      customerData.banner_url = urlBanner;
                      
                      if(urlLogo) document.getElementById('preview-logo').src = urlLogo;
                      if(urlBanner) document.getElementById('preview-banner').src = urlBanner;

                      alert("Lojinha atualizada com sucesso!");

                  } catch (err) {
                      alert("Erro ao salvar: " + err.message);
                  } finally {
                      btn.textContent = textOriginal;
                      btn.disabled = false;
                  }
              });
          }
      }
  }
});