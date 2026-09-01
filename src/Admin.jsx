import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './js/supabase'; 
import { createRoot } from 'react-dom/client';

export default function Admin() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  // Estados Globais
  const [activeTab, setActiveTab] = useState('metricas');
  const [config, setConfig] = useState(null); 
  const [configEstoque, setConfigEstoque] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('ALL');

  // Estado news letter
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);
  
  // Estados do Dashboard e Listas
  const [metrics, setMetrics] = useState({
    faturamento: 0,
    margemLucro: 0,
    custoEstoque: 0,
    valorVendaEstoque: 0,
    produtosAtivos: 0,
    packsAtivos: 0,
    leads: 0,
    clientes: 0
  });
  const [newsletterList, setNewsletterList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  
  // Estados dos Cupons
  const [couponsList, setCouponsList] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: 10, max_uses: 100 });
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);

  // Estados das Opções Base (Modal de Estoque)
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState({
    opt_categorias: '', opt_tamanhos: '', opt_packs: '', opt_drops: ''
  });
  const [isSavingOptions, setIsSavingOptions] = useState(false);

  // Estados dos Produtos (Acervo)
  const [produtosList, setProdutosList] = useState([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    nome: '', descricao: '', preco: 0, tamanho: 'U', marca: '',
    categoria: 'Blusas', drop: '', pack: '', status: 'disponivel', is_active: true, is_destaque: false,
    custo_pago: 0, custo_operacional: 0, url_foto: ''
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Estados dos Packs (Modais Integrados no Acervo)
  const [packsList, setPacksList] = useState([]);
  const [isPacksListModalOpen, setIsPacksListModalOpen] = useState(false); 
  const [isPackModalOpen, setIsPackModalOpen] = useState(false); 
  const [editingPack, setEditingPack] = useState(null);
  const [packForm, setPackForm] = useState({
    nome: '', descricao: '', quantidade_pecas: 5,
    peso: 0, comprimento: 0, largura: 0, altura: 0,
    valor_embalagem: 0, url_foto: '', pdf_url: '', is_active: true
  });
  const [isSavingPack, setIsSavingPack] = useState(false);

  // Estados do Modal de Rastreio e Logística
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [orderStatus, setOrderStatus] = useState(''); // Status Mercado Pago
  const [logisticsStatus, setLogisticsStatus] = useState('pendente'); // Controle Interno
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAdminStatus(session.user.id, session);
      } else {
        setSession(null);
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
      if (activeTab === 'acervo') {
        fetchProdutos();
        fetchPacks();
      }
    }
  }, [periodFilter, isAdmin, activeTab]);

  useEffect(() => {
    if (configEstoque) {
      setLocalOptions({
        opt_categorias: configEstoque.opt_categorias || '',
        opt_tamanhos: configEstoque.opt_tamanhos || '',
        opt_packs: configEstoque.opt_packs || '',
        opt_drops: configEstoque.opt_drops || ''
      });
    }
  }, [configEstoque]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await checkAdminStatus(session.user.id, session);
    else setAuthLoading(false);
  };

  const checkAdminStatus = async (userId, activeSession) => {
    try {
      const { data, error } = await supabase.from('customers').select('is_admin').eq('id', userId).single();
      if (error || !data?.is_admin) {
        setIsAdmin(false);
        setSession(activeSession); 
        setAuthLoading(false);
      } else {
        setIsAdmin(true);
        setSession(activeSession);
        setAuthLoading(false);
        fetchConfigLayout();
        fetchConfigEstoque();
        fetchCoupons();
      }
    } catch (err) {
      console.error('Erro ao verificar permissão:', err);
      setAuthLoading(false);
    }
  };

  const getDateFromFilter = () => {
    const now = new Date();
    if (periodFilter === '7D') now.setDate(now.getDate() - 7);
    else if (periodFilter === '30D') now.setDate(now.getDate() - 30);
    else if (periodFilter === 'MES') now.setDate(1); 
    else return null; 
    return now.toISOString();
  };

  const handleSendNewsletter = async () => {
    if (!confirm("ALERTA: Isso vai disparar um e-mail real para TODA a sua lista da mala direta agora. Tem certeza que o lote já está no ar?")) return;
    setIsSendingNewsletter(true);
    try {
      const { data, error } = await supabase.functions.invoke('disparo-newsletter', { method: 'POST' });
      if (error) throw new Error(error.message || "Erro de comunicação com o servidor.");
      if (data && data.success) alert(`Sucesso! E-mail enviado para ${data.count} contatos da sua lista.`);
      else throw new Error(data?.error || "Erro interno no disparo da Edge Function.");
    } catch (err) { alert("Erro ao disparar e-mails: " + err.message); } 
    finally { setIsSendingNewsletter(false); }
  }; 

  const fetchDashboardData = async () => {
    try {
      const { data: allProdutos } = await supabase.from('produtos').select('id, preco, custo_pago, custo_operacional, is_active, status');
      const { data: allPacks } = await supabase.from('packs').select('id, is_active');

      const produtosAtivos = allProdutos?.filter(p => p.is_active && p.status === 'disponivel') || [];
      const packsAtivos = allPacks?.filter(p => p.is_active) || [];

      const custoEstoqueTotal = produtosAtivos.reduce((acc, p) => acc + (Number(p.custo_pago) || 0) + (Number(p.custo_operacional) || 0), 0);
      const valorVendaEstoqueTotal = produtosAtivos.reduce((acc, p) => acc + (Number(p.preco) || 0), 0);

      const custoPecaMap = {};
      allProdutos?.forEach(p => {
          custoPecaMap[p.id] = (Number(p.custo_pago) || 0) + (Number(p.custo_operacional) || 0);
      });

      const fromDate = getDateFromFilter();

      // 1. Buscamos a base de clientes PRIMEIRO
      let customersQuery = supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (fromDate) customersQuery = customersQuery.gte('created_at', fromDate);
      const { data: customersData } = await customersQuery;
      
      // 2. Buscamos os pedidos SEM o join de customers (apenas order_items)
      let ordersQuery = supabase.from('orders').select('*, order_items(product_id, custom_items)').order('created_at', { ascending: false });
      if (fromDate) ordersQuery = ordersQuery.gte('created_at', fromDate);
      
      const { data: pedidosBrutos, error: pedidosErr } = await ordersQuery;
      
      if (pedidosErr) {
          alert("Erro na API de pedidos: " + pedidosErr.message);
          console.error("Erro pedidos:", pedidosErr);
      }

      // 3. Cruzamos os dados no front-end de forma garantida
      const pedidos = (pedidosBrutos || []).map(order => {
          const clienteEncontrado = customersData?.find(c => c.id === order.customer_id);
          return {
              ...order,
              customers: {
                  nome: clienteEncontrado?.nome || 'N/A',
                  email: clienteEncontrado?.email || 'N/A'
              }
          };
      });

      setOrdersList(pedidos);
      
      let faturamentoTotal = 0;
      let custoVendas = 0;

      pedidos?.forEach(order => {
        if(order.status === 'approved' || order.status === 'enviado') {
            faturamentoTotal += Number(order.total_amount || 0);
            
            order.order_items?.forEach(item => {
              if (item.custom_items && Array.isArray(item.custom_items)) {
                  item.custom_items.forEach(pecaId => {
                      custoVendas += (custoPecaMap[pecaId] || 0);
                  });
              } else {
                  custoVendas += (custoPecaMap[item.product_id] || 0);
              }
            });
        }
      });

      const margemLucro = faturamentoTotal - custoVendas;
      
      let newsQuery = supabase.from('newsletter').select('*').order('created_at', { ascending: false });
      if (fromDate) newsQuery = newsQuery.gte('created_at', fromDate);
      const { data: newsData } = await newsQuery;
      
      setNewsletterList(newsData || []);
      setCustomersList(customersData || []);
      
      setMetrics({
        faturamento: faturamentoTotal,
        margemLucro: margemLucro,
        custoEstoque: custoEstoqueTotal,
        valorVendaEstoque: valorVendaEstoqueTotal,
        produtosAtivos: produtosAtivos.length,
        packsAtivos: packsAtivos.length,
        clientes: customersData?.length || 0,
        leads: newsData?.length || 0
      });

    } catch (err) { 
        console.error("Erro ao buscar dados do dashboard:", err); 
    }
  };

  const parseOptionsArray = (str, defaults = []) => {
    if (!str || str.trim() === '') return defaults;
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

  // --- ACERVO / PRODUTOS ---
  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProdutosList(data || []);
    } catch (err) { console.error('Erro ao buscar produtos:', err); }
  };

  const openProductForm = (produto = null) => {
    const catList = parseOptionsArray(configEstoque?.opt_categorias, ['Blusas', 'Calças', 'Vestidos']);
    const tamList = parseOptionsArray(configEstoque?.opt_tamanhos, ['P', 'M', 'G', 'U']);

    if (produto) {
      setEditingProduct(produto);
      setProductForm({ ...produto });
    } else {
      setEditingProduct(null);
      setProductForm({
        nome: '', descricao: '', preco: 0, tamanho: tamList[0] || 'U', marca: '',
        categoria: catList[0] || 'Blusas', drop: '', pack: '', status: 'disponivel', is_active: true, is_destaque: false,
        custo_pago: 0, custo_operacional: 0, url_foto: ''
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setIsSavingProduct(true);
    try {
      const payload = { ...productForm };
      if (editingProduct) {
        const { error } = await supabase.from('produtos').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('produtos').insert([payload]);
        if (error) throw error;
      }
      alert('Peça salva com sucesso!');
      setIsProductModalOpen(false);
      fetchProdutos();
    } catch (err) { alert('Erro ao salvar peça: ' + err.message); } 
    finally { setIsSavingProduct(false); }
  };

  // --- PACKS ---
  const fetchPacks = async () => {
    try {
      const { data, error } = await supabase.from('packs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPacksList(data || []);
    } catch (err) { console.error('Erro ao buscar packs:', err); }
  };

  const openPackForm = (pack = null) => {
    if (pack) {
      setEditingPack(pack);
      setPackForm({ ...pack });
    } else {
      setEditingPack(null);
      setPackForm({
        nome: '', descricao: '', quantidade_pecas: 5,
        peso: 0, comprimento: 0, largura: 0, altura: 0,
        valor_embalagem: 0, url_foto: '', pdf_url: '', is_active: true
      });
    }
    setIsPackModalOpen(true);
  };

  const handleSavePack = async (e) => {
    e.preventDefault();
    setIsSavingPack(true);
    try {
      const payload = { ...packForm };
      if (editingPack) {
        const { error } = await supabase.from('packs').update(payload).eq('id', editingPack.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('packs').insert([payload]);
        if (error) throw error;
      }
      alert('Pack salvo com sucesso!');
      setIsPackModalOpen(false);
      fetchPacks();
    } catch (err) { alert('Erro ao salvar pack: ' + err.message); } 
    finally { setIsSavingPack(false); }
  };

  // --- CUPONS ---
  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCouponsList(data || []);
    } catch (err) { console.error('Erro ao buscar cupons:', err); }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code) return alert("Digite um código para o cupom.");
    setIsSavingCoupon(true);
    try {
      const { error } = await supabase.from('coupons').insert([{
        code: newCoupon.code.toUpperCase().replace(/\s/g, ''),
        discount_percent: Number(newCoupon.discount_percent),
        max_uses: Number(newCoupon.max_uses)
      }]);
      if (error) {
        if (error.code === '23505') throw new Error("Esse código já existe.");
        throw error;
      }
      alert('Cupom criado com sucesso!');
      setNewCoupon({ code: '', discount_percent: 10, max_uses: 100 });
      fetchCoupons();
    } catch (err) { alert('Erro ao criar cupom: ' + err.message); } 
    finally { setIsSavingCoupon(false); }
  };

  const handleToggleCoupon = async (id, currentStatus) => {
    try {
      const { error } = await supabase.from('coupons').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      fetchCoupons();
    } catch (err) { alert('Erro ao atualizar cupom: ' + err.message); }
  };

  // --- PEDIDOS E GERAL ---
  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsUpdatingOrder(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/atualizar-pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
        // Alterado para enviar o status logístico, protegendo o status do mercado pago
        body: JSON.stringify({ orderId: selectedOrder.id, logisticsStatus: logisticsStatus, trackingCode: trackingCode }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);

      alert("Pedido atualizado com sucesso!");
      setSelectedOrder(null);
      fetchDashboardData(); 
    } catch (error) { alert("Erro ao atualizar pedido: " + error.message); } 
    finally { setIsUpdatingOrder(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { alert('Erro ao logar: ' + error.message); setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setConfig(null);
    setConfigEstoque(null);
    setIsAdmin(false);
  };

  // --- CONFIGURAÇÕES DE LAYOUT (site_config) ---
  const fetchConfigLayout = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('site_config').select('key, value');
    if (!error && data) {
      const configObj = data.reduce((acc, item) => { acc[item.key] = item.value; return acc; }, {});
      setConfig(configObj);
    }
    setLoading(false);
  };

  const handleUpdateLayout = async (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value })); 
    
    // Injetamos a section 'geral' para satisfazer a regra de NOT NULL do seu banco
    const { error } = await supabase
      .from('site_config')
      .upsert([{ key, value: String(value), section: 'geral' }], { onConflict: 'key' });
      
    if (error) alert('Erro ao salvar config do site: ' + error.message);
  };

  // --- CONFIGURAÇÕES DE ESTOQUE (config_estoque) ---
  const fetchConfigEstoque = async () => {
    const { data, error } = await supabase.from('config_estoque').select('key, value');
    if (!error && data) {
      const configObj = data.reduce((acc, item) => { acc[item.key] = item.value; return acc; }, {});
      setConfigEstoque(configObj);
    }
  };

  const openOptionsModal = () => {
    setLocalOptions({
      opt_categorias: configEstoque?.opt_categorias || '',
      opt_tamanhos: configEstoque?.opt_tamanhos || '',
      opt_packs: configEstoque?.opt_packs || '',
      opt_drops: configEstoque?.opt_drops || ''
    });
    setIsOptionsModalOpen(true);
  };

  const handleSaveAllOptions = async (e) => {
    e.preventDefault();
    setIsSavingOptions(true);
    try {
      const payload = Object.keys(localOptions).map(key => ({
        key: key,
        value: String(localOptions[key])
      }));
      
      const { error } = await supabase.from('config_estoque').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      
      setConfigEstoque(localOptions);
      alert("Atributos salvos com sucesso!");
      setIsOptionsModalOpen(false);
    } catch (err) { 
      alert("Erro ao salvar os atributos: " + err.message); 
    } finally { 
      setIsSavingOptions(false); 
    }
  };

  // --- UPLOADS MÚLTIPLOS E SIMPLES ---
  const handleModalUpload = async (event, bucket, folder, setFormState, fieldName) => {
    try {
      setUploading(true);
      const files = Array.from(event.target.files);
      if (files.length === 0) return;

      let uploadedUrls = [];

      for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${cleanName}`;
          const filePath = `${folder}/${fileName}`;

          const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { cacheControl: '31536000', upsert: false });
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
          uploadedUrls.push(publicUrlData.publicUrl);
      }

      setFormState(prev => {
        // Se for PRODUTO, acumula as URLs separando por vírgula
        if (fieldName === 'url_foto' && bucket === 'fotos' && folder === 'produtos') {
          const currentUrls = prev[fieldName] ? prev[fieldName].trim() : '';
          const newUrlsStr = uploadedUrls.join(', ');
          return { ...prev, [fieldName]: currentUrls ? `${currentUrls}, ${newUrlsStr}` : newUrlsStr };
        }
        
        // Se for PACK ou DOCUMENTO, apaga o anterior e substitui pelo novo
        return { ...prev, [fieldName]: uploadedUrls[0] };
      });

    } catch (error) { 
      alert('Erro no upload: ' + error.message); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleImageUpload = async (event, key) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${key}_${Math.random()}.${fileExt}`;
      let folder = 'geral';
      if (key === 'hero_img') folder = 'banner';
      else if (key === 'edital_img') folder = 'editorial';
      else if (key.startsWith('img_')) folder = 'cards';

      const filePath = `${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('site_assets').upload(filePath, file, { cacheControl: '31536000', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('site_assets').getPublicUrl(filePath);
      await handleUpdateLayout(key, publicUrlData.publicUrl);
    } catch (error) { alert('Erro no upload: ' + error.message); } 
    finally { setUploading(false); }
  };

  const exportCSV = (dataList, filename, headers, mapRow) => {
    if (!dataList || dataList.length === 0) return alert('Nenhum dado para exportar.');
    const rows = dataList.map(mapRow);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportNewsletterCSV = () => exportCSV(newsletterList, "leads_newsletter_bruto.csv", ['Nome', 'Email', 'Data de Inscrição'], (item) => [item.nome, item.email, new Date(item.created_at).toLocaleDateString('pt-BR')]);
  const exportCustomersCSV = () => exportCSV(customersList, "usuarios_cadastrados.csv", ['Nome', 'Email', 'Telefone', 'CPF', 'Data de Cadastro'], (item) => [item.nome || 'N/A', item.email || 'N/A', item.telefone || 'N/A', item.cpf || 'N/A', new Date(item.created_at).toLocaleDateString('pt-BR')]);
  
  const exportMalaDiretaUnica = async () => {
    try {
      const { data, error } = await supabase.from('vw_mala_direta').select('*');
      if (error) throw error;
      exportCSV(data, "mala_direta_unica.csv", ['Nome', 'Email', 'Telefone', 'Origem'], (item) => [item.nome || 'N/A', item.email, item.telefone || 'N/A', item.origem]);
    } catch (err) { alert('Erro ao exportar mala direta: ' + err.message); }
  };

  if (authLoading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-600 font-sans text-sm tracking-widest uppercase">Verificando credenciais...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-2xl border border-stone-200 shadow-sm w-full max-w-md">
          <h1 className="text-2xl font-semibold text-stone-900 mb-2 text-center tracking-tight">Painel Executivo</h1>
          <p className="text-sm text-stone-500 mb-8 text-center">Acesso restrito à gestão da loja.</p>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all" />
            </div>
            <button type="submit" disabled={authLoading} className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-4 px-4 rounded-lg transition-colors mt-4 disabled:opacity-50">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (session && !isAdmin) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-2xl border border-stone-200 shadow-sm w-full max-w-md text-center">
          <span className="material-symbols-outlined text-4xl text-rose-600 mb-4 block">lock</span>
          <h1 className="text-2xl font-semibold text-stone-900 mb-2 tracking-tight">Acesso Negado</h1>
          <p className="text-sm text-stone-500 mb-8">Esta conta não possui privilégios administrativos.</p>
          <button onClick={handleLogout} className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-4 px-4 rounded-lg transition-colors">
            Sair e Voltar
          </button>
        </div>
      </div>
    );
  }

  if (loading || !config || !configEstoque) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-600 font-sans text-sm tracking-widest uppercase">Carregando painel...</div>;

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const dynCatList = parseOptionsArray(configEstoque?.opt_categorias, ['Blusas', 'Calças', 'Vestidos']);
  const dynTamList = parseOptionsArray(configEstoque?.opt_tamanhos, ['P', 'M', 'G', 'U']);
  const dynPacksList = parseOptionsArray(configEstoque?.opt_packs, []);
  const dynDropsList = parseOptionsArray(configEstoque?.opt_drops, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans pb-10 relative">
      
      {/* Modal de Gestão de Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xl w-full max-w-md relative">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-xl font-bold mb-1">Atualizar Pedido #{selectedOrder.id}</h3>
            <p className="text-xs text-stone-500 uppercase tracking-widest mb-6">Cliente: {selectedOrder.customers?.nome}</p>

            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Status do Pagamento (API)</label>
                <input 
                  type="text" 
                  disabled 
                  value={orderStatus || 'N/A'} 
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg px-4 py-3 text-stone-500 uppercase font-bold text-xs cursor-not-allowed" 
                />
                <p className="text-[10px] text-stone-400 mt-1">Este status é gerenciado automaticamente pelo Mercado Pago.</p>
              </div>

              <hr className="border-stone-200 my-4" />

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Status Logístico (Seu Controle)</label>
                <select value={logisticsStatus} onChange={(e) => setLogisticsStatus(e.target.value)} className="w-full bg-white border border-stone-300 rounded-lg px-4 py-3 text-stone-900 outline-none cursor-pointer font-medium">
                  <option value="pendente">Pendente (Aguardando Pagamento)</option>
                  <option value="separando">Separando Pack</option>
                  <option value="enviado">Enviado com Rastreio</option>
                  <option value="entregue">Entregue ao Cliente</option>
                </select>
                <p className="text-[10px] text-stone-400 mt-2">Alterar para "Separando Pack" ou "Enviado" disparará um e-mail automático ao cliente.</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Código de Rastreio</label>
                <input type="text" placeholder="Ex: AB123456789BR" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 outline-none" />
              </div>
              
              <button type="submit" disabled={isUpdatingOrder} className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-4 px-4 rounded-lg transition-colors mt-4 disabled:opacity-50 shadow-lg">
                {isUpdatingOrder ? 'Processando e Enviando...' : 'Salvar Alterações e Notificar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Produtos (Acervo) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-stone-900">{editingProduct ? 'Editar Peça' : 'Nova Peça'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-stone-400 hover:text-stone-900"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 flex-1">
              <form id="product-form" onSubmit={handleSaveProduct} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Nome da Peça</label>
                    <input type="text" required value={productForm.nome} onChange={(e) => setProductForm({...productForm, nome: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Descrição (Tecido, detalhes)</label>
                    <textarea rows="2" required value={productForm.descricao} onChange={(e) => setProductForm({...productForm, descricao: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Categoria</label>
                    <select value={productForm.categoria} onChange={(e) => setProductForm({...productForm, categoria: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none">
                      {dynCatList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Tamanho</label>
                    <select value={productForm.tamanho} onChange={(e) => setProductForm({...productForm, tamanho: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none">
                      {dynTamList.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Marca</label>
                    <input type="text" placeholder="Ex: Zara" value={productForm.marca} onChange={(e) => setProductForm({...productForm, marca: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Status</label>
                    <select value={productForm.status} onChange={(e) => setProductForm({...productForm, status: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none">
                      <option value="disponivel">Disponível</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Vincular a Pack</label>
                    <select value={productForm.pack || ''} onChange={(e) => setProductForm({...productForm, pack: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none text-sm">
                      <option value="">(Nenhum Pack)</option>
                      {dynPacksList.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Vincular a Drop</label>
                    <select value={productForm.drop || ''} onChange={(e) => setProductForm({...productForm, drop: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none text-sm">
                      <option value="">(Nenhum Drop)</option>
                      {dynDropsList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <hr className="border-stone-200" />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Preço Venda (R$)</label>
                    <input type="number" step="0.01" required value={productForm.preco} onChange={(e) => setProductForm({...productForm, preco: parseFloat(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Custo Pago (R$)</label>
                    <input type="number" step="0.01" value={productForm.custo_pago} onChange={(e) => setProductForm({...productForm, custo_pago: parseFloat(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Custo Operacional</label>
                    <input type="number" step="0.01" value={productForm.custo_operacional} onChange={(e) => setProductForm({...productForm, custo_operacional: parseFloat(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none" />
                  </div>
                </div>
                <hr className="border-stone-200" />
                
                {/* CHECKBOX "MULTIPLE" ADICIONADO AQUI */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Fotos (URLs separadas por vírgula)</label>
                  <textarea rows="3" value={productForm.url_foto} onChange={(e) => setProductForm({...productForm, url_foto: e.target.value})} placeholder="https://...foto1.jpg, https://...foto2.jpg" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none resize-none text-xs" />
                  <div className="mt-3 relative overflow-hidden inline-block">
                    <button type="button" className="bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-bold uppercase tracking-widest py-2 px-4 rounded transition-colors disabled:opacity-50">
                      {uploading ? 'Enviando...' : 'Fazer Upload de Fotos'}
                    </button>
                    <input type="file" accept="image/*" multiple onChange={(e) => handleModalUpload(e, 'fotos', 'produtos', setProductForm, 'url_foto')} disabled={uploading} className="absolute left-0 top-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                </div>

                <div className="flex gap-6 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={productForm.is_active} onChange={(e) => setProductForm({...productForm, is_active: e.target.checked})} className="accent-stone-900" />
                    <span className="text-sm text-stone-700 font-medium">Ativo na Vitrine</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={productForm.is_destaque} onChange={(e) => setProductForm({...productForm, is_destaque: e.target.checked})} className="accent-stone-900" />
                    <span className="text-sm text-stone-700 font-medium">Destaque na Home</span>
                  </label>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-200 bg-stone-50 sticky bottom-0 z-10">
              <button type="submit" form="product-form" disabled={isSavingProduct} className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-4 px-4 rounded-lg transition-colors shadow-lg disabled:opacity-50">
                {isSavingProduct ? 'Salvando...' : 'Salvar Peça'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal da Tabela de Packs */}
      {isPacksListModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[45] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xl w-full max-w-5xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setIsPacksListModalOpen(false)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 z-10">
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="flex justify-between items-center mb-6 pr-8">
              <div>
                <h3 className="text-xl font-bold text-stone-900">Gerenciar Packs</h3>
                <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Configure os limites e a logística dos modelos de lote da loja.</p>
              </div>
              <button onClick={() => openPackForm()} className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">add</span> Pack
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-stone-200 rounded-xl bg-white">
              {packsList.length === 0 ? (
                 <div className="p-10 text-center text-stone-500 text-sm">Nenhum pack cadastrado no banco.</div>
              ) : (
                <table className="w-full text-left text-sm text-stone-600 whitespace-nowrap">
                  <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-widest text-stone-500 font-bold sticky top-0">
                    <tr>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Peças</th>
                      <th className="px-6 py-4">Peso</th>
                      <th className="px-6 py-4">Caixa</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {packsList.map((pack) => (
                      <tr key={pack.id} className={`hover:bg-stone-50/50 transition-colors ${!pack.is_active ? 'opacity-60' : ''}`}>
                        <td className="px-6 py-4 font-medium text-stone-900 truncate max-w-[200px]">{pack.nome}</td>
                        <td className="px-6 py-4">{pack.quantidade_pecas}</td>
                        <td className="px-6 py-4">{pack.peso} kg</td>
                        <td className="px-6 py-4 text-stone-400">{formatCurrency(pack.valor_embalagem)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {pack.is_active ? (
                              <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-emerald-100 text-emerald-700">Ativo</span>
                            ) : (
                              <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-stone-200 text-stone-600">Pausado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => openPackForm(pack)} className="text-xs uppercase tracking-widest font-bold text-primary hover:text-stone-900 underline">
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário de Packs */}
      {isPackModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-stone-900">{editingPack ? 'Editar Pack' : 'Novo Pack'}</h3>
              <button onClick={() => setIsPackModalOpen(false)} className="text-stone-400 hover:text-stone-900"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 flex-1">
              <form id="pack-form" onSubmit={handleSavePack} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Nome do Pack</label>
                    <input type="text" required placeholder="Ex: pack#5" value={packForm.nome} onChange={(e) => setPackForm({...packForm, nome: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Descrição Comercial</label>
                    <textarea rows="2" value={packForm.descricao} onChange={(e) => setPackForm({...packForm, descricao: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Quantidade de Peças</label>
                    <input type="number" required min="1" value={packForm.quantidade_pecas} onChange={(e) => setPackForm({...packForm, quantidade_pecas: parseInt(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Valor da Embalagem (R$)</label>
                    <input type="number" step="0.01" value={packForm.valor_embalagem} onChange={(e) => setPackForm({...packForm, valor_embalagem: parseFloat(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none" />
                  </div>
                </div>

                <hr className="border-stone-200" />
                <h4 className="text-sm font-bold text-stone-900">Dimensões e Logística (Correios/Jadlog)</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Peso (kg)</label>
                    <input type="number" step="0.1" value={packForm.peso} onChange={(e) => setPackForm({...packForm, peso: parseFloat(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-2 text-stone-900 outline-none text-center" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Comp. (cm)</label>
                    <input type="number" step="1" value={packForm.comprimento} onChange={(e) => setPackForm({...packForm, comprimento: parseFloat(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-2 text-stone-900 outline-none text-center" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Larg. (cm)</label>
                    <input type="number" step="1" value={packForm.largura} onChange={(e) => setPackForm({...packForm, largura: parseFloat(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-2 text-stone-900 outline-none text-center" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Alt. (cm)</label>
                    <input type="number" step="1" value={packForm.altura} onChange={(e) => setPackForm({...packForm, altura: parseFloat(e.target.value)})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-2 text-stone-900 outline-none text-center" />
                  </div>
                </div>

                <hr className="border-stone-200" />
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">Imagem de Capa (URL)</label>
                  <input type="text" value={packForm.url_foto} onChange={(e) => setPackForm({...packForm, url_foto: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none mb-2 text-xs" />
                  <div className="relative overflow-hidden inline-block">
                    <button type="button" className="bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-bold uppercase tracking-widest py-2 px-4 rounded transition-colors disabled:opacity-50">
                      {uploading ? 'Enviando...' : 'Fazer Upload de Capa'}
                    </button>
                    <input type="file" accept="image/*" onChange={(e) => handleModalUpload(e, 'fotos', 'packs', setPackForm, 'url_foto')} disabled={uploading} className="absolute left-0 top-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500">PDF do Edital (URL)</label>
                  <input type="text" value={packForm.pdf_url} onChange={(e) => setPackForm({...packForm, pdf_url: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-900 outline-none mb-2 text-xs" />
                  <div className="relative overflow-hidden inline-block">
                    <button type="button" className="bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-bold uppercase tracking-widest py-2 px-4 rounded transition-colors disabled:opacity-50">
                      {uploading ? 'Enviando...' : 'Fazer Upload de PDF'}
                    </button>
                    <input type="file" accept="application/pdf" onChange={(e) => handleModalUpload(e, 'packs_pdfs', 'documentos', setPackForm, 'pdf_url')} disabled={uploading} className="absolute left-0 top-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                </div>

                <div className="flex mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={packForm.is_active} onChange={(e) => setPackForm({...packForm, is_active: e.target.checked})} className="accent-stone-900" />
                    <span className="text-sm text-stone-700 font-medium">Lote Ativo na Vitrine</span>
                  </label>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-200 bg-stone-50 sticky bottom-0 z-10">
              <button type="submit" form="pack-form" disabled={isSavingPack} className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-4 px-4 rounded-lg transition-colors shadow-lg disabled:opacity-50">
                {isSavingPack ? 'Salvando...' : 'Salvar Pack'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Opções Base */}
      {isOptionsModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsOptionsModalOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-xl font-bold mb-1">Opções e Atributos</h3>
            <p className="text-xs text-stone-500 uppercase tracking-widest mb-6">Gerencie as categorias, tamanhos e tags da loja.</p>

            <form onSubmit={handleSaveAllOptions} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Categorias</label>
                 <p className="text-[10px] text-stone-400 mb-2">Separe as categorias por vírgula.</p>
                 <textarea rows="3" value={localOptions.opt_categorias} onChange={(e) => setLocalOptions({...localOptions, opt_categorias: e.target.value})} placeholder="Ex: Blusas, Calças, Vestidos" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 resize-none" />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Tamanhos</label>
                 <p className="text-[10px] text-stone-400 mb-2">Separe os tamanhos por vírgula.</p>
                 <textarea rows="3" value={localOptions.opt_tamanhos} onChange={(e) => setLocalOptions({...localOptions, opt_tamanhos: e.target.value})} placeholder="Ex: PP, P, M, G, XG" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 resize-none" />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Packs (Vínculos)</label>
                 <p className="text-[10px] text-stone-400 mb-2">Opções que aparecerão na hora de cadastrar peça.</p>
                 <textarea rows="3" value={localOptions.opt_packs} onChange={(e) => setLocalOptions({...localOptions, opt_packs: e.target.value})} placeholder="Ex: pack#5, pack#10" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 resize-none" />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Drops (Coleções)</label>
                 <p className="text-[10px] text-stone-400 mb-2">Coleções para vincular peças.</p>
                 <textarea rows="3" value={localOptions.opt_drops} onChange={(e) => setLocalOptions({...localOptions, opt_drops: e.target.value})} placeholder="Ex: Drop de Inverno" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 resize-none" />
              </div>
              
              <div className="md:col-span-2 pt-4 border-t border-stone-200">
                <button type="submit" disabled={isSavingOptions} className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-4 rounded-lg transition-colors disabled:opacity-50">
                  {isSavingOptions ? 'Salvando...' : 'Salvar Atributos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER DO ADMIN */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <img src="/logo.webp" alt="A Garimpeira" className="h-6 object-contain" />
            <button onClick={handleLogout} className="text-xs uppercase tracking-widest font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">logout</span> Sair
            </button>
          </div>
          
          <div className="flex space-x-8 -mb-px min-w-max">
            <button onClick={() => setActiveTab('metricas')} className={`pb-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'metricas' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('acervo')} className={`pb-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'acervo' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>Acervo</button>
            <button onClick={() => setActiveTab('pedidos')} className={`pb-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'pedidos' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>Pedidos</button>
            <button onClick={() => setActiveTab('clientes')} className={`pb-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'clientes' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>Clientes</button>
            <button onClick={() => setActiveTab('newsletter')} className={`pb-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'newsletter' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>Comunidade</button>
            <button onClick={() => setActiveTab('cupons')} className={`pb-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'cupons' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>Cupons</button>
            <button onClick={() => setActiveTab('layout')} className={`pb-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'layout' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>Site & Layout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* ABA: ACERVO (PRODUTOS, PACKS, OPÇÕES) */}
        {activeTab === 'acervo' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Gestão do Acervo</h2>
                <p className="text-sm text-stone-500 mt-1">Gerencie peças, modelos de lote e opções base da loja.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={openOptionsModal} className="bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-widest py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">tune</span> Opções
                </button>
                <button onClick={() => setIsPacksListModalOpen(true)} className="bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-widest py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">inventory_2</span> Packs
                </button>
                <button onClick={() => openProductForm()} className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-sm">add</span> Peça
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {produtosList.length === 0 ? (
                 <div className="p-10 text-center text-stone-500 text-sm">Nenhuma peça cadastrada no banco.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-stone-600 whitespace-nowrap">
                    <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-widest text-stone-500 font-bold">
                      <tr>
                        <th className="px-6 py-4">Nome da Peça</th>
                        <th className="px-6 py-4">Marca</th>
                        <th className="px-6 py-4">Tamanho</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4">Preço Venda</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {produtosList.map((prod) => (
                        <tr key={prod.id} className={`hover:bg-stone-50/50 transition-colors ${!prod.is_active ? 'opacity-60' : ''}`}>
                          <td className="px-6 py-4 font-medium text-stone-900 truncate max-w-[200px]" title={prod.nome}>{prod.nome}</td>
                          <td className="px-6 py-4">{prod.marca || '-'}</td>
                          <td className="px-6 py-4">{prod.tamanho || 'U'}</td>
                          <td className="px-6 py-4">{prod.categoria || '-'}</td>
                          <td className="px-6 py-4">{formatCurrency(prod.preco)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {prod.status === 'vendido' ? (
                                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-red-100 text-red-700">Vendido</span>
                              ) : (
                                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-emerald-100 text-emerald-700">Disponível</span>
                              )}
                              {!prod.is_active && <span className="text-[10px] uppercase font-bold text-stone-400 border border-stone-300 rounded px-1">Pausado</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => openProductForm(prod)} className="text-xs uppercase tracking-widest font-bold text-primary hover:text-stone-900 underline">
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: MÉTRICAS */}
        {activeTab === 'metricas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Desempenho da Loja</h2>
              
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-stone-400 text-sm">calendar_today</span>
                <select 
                  value={periodFilter} 
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="bg-white border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-widest rounded-lg px-3 py-2 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all cursor-pointer"
                >
                  <option value="ALL">Todo o período</option>
                  <option value="MES">Este mês</option>
                  <option value="30D">Últimos 30 dias</option>
                  <option value="7D">Últimos 7 dias</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Faturamento</span>
                <span className="text-3xl font-light text-stone-900">{formatCurrency(metrics.faturamento)}</span>
                <span className="text-xs text-stone-400 mt-auto pt-4">Baseado em pedidos pagos</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col relative overflow-hidden">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Lucro Bruto</span>
                <span className="text-3xl font-light text-stone-900">{formatCurrency(metrics.margemLucro)}</span>
                <span className="text-xs text-stone-400 mt-auto pt-4">Faturamento desc. o custo</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col bg-stone-50/50">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 flex items-center gap-1">
                  Custo em Estoque <span className="material-symbols-outlined text-[10px] text-stone-400" title="Ignora filtro de datas">info</span>
                </span>
                <span className="text-3xl font-light text-stone-900">{formatCurrency(metrics.custoEstoque)}</span>
                <span className="text-xs text-stone-400 mt-auto pt-4">Custo pago + operacional</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col bg-stone-50/50">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 flex items-center gap-1">
                  Potencial de Venda <span className="material-symbols-outlined text-[10px] text-stone-400" title="Ignora filtro de datas">info</span>
                </span>
                <span className="text-3xl font-light text-stone-900">{formatCurrency(metrics.valorVendaEstoque)}</span>
                <span className="text-xs text-stone-400 mt-auto pt-4">Preço total na vitrine</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col bg-stone-50/50">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 flex items-center gap-1">
                  Produtos <span className="material-symbols-outlined text-[10px] text-stone-400" title="Métrica de posição: ignora filtro de datas">info</span>
                </span>
                <span className="text-3xl font-light text-stone-900">{metrics.produtosAtivos}</span>
                <span className="text-xs text-stone-400 mt-auto pt-4">Peças ativas agora</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col bg-stone-50/50">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 flex items-center gap-1">
                  Packs <span className="material-symbols-outlined text-[10px] text-stone-400" title="Métrica de posição: ignora filtro de datas">info</span>
                </span>
                <span className="text-3xl font-light text-stone-900">{metrics.packsAtivos}</span>
                <span className="text-xs text-stone-400 mt-auto pt-4">Conjuntos ativos agora</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Novos Usuários</span>
                <span className="text-3xl font-light text-stone-900">{metrics.clientes}</span>
                <span className="text-xs text-stone-400 mt-auto pt-4">Cadastros no período</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Novos Leads</span>
                <span className="text-3xl font-light text-stone-900">{metrics.leads}</span>
                <span className="text-xs text-stone-400 mt-auto pt-4">Inscritos no período</span>
              </div>
            </div>
          </div>
        )}

        {/* ABA: PEDIDOS */}
        {activeTab === 'pedidos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Gestão de Pedidos</h2>
                <p className="text-sm text-stone-500 mt-1">Acompanhe as vendas e envie códigos de rastreio.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {ordersList.length === 0 ? (
                 <div className="p-10 text-center text-stone-500 text-sm">Nenhum pedido encontrado neste período.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-stone-600 whitespace-nowrap">
                    <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-widest text-stone-500 font-bold">
                      <tr>
                        <th className="px-6 py-4">ID do Pedido</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Valor Total</th>
                        <th className="px-6 py-4">Pagamento</th>
                        <th className="px-6 py-4">Logística</th>
                        <th className="px-6 py-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {ordersList.map((order) => (
                        <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-stone-900">{order.id}</td>
                          <td className="px-6 py-4 font-medium text-stone-900">{order.customers?.nome || 'N/A'}</td>
                          <td className="px-6 py-4">{formatCurrency(order.total_amount)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full 
                              ${order.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                                order.status === 'enviado' ? 'bg-blue-100 text-blue-700' : 
                                order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                'bg-stone-200 text-stone-600'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border 
                              ${order.logistics_status === 'enviado' || order.logistics_status === 'entregue' ? 'bg-stone-900 text-white border-stone-900' : 
                                order.logistics_status === 'separando' ? 'bg-stone-100 text-stone-800 border-stone-300' : 
                                'bg-transparent text-stone-400 border-stone-200'}`}>
                              {order.logistics_status || 'pendente'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setOrderStatus(order.status || '');
                                setLogisticsStatus(order.logistics_status || 'pendente');
                                setTrackingCode(order.tracking_code || '');
                              }}
                              className="text-xs uppercase tracking-widest font-bold text-stone-500 hover:text-stone-900 underline"
                            >
                              Gerenciar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Base de Clientes</h2>
                <p className="text-sm text-stone-500 mt-1">Usuários registrados de acordo com o filtro: <strong className="uppercase">{periodFilter === 'ALL' ? 'Todo o período' : periodFilter}</strong></p>
              </div>
              <button onClick={exportCustomersCSV} className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span>
                Exportar Base
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {customersList.length === 0 ? (
                 <div className="p-10 text-center text-stone-500 text-sm">Nenhum cliente cadastrado neste período.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-stone-600 whitespace-nowrap">
                    <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-widest text-stone-500 font-bold">
                      <tr>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">E-mail</th>
                        <th className="px-6 py-4">Telefone</th>
                        <th className="px-6 py-4">Data de Cadastro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {customersList.map((customer) => (
                        <tr key={customer.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-stone-900">{customer.nome || 'Não Informado'}</td>
                          <td className="px-6 py-4">{customer.email || 'Não Informado'}</td>
                          <td className="px-6 py-4">{customer.telefone || 'N/A'}</td>
                          <td className="px-6 py-4">{new Date(customer.created_at).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: NEWSLETTER */}
        {activeTab === 'newsletter' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Comunidade e Leads</h2>
                <p className="text-sm text-stone-500 mt-1">Mala direta unificada e lista bruta da newsletter.</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={exportNewsletterCSV} className="bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">list</span>
                    Apenas Newsletter
                  </button>
                  <button onClick={exportMalaDiretaUnica} className="bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined text-sm">download</span>
                    Exportar Mala Direta
                  </button>
                  <button 
                    onClick={handleSendNewsletter} 
                    disabled={isSendingNewsletter}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">campaign</span>
                    {isSendingNewsletter ? 'Disparando...' : 'Avisar Novas Peças'}
                  </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {newsletterList.length === 0 ? (
                 <div className="p-10 text-center text-stone-500 text-sm">Nenhum e-mail capturado neste período.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-stone-600 whitespace-nowrap">
                    <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-widest text-stone-500 font-bold">
                      <tr>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">E-mail</th>
                        <th className="px-6 py-4">Data da Inscrição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {newsletterList.map((lead) => (
                        <tr key={lead.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-stone-900">{lead.nome}</td>
                          <td className="px-6 py-4">{lead.email}</td>
                          <td className="px-6 py-4">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: CUPONS */}
        {activeTab === 'cupons' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Gestão de Cupons</h2>
              <p className="text-sm text-stone-500 mt-1">Crie e desative códigos de desconto para campanhas.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-6 text-stone-900">Novo Cupom</h3>
              <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Código</label>
                  <input type="text" placeholder="Ex: PRIMEIRACOMPRA" value={newCoupon.code} onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})} required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 uppercase outline-none focus:border-stone-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Desconto (%)</label>
                  <input type="number" min="1" max="100" value={newCoupon.discount_percent} onChange={(e) => setNewCoupon({...newCoupon, discount_percent: e.target.value})} required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 outline-none focus:border-stone-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Limite de Usos</label>
                  <input type="number" min="1" value={newCoupon.max_uses} onChange={(e) => setNewCoupon({...newCoupon, max_uses: e.target.value})} required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 outline-none focus:border-stone-400" />
                </div>
                <div className="md:col-span-4 mt-2">
                  <button type="submit" disabled={isSavingCoupon} className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg transition-colors disabled:opacity-50">
                    {isSavingCoupon ? 'Criando...' : 'Gerar Cupom'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {couponsList.length === 0 ? (
                 <div className="p-10 text-center text-stone-500 text-sm">Nenhum cupom gerado até o momento.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-stone-600 whitespace-nowrap">
                    <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-widest text-stone-500 font-bold">
                      <tr>
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Desconto</th>
                        <th className="px-6 py-4">Usos</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {couponsList.map((coupon) => {
                        const esgotado = coupon.used_count >= coupon.max_uses;
                        return (
                          <tr key={coupon.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-stone-900">{coupon.code}</td>
                            <td className="px-6 py-4">{coupon.discount_percent}% OFF</td>
                            <td className="px-6 py-4">
                              <span className={esgotado ? 'text-red-500 font-bold' : ''}>
                                {coupon.used_count} / {coupon.max_uses}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {coupon.is_active && !esgotado ? (
                                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-emerald-100 text-emerald-700">Ativo</span>
                              ) : (
                                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-stone-200 text-stone-600">Inativo</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)} className={`text-xs uppercase tracking-widest font-bold underline ${coupon.is_active ? 'text-red-500 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-800'}`}>
                                {coupon.is_active ? 'Desativar' : 'Reativar'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: LAYOUT E SITE */}
        {activeTab === 'layout' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-6 text-stone-900 tracking-tight">1. Banner Principal (1920x800 px)</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-stone-500">Imagem Atual</label>
                  {config.hero_img ? (
                    <img src={config.hero_img} alt="Hero" className="w-full h-48 object-cover rounded-xl mb-3 border border-stone-200" />
                  ) : (
                    <div className="w-full h-48 bg-stone-50 rounded-xl mb-3 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-xs font-bold tracking-widest uppercase">
                      Sem imagem
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'hero_img')} disabled={uploading} className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Selo / Tag</label>
                    <input type="text" value={config.hero_tag || ''} onChange={(e) => handleUpdateLayout('hero_tag', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Título</label>
                    <input type="text" value={config.hero_title || ''} onChange={(e) => handleUpdateLayout('hero_title', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Descrição Textual</label>
                  <textarea rows="2" value={config.hero_desc || ''} onChange={(e) => handleUpdateLayout('hero_desc', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all resize-none" />
                </div>

                <div className="bg-stone-50 p-6 rounded-xl border border-stone-200 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-stone-700">Botão Central de Ação</label>
                    <button onClick={() => handleUpdateLayout('hero_btn_visible', config.hero_btn_visible === 'true' ? 'false' : 'true')} className={`px-4 py-2 rounded-lg text-xs tracking-widest font-bold transition-colors ${config.hero_btn_visible === 'true' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500 hover:bg-stone-300'}`}>
                      {config.hero_btn_visible === 'true' ? 'ATIVADO' : 'DESATIVADO'}
                    </button>
                  </div>
                  
                  {config.hero_btn_visible === 'true' && (
                    <div>
                      <input type="text" placeholder="Texto do Botão" value={config.hero_btn_text || ''} onChange={(e) => handleUpdateLayout('hero_btn_text', e.target.value)} className="w-full bg-white border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all" />
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-6 text-stone-900 tracking-tight">2. Seção Edital (1280x720 px)</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-stone-500">Imagem Atual</label>
                  {config.edital_img ? (
                    <img src={config.edital_img} alt="Edital" className="w-full h-48 object-cover rounded-xl mb-3 border border-stone-200" />
                  ) : (
                    <div className="w-full h-48 bg-stone-50 rounded-xl mb-3 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-xs font-bold tracking-widest uppercase">
                      Sem imagem
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'edital_img')} disabled={uploading} className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Título</label>
                  <input type="text" value={config.edital_title || ''} onChange={(e) => handleUpdateLayout('edital_title', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-500">Descrição Textual</label>
                  <textarea rows="3" value={config.edital_desc || ''} onChange={(e) => handleUpdateLayout('edital_desc', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all resize-none" />
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-semibold mb-6 text-stone-900 tracking-tight">3. Banners de Categoria (600x800 px)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">Acervo</label>
                  {config.img_garimpo ? (
                    <img src={config.img_garimpo} alt="Garimpos" className="w-full h-48 object-cover rounded-xl border border-stone-200" />
                  ) : (
                    <div className="w-full h-48 bg-stone-50 rounded-xl border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-xs font-bold tracking-widest uppercase">
                      Vazio
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'img_garimpo')} disabled={uploading} className="block w-full text-xs text-stone-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer" />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">Drops</label>
                  {config.img_drops ? (
                    <img src={config.img_drops} alt="Drops" className="w-full h-48 object-cover rounded-xl border border-stone-200" />
                  ) : (
                    <div className="w-full h-48 bg-stone-50 rounded-xl border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-xs font-bold tracking-widest uppercase">
                      Vazio
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'img_drops')} disabled={uploading} className="block w-full text-xs text-stone-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer" />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">Packs</label>
                  {config.img_packs ? (
                    <img src={config.img_packs} alt="Packs" className="w-full h-48 object-cover rounded-xl border border-stone-200" />
                  ) : (
                    <div className="w-full h-48 bg-stone-50 rounded-xl border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-xs font-bold tracking-widest uppercase">
                      Vazio
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'img_packs')} disabled={uploading} className="block w-full text-xs text-stone-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer" />
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

const rootElement = document.getElementById('admin-root');
if (rootElement) {
  createRoot(rootElement).render(<Admin />);
}