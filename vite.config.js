import { defineConfig } from 'vite';
import { resolve } from 'path';

const cleanUrlsPlugin = () => {
  const rewriteMiddleware = (req, res, next) => {
    // Ignora assets, arquivos estáticos e a raiz
    if (req.url === '/' || req.url.includes('.')) {
      return next();
    }
    
    const routes = {
      '/comprar': '/src/pages/comprar.html',
      '/lojinhas': '/src/pages/lojinhas.html',
      '/sobre': '/src/pages/sobre.html',
      '/contato': '/src/pages/contato.html',
      '/faq': '/src/pages/faq.html',
      '/trocas': '/src/pages/trocas.html',
      '/privacidade': '/src/pages/privacidade.html',
      '/termos': '/src/pages/termos.html',
      '/minha-conta': '/src/pages/minha-conta.html',
      '/nova-senha': '/src/pages/nova-senha.html',
      '/vender': '/src/pages/vender.html',
      '/produto': '/src/pages/produto.html',
      '/admin': '/admin.html'
    };

    const cleanPath = req.url.split('?')[0];

    // Tratamento dinâmico para as novas rotas de produto com slug
    const pathParts = cleanPath.split('/');
    if (pathParts.length > 2 && pathParts[1] === 'produto') {
      req.url = '/src/pages/produto.html';
      return next();
    }

    if (routes[cleanPath]) {
      req.url = req.url.replace(cleanPath, routes[cleanPath]);
    }

    next();
  };

  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use(rewriteMiddleware);
    },
    // FUNDAMENTAL: Ensina o servidor de BUILD (preview) a rotear corretamente
    configurePreviewServer(server) {
      server.middlewares.use(rewriteMiddleware);
    }
  };
};

export default defineConfig({
  plugins: [cleanUrlsPlugin()], 
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        contato: resolve(__dirname, 'src/pages/contato.html'),
        faq: resolve(__dirname, 'src/pages/faq.html'),
        comprar: resolve(__dirname, 'src/pages/comprar.html'),
        lojinhas: resolve(__dirname, 'src/pages/lojinhas.html'),
        minhaConta: resolve(__dirname, 'src/pages/minha-conta.html'),
        novaSenha: resolve(__dirname, 'src/pages/nova-senha.html'),
        privacidade: resolve(__dirname, 'src/pages/privacidade.html'),
        sobre: resolve(__dirname, 'src/pages/sobre.html'),
        templateInstitucional: resolve(__dirname, 'src/pages/template-institucional.html'),
        termos: resolve(__dirname, 'src/pages/termos.html'),
        trocas: resolve(__dirname, 'src/pages/trocas.html'),
        produto: resolve(__dirname, 'src/pages/produto.html'),
        vender: resolve(__dirname, 'src/pages/vender.html'),
      }
    }
  }
});