import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from './js/supabase.js';
import './css/main.css';

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
                  const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' });
                  resolve(newFile);
              }, 'image/webp', quality);
          };
      };
  });
};

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dados brutos
  const [produtos, setProdutos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  
  // Estados para Filtros
  const [filtroPecaBusca, setFiltroPecaBusca] = useState('');
  const [filtroPecaStatus, setFiltroPecaStatus] = useState('todos');
  
  const [filtroUserBusca, setFiltroUserBusca] = useState('');
  const [filtroUserTipo, setFiltroUserTipo] = useState('todos');

  // Estado do Dash da Lojinha (Modal)
  const [lojinhaSelecionada, setLojinhaSelecionada] = useState(null);

  // Métricas
  const [metricas, setMetricas] = useState({ 
      ativas: 0, 
      vendidas: 0, 
      totalLojas: 0, 
      totalUsuarios: 0,
      totalPedidos: 0,
      volumeTransacionado: 0,
      receitaPlataforma: 0,
      ticketMedio: 0
  });
  
  // Configurações Globais
  const [fee, setFee] = useState(15);
  const [homeTitle, setHomeTitle] = useState('A moda do\ndesapego.');
  const [homeSubtitle, setHomeSubtitle] = useState('Uma plataforma digital para comprar e vender roupas de brechós online. Renove seu guarda-roupa ou faça uma grana extra.');
  const [heroImagePreview, setHeroImagePreview] = useState('');
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [fullBannerPreview, setFullBannerPreview] = useState('');
  const [fullBannerFile, setFullBannerFile] = useState(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/'; return; }
    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodsRes, usersRes, ordersRes, configRes] = await Promise.all([
          supabase.from('produtos').select('*, customers(nome_loja)'),
          supabase.from('customers').select('*'),
          supabase.from('orders').select('*'),
          supabase.from('site_config').select('*').limit(1).single()
      ]);

      const configData = configRes.data;
      let currentFee = 15;
      
      if (configData) {
        currentFee = configData.marketplace_fee || 15;
        setFee(currentFee);
        if (configData.home_title) setHomeTitle(configData.home_title);
        if (configData.home_subtitle) setHomeSubtitle(configData.home_subtitle);
        if (configData.hero_image_url) setHeroImagePreview(configData.hero_image_url);
        if (configData.full_banner_url) setFullBannerPreview(configData.full_banner_url);
      }

      const prods = prodsRes.data || [];
      const users = usersRes.data || [];
      const ords = ordersRes.data || [];
      
      setProdutos(prods);
      setUsuarios(users);
      setPedidos(ords);

      const lojas = users.filter(u => u.cep_origem);
      const vendasConcluidas = ords.filter(o => o.status === 'approved' || o.status === 'paid');
      const gmv = vendasConcluidas.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
      const ticket = vendasConcluidas.length > 0 ? (gmv / vendasConcluidas.length) : 0;
      const receita = gmv * (currentFee / 100);
      
      setMetricas({
        ativas: prods.filter(p => p.status === 'disponivel').length,
        vendidas: prods.filter(p => p.status === 'vendido').length,
        totalLojas: lojas.length,
        totalUsuarios: users.length,
        totalPedidos: vendasConcluidas.length,
        volumeTransacionado: gmv,
        receitaPlataforma: receita,
        ticketMedio: ticket
      });
    } catch (err) { console.error("Erro:", err); }
    finally { setLoading(false); }
  };

  // --- Funções de Moderação ---
  const toggleProductStatus = async (id, currentStatus) => {
      const newStatus = currentStatus === 'suspenso' ? 'disponivel' : 'suspenso';
      try {
          await supabase.from('produtos').update({ status: newStatus }).eq('id', id);
          fetchData();
      } catch (err) { alert("Erro ao alterar status da peça."); }
  };

  const deleteProduct = async (id) => {
      if (confirm('Tem certeza absoluta que deseja excluir este anúncio permanentemente?')) {
          try {
              await supabase.from('produtos').delete().eq('id', id);
              fetchData();
          } catch (err) { alert("Erro ao excluir peça."); }
      }
  };

  const toggleUserStatus = async (id, currentStatus) => {
      const newStatus = (currentStatus === 'bloqueado') ? 'ativo' : 'bloqueado';
      try {
          await supabase.from('customers').update({ status: newStatus }).eq('id', id);
          fetchData();
      } catch (err) { alert("Erro ao alterar status do usuário."); }
  };

  // --- Salvamento ---
  const handleHeroImageChange = (e) => { const file = e.target.files[0]; if (file) { setHeroImageFile(file); setHeroImagePreview(URL.createObjectURL(file)); } };
  const handleFullBannerChange = (e) => { const file = e.target.files[0]; if (file) { setFullBannerFile(file); setFullBannerPreview(URL.createObjectURL(file)); } };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      let finalHeroUrl = heroImagePreview;
      let finalBannerUrl = fullBannerPreview;

      if (heroImageFile) {
        const processedFile = await compressImage(heroImageFile, 800, 1200, 0.8);
        const filePath = `sistema/hero_home_${Date.now()}.webp`;
        await supabase.storage.from('fotos').upload(filePath, processedFile, { upsert: true });
        finalHeroUrl = supabase.storage.from('fotos').getPublicUrl(filePath).data.publicUrl;
      }

      if (fullBannerFile) {
        const processedFile = await compressImage(fullBannerFile, 1920, 1080, 0.8);
        const filePath = `sistema/banner_home_${Date.now()}.webp`;
        await supabase.storage.from('fotos').upload(filePath, processedFile, { upsert: true });
        finalBannerUrl = supabase.storage.from('fotos').getPublicUrl(filePath).data.publicUrl;
      }

      const { data: existing } = await supabase.from('site_config').select('id').limit(1).single();
      
      const payload = {
          marketplace_fee: fee, home_title: homeTitle, home_subtitle: homeSubtitle,
          hero_image_url: finalHeroUrl !== heroImagePreview ? finalHeroUrl : existing?.hero_image_url,
          full_banner_url: finalBannerUrl !== fullBannerPreview ? finalBannerUrl : existing?.full_banner_url
      };

      if (existing) await supabase.from('site_config').update(payload).eq('id', existing.id);
      else await supabase.from('site_config').insert([payload]);

      alert('Configurações atualizadas com sucesso!');
      fetchData(); 
    } catch (error) { alert('Erro ao salvar: ' + error.message); } 
    finally { setIsSavingConfig(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // --- Filtros Aplicados ---
  const produtosFiltrados = produtos.filter(p => {
      const matchBusca = (p.nome || '').toLowerCase().includes(filtroPecaBusca.toLowerCase()) || (p.id || '').toLowerCase().includes(filtroPecaBusca.toLowerCase());
      const matchStatus = filtroPecaStatus === 'todos' || p.status === filtroPecaStatus;
      return matchBusca && matchStatus;
  });

  const usuariosFiltrados = usuarios.filter(u => {
      const matchBusca = (u.nome || '').toLowerCase().includes(filtroUserBusca.toLowerCase()) || (u.email || '').toLowerCase().includes(filtroUserBusca.toLowerCase());
      const isLojinha = u.cep_origem && u.nome_loja;
      const matchTipo = filtroUserTipo === 'todos' || (filtroUserTipo === 'vendedor' ? isLojinha : !isLojinha);
      return matchBusca && matchTipo;
  });

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col" style={{ fontFamily: "'Roboto', sans-serif" }}>
      
      {/* HEADER */}
      <header className="bg-[#1E293B] text-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-4">
          {/* Logo Breshop substituindo o texto */}
          <img src="/logo.webp" alt="Breshop Admin" className="h-14 md-16 w-auto object-contain" />
          <span className="bg-white/10 text-white/80 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-white/20">Admin Panel</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10">
          <span className="material-symbols-outlined text-[18px]">logout</span> Sair
        </button>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 relative">
        <div className="flex gap-2 mb-8 bg-white p-1 rounded-lg w-max border border-outline-variant shadow-sm overflow-x-auto">
          {['visao-geral', 'moderacao-pecas', 'usuarios-e-lojas', 'configuracoes'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:bg-[#F1F5F9] hover:text-[#1E293B]'}`}
            >
              {tab.replace(/-/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="w-full py-24 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
            <span className="material-symbols-outlined text-4xl animate-spin mb-4 text-primary">refresh</span>
            <p className="text-xs font-bold uppercase tracking-widest">Sincronizando banco de dados...</p>
          </div>
        ) : (
          <>
            {/* ABA: VISÃO GERAL */}
            {activeTab === 'visao-geral' && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[#8B5CF6]">group</span> Usuários</span>
                    <span className="text-3xl font-black text-[#1E293B]">{metricas.totalUsuarios}</span>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[#3B82F6]">storefront</span> Lojinhas</span>
                    <span className="text-3xl font-black text-[#1E293B]">{metricas.totalLojas}</span>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[#F59E0B]">inventory_2</span> Em Estoque</span>
                    <span className="text-3xl font-black text-[#1E293B]">{metricas.ativas}</span>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[#10B981]">receipt_long</span> Pedidos</span>
                    <span className="text-3xl font-black text-[#1E293B]">{metricas.totalPedidos}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#1E293B] rounded-xl p-8 border border-[#334155] shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <span className="material-symbols-outlined text-8xl">public</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-4 flex items-center gap-2 relative z-10"><span className="material-symbols-outlined text-white">monitoring</span> GMV (Vol. Transacionado)</span>
                    <span className="text-4xl font-black text-white truncate relative z-10">R$ {metricas.volumeTransacionado.toFixed(2)}</span>
                  </div>
                  
                  <div className="bg-primary-container/20 rounded-xl p-8 border border-primary/20 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2 relative z-10"><span className="material-symbols-outlined text-primary">savings</span> Receita Plataforma ({fee}%)</span>
                    <span className="text-4xl font-black text-primary truncate relative z-10">R$ {metricas.receitaPlataforma.toFixed(2)}</span>
                  </div>

                  <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#64748B] mb-4 flex items-center gap-2 relative z-10"><span className="material-symbols-outlined text-[#10B981]">sell</span> Ticket Médio</span>
                    <span className="text-4xl font-black text-[#1E293B] truncate relative z-10">R$ {metricas.ticketMedio.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: MODERAÇÃO DE PEÇAS */}
            {activeTab === 'moderacao-pecas' && (
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-outline-variant bg-[#F8FAFC] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#1E293B]">Moderação de Acervo</h2>
                    <p className="text-xs text-[#64748B] mt-1">Gerencie os anúncios criados pelas lojinhas do marketplace.</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input 
                      type="text" placeholder="Buscar peça ou ID..." 
                      value={filtroPecaBusca} onChange={(e) => setFiltroPecaBusca(e.target.value)}
                      className="bg-white border border-outline-variant rounded-md px-3 py-2 text-sm outline-none focus:border-primary flex-1 md:w-64"
                    />
                    <select 
                      value={filtroPecaStatus} onChange={(e) => setFiltroPecaStatus(e.target.value)}
                      className="bg-white border border-outline-variant rounded-md px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="todos">Todos Status</option>
                      <option value="disponivel">Disponível</option>
                      <option value="vendido">Vendido</option>
                      <option value="suspenso">Suspenso</option>
                    </select>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F1F5F9] border-b border-outline-variant">
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Peça / Produto</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Lojinha</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Preço</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Status</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B] text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtosFiltrados.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-sm text-[#64748B]">Nenhuma peça encontrada.</td></tr>
                      ) : produtosFiltrados.map(p => (
                        <tr key={p.id} className={`border-b border-outline-variant transition-colors ${p.status === 'suspenso' ? 'bg-[#FEF2F2]' : 'hover:bg-[#F8FAFC]'}`}>
                          <td className="p-4 flex items-center gap-4">
                            <img src={p.url_foto ? p.url_foto.split(',')[0] : ''} className="w-12 h-12 rounded bg-surface-variant border border-outline-variant object-cover shadow-sm" />
                            <div>
                              <p className="text-sm font-bold text-[#1E293B] truncate max-w-[250px]">{p.nome}</p>
                              <p className="text-[10px] text-[#64748B] mt-1 font-mono bg-[#F1F5F9] inline-block px-1.5 py-0.5 rounded border border-outline-variant">ID: {p.id.split('-')[0]}</p>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-medium text-[#475569]">{p.customers?.nome_loja || 'Desconhecida'}</td>
                          <td className="p-4 text-sm font-bold text-[#1E293B] whitespace-nowrap">R$ {p.preco?.toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-widest font-bold border ${p.status === 'disponivel' ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : p.status === 'vendido' ? 'bg-primary-container text-primary border-primary/30' : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex justify-end gap-2">
                                <button onClick={() => toggleProductStatus(p.id, p.status)} disabled={p.status === 'vendido'} className="p-1.5 rounded bg-white border border-outline-variant text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center" title={p.status === 'suspenso' ? 'Reativar' : 'Suspender'}><span className="material-symbols-outlined text-[18px]">{p.status === 'suspenso' ? 'play_arrow' : 'pause'}</span></button>
                                <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded bg-white border border-outline-variant text-[#64748B] hover:bg-[#DC2626] hover:text-white hover:border-[#DC2626] transition-colors shadow-sm flex items-center" title="Excluir"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA: USUÁRIOS E LOJAS */}
            {activeTab === 'usuarios-e-lojas' && (
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-outline-variant bg-[#F8FAFC] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#1E293B]">Usuários e Lojinhas</h2>
                    <p className="text-xs text-[#64748B] mt-1">Gerencie acessos e visualize os dashboards financeiros das lojinhas.</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input 
                      type="text" placeholder="Buscar nome ou email..." 
                      value={filtroUserBusca} onChange={(e) => setFiltroUserBusca(e.target.value)}
                      className="bg-white border border-outline-variant rounded-md px-3 py-2 text-sm outline-none focus:border-primary flex-1 md:w-64"
                    />
                    <select 
                      value={filtroUserTipo} onChange={(e) => setFiltroUserTipo(e.target.value)}
                      className="bg-white border border-outline-variant rounded-md px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="todos">Todos os Tipos</option>
                      <option value="comprador">Somente Compradores</option>
                      <option value="vendedor">Somente Lojinhas</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F1F5F9] border-b border-outline-variant">
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Usuário / E-mail</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Tipo de Conta</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Contato / Doc</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Status</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B] text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltrados.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-sm text-[#64748B]">Nenhum usuário encontrado.</td></tr>
                      ) : usuariosFiltrados.map(u => {
                        const isLojinha = u.cep_origem && u.nome_loja;
                        const statusReal = u.status || 'ativo';
                        return (
                        <tr key={u.id} className={`border-b border-outline-variant transition-colors ${statusReal === 'bloqueado' ? 'bg-[#FEF2F2] opacity-80' : 'hover:bg-[#F8FAFC]'}`}>
                          <td className="p-4">
                            <p className="text-sm font-bold text-[#1E293B] truncate max-w-[200px]">{u.nome || 'Sem nome'}</p>
                            <p className="text-[10px] text-[#64748B] mt-1 truncate max-w-[200px]">{u.email || '—'}</p>
                          </td>
                          <td className="p-4">
                            {isLojinha ? (
                                <div>
                                    <span className="px-2 py-1 rounded text-[9px] uppercase tracking-widest font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">Vendedor</span>
                                    <p className="text-xs font-bold text-[#475569] mt-1">{u.nome_loja}</p>
                                </div>
                            ) : (
                                <span className="px-2 py-1 rounded text-[9px] uppercase tracking-widest font-bold bg-[#F1F5F9] text-[#64748B] border border-outline-variant">Comprador</span>
                            )}
                          </td>
                          <td className="p-4">
                            <p className="text-xs text-[#1E293B]">{u.telefone || '—'}</p>
                            <p className="text-[10px] text-[#64748B] mt-1 font-mono">{u.cpf || '—'}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-widest font-bold border ${statusReal === 'ativo' ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'}`}>
                              {statusReal}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex justify-end gap-2">
                                 {isLojinha && (
                                     <button 
                                        onClick={() => setLojinhaSelecionada(u)} 
                                        className="p-1.5 rounded bg-white border border-outline-variant text-primary hover:bg-primary hover:text-white hover:border-primary transition-colors shadow-sm flex items-center"
                                        title="Ver Dash Financeiro da Loja"
                                     >
                                        <span className="material-symbols-outlined text-[18px]">query_stats</span>
                                     </button>
                                 )}
                                 <button 
                                    onClick={() => toggleUserStatus(u.id, statusReal)} 
                                    className={`p-1.5 rounded bg-white border border-outline-variant transition-colors shadow-sm flex items-center ${statusReal === 'bloqueado' ? 'text-[#059669] hover:bg-[#059669] hover:text-white hover:border-[#059669]' : 'text-[#DC2626] hover:bg-[#DC2626] hover:text-white hover:border-[#DC2626]'}`}
                                    title={statusReal === 'bloqueado' ? 'Desbloquear Usuário' : 'Bloquear Acesso'}
                                 >
                                    <span className="material-symbols-outlined text-[18px]">{statusReal === 'bloqueado' ? 'lock_open' : 'block'}</span>
                                 </button>
                             </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA: CONFIGURAÇÕES */}
            {activeTab === 'configuracoes' && (
              <form onSubmit={handleSaveConfig} className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm max-w-4xl flex flex-col gap-10">
                <div>
                    <h2 className="text-lg font-bold text-[#1E293B] border-b border-outline-variant pb-3 mb-6">Textos da Vitrine</h2>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Título Principal (Hero)</label>
                            <textarea rows="2" value={homeTitle} onChange={(e) => setHomeTitle(e.target.value)} className="bg-[#F8FAFC] border border-outline-variant rounded-lg px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full text-sm text-[#1E293B] font-medium transition-all"></textarea>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Subtítulo (Abaixo do Título)</label>
                            <textarea rows="3" value={homeSubtitle} onChange={(e) => setHomeSubtitle(e.target.value)} className="bg-[#F8FAFC] border border-outline-variant rounded-lg px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full text-sm text-[#1E293B] transition-all"></textarea>
                        </div>
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[#1E293B] border-b border-outline-variant pb-3 mb-6">Mídia da Vitrine</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Banner de Fundo (Opcional)</label>
                                <p className="text-xs text-[#94A3B8] mt-1">Imagem larga para substituir a cor lisa no fundo.</p>
                            </div>
                            <div className="w-full h-32 bg-[#F8FAFC] border-2 border-dashed border-outline-variant rounded-lg flex items-center justify-center overflow-hidden shrink-0 relative">
                                {fullBannerPreview ? <img src={fullBannerPreview} alt="Fundo Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[#CBD5E1]">panorama</span>}
                            </div>
                            <input type="file" accept="image/*" onChange={handleFullBannerChange} className="block w-full text-sm text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-[#E2E8F0] file:text-[#475569] hover:file:bg-[#CBD5E1] cursor-pointer transition-colors" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Imagem do Arco</label>
                                <p className="text-xs text-[#94A3B8] mt-1">Foto em formato retrato (vertical) para o arco da home.</p>
                            </div>
                            <div className="w-24 h-36 bg-[#F8FAFC] border-2 border-dashed border-outline-variant rounded-t-full rounded-b-lg flex items-center justify-center overflow-hidden shrink-0 mx-auto md:mx-0">
                                {heroImagePreview ? <img src={heroImagePreview} alt="Arco Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[#CBD5E1]">portrait</span>}
                            </div>
                            <input type="file" accept="image/*" onChange={handleHeroImageChange} className="block w-full text-sm text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-[#E2E8F0] file:text-[#475569] hover:file:bg-[#CBD5E1] cursor-pointer transition-colors" />
                        </div>
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[#1E293B] border-b border-outline-variant pb-3 mb-6">Regras de Negócio</h2>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Taxa da Plataforma (%)</label>
                        <p className="text-xs text-[#94A3B8] mb-2">Comissão retida em cada venda realizada pelas lojinhas.</p>
                        <input type="number" value={fee} onChange={(e) => setFee(e.target.value)} className="bg-[#F8FAFC] border border-outline-variant rounded-lg px-4 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full max-w-[150px] text-sm text-[#1E293B] font-bold transition-all" />
                    </div>
                </div>
                <div className="border-t border-outline-variant pt-6 flex justify-end">
                    <button type="submit" disabled={isSavingConfig} className="bg-primary text-white text-xs font-bold uppercase tracking-widest py-3 px-8 rounded hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                        {isSavingConfig ? <><span className="material-symbols-outlined animate-spin text-[16px]">sync</span> SALVANDO...</> : 'SALVAR ALTERAÇÕES'}
                    </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>

      {/* --- MODAL DA LOJINHA (SPLIT FINANCEIRO) --- */}
      {lojinhaSelecionada && (() => {
          // Cálculo na mosca baseado na taxa atual do sistema
          const lojinhaProds = produtos.filter(p => p.seller_id === lojinhaSelecionada.id);
          const vendidos = lojinhaProds.filter(p => p.status === 'vendido');
          const gmvLoja = vendidos.reduce((acc, curr) => acc + (curr.preco || 0), 0);
          const retencao = gmvLoja * (fee / 100);
          const saldoVendedor = gmvLoja - retencao;

          return (
            <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col transform transition-all">
                    
                    <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-[#F8FAFC]">
                        <div className="flex items-center gap-4">
                            <img src={lojinhaSelecionada.logo_url || '/logo.png'} className="w-12 h-12 rounded-full object-cover border border-outline-variant" />
                            <div>
                                <h2 className="text-xl font-black text-[#1E293B]">{lojinhaSelecionada.nome_loja}</h2>
                                <p className="text-xs text-[#64748B] uppercase tracking-widest">{lojinhaSelecionada.nome}</p>
                            </div>
                        </div>
                        <button onClick={() => setLojinhaSelecionada(null)} className="text-[#94A3B8] hover:text-[#DC2626] bg-white border border-outline-variant rounded-full p-2 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    
                    <div className="p-8 flex flex-col gap-8">
                        {/* Status da Loja */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#F1F5F9] p-4 rounded-xl border border-outline-variant">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] block mb-1">Peças Ativas</span>
                                <span className="text-2xl font-bold text-[#1E293B]">{lojinhaProds.filter(p => p.status === 'disponivel').length}</span>
                            </div>
                            <div className="bg-[#F1F5F9] p-4 rounded-xl border border-outline-variant">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] block mb-1">Peças Vendidas</span>
                                <span className="text-2xl font-bold text-[#1E293B]">{vendidos.length}</span>
                            </div>
                        </div>

                        {/* Dash Financeiro */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B] mb-4 border-b border-outline-variant pb-2">Split de Pagamentos (Taxa: {fee}%)</h3>
                            
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center p-3 bg-white rounded border border-outline-variant">
                                    <span className="text-sm font-medium text-[#475569]">Volume Bruto (GMV)</span>
                                    <span className="text-sm font-bold text-[#1E293B]">R$ {gmvLoja.toFixed(2)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center p-3 bg-primary-container/20 rounded border border-primary/20">
                                    <span className="text-sm font-medium text-primary">Retenção da Plataforma</span>
                                    <span className="text-sm font-bold text-primary">- R$ {retencao.toFixed(2)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-[#1E293B] rounded-lg border border-[#334155] shadow-inner mt-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Saldo a Liberar p/ Lojista</span>
                                    <span className="text-2xl font-black text-[#10B981]">R$ {saldoVendedor.toFixed(2)}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-[#94A3B8] mt-3 italic text-center">Os repasses para as contas Asaas dos vendedores ocorrem automaticamente após o prazo de devolução de cada pedido.</p>
                        </div>
                    </div>
                </div>
            </div>
          );
      })()}

    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<AdminDashboard />);
}