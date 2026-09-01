import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Busca os Produtos
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('produtos') 
    .select('*')
    .eq('is_active', true) 
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
  
  return data.map(itemDb => {
    // Blinda a leitura do booleano
    const destaque = itemDb.is_destaque === true || String(itemDb.is_destaque).toLowerCase() === 'true';
    
    // Tratamento de segurança da marca
    let marcaExibir = '';
    if (itemDb.marca && itemDb.marca.trim() !== '' && itemDb.marca.trim().toLowerCase() !== 'sem marca') {
      marcaExibir = itemDb.marca.trim();
    }

    return {
      id: String(itemDb.id),
      title: itemDb.nome || '',
      subtitle: itemDb.descricao || '',
      price: Number(itemDb.preco) || 0,
      image: itemDb.url_foto ? itemDb.url_foto.split(',')[0].trim() : '', 
      images: itemDb.url_foto ? itemDb.url_foto.split(',').map(url => url.trim()) : [], 
      category: itemDb.categoria ? itemDb.categoria.toLowerCase() : 'todos',
      size: itemDb.tamanho || '', 
      brand: marcaExibir, // A nova propriedade enviada para a UI
      soldOut: itemDb.status === 'vendido',
      badge: itemDb.status !== 'disponivel' ? itemDb.status.toUpperCase() : '',
      pack: itemDb.pack || '', 
      drop: itemDb.drop || '',
      isDestaque: destaque 
    };
  });
}

// 2. Busca os Packs consolidados
export async function fetchPacks() {
  const { data, error } = await supabase
    .from('packs') 
    .select('*')
    .eq('is_active', true) 
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar packs:', error);
    return [];
  }
  
  return data.map(itemDb => {
    return {
      id: String(itemDb.id),
      title: itemDb.nome || '',
      subtitle: `${itemDb.quantidade_pecas || 0} peças exclusivas`,
      price: Number(itemDb.preco_venda) || Number(itemDb.custo_total) || 0,
      image: itemDb.url_foto || '',
      category: 'packs',
      size: '', 
      brand: '', // Packs nunca terão marca específica
      soldOut: false,
      badge: itemDb.quantidade_pecas ? `${itemDb.quantidade_pecas} PEÇAS` : 'PACK',
      pack: itemDb.nome, 
      drop: '',
      pdf_url: itemDb.pdf_url || '' 
    };
  });
}