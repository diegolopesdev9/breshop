import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // A página principal
        main: resolve(__dirname, 'index.html'),
        
        // A página de Admin
        admin: resolve(__dirname, 'admin.html'),
        
        // As páginas internas na pasta src/pages/
        contato: resolve(__dirname, 'src/pages/contato.html'),
        drops: resolve(__dirname, 'src/pages/drops.html'),
        faq: resolve(__dirname, 'src/pages/faq.html'),
        garimpos: resolve(__dirname, 'src/pages/garimpos.html'),
        minhaConta: resolve(__dirname, 'src/pages/minha-conta.html'),
        novaSenha: resolve(__dirname, 'src/pages/nova-senha.html'),
        packs: resolve(__dirname, 'src/pages/packs.html'),
        privacidade: resolve(__dirname, 'src/pages/privacidade.html'),
        sobre: resolve(__dirname, 'src/pages/sobre.html'),
        templateInstitucional: resolve(__dirname, 'src/pages/template-institucional.html'),
        termos: resolve(__dirname, 'src/pages/termos.html'),
        trocas: resolve(__dirname, 'src/pages/trocas.html'),
        peca: resolve(__dirname, 'src/pages/peca.html'),
      }
    }
  }
});