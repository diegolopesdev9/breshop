# A Garimpeira — Brechó

E-commerce performático para o brechó **A Garimpeira**, construído com Vanilla JavaScript ES6+, Vite e Tailwind CSS.

## Stack

| Tecnologia     | Uso                                      |
|----------------|------------------------------------------|
| **Vite 6**     | Bundler + dev server                     |
| **Tailwind 3** | Estilização via PostCSS (sem CDN)        |
| **PostCSS**    | Pipeline de CSS (tailwind + autoprefixer)|
| **Vanilla JS** | ES6 Modules — sem framework              |

## Arquitetura

```
artifacts/a-garimpeira/
├── index.html              # Entrada HTML + Google Fonts
├── vite.config.js          # Configuração do Vite
├── tailwind.config.js      # Tokens de design + paleta personalizada
├── postcss.config.js       # tailwindcss + autoprefixer
├── package.json
└── src/
    ├── css/
    │   └── main.css        # @tailwind + utilitários customizados
    ├── js/
    │   ├── main.js         # Ponto de entrada, renderização
    │   ├── cart.js         # Estado do carrinho + localStorage
    │   └── products.js     # Catálogo + trava de estoque único
    └── components/         # Seções modulares (uso futuro)
```

## Identidade Visual

### Paleta de Cores

| Nome                  | Hex       | Uso                        |
|-----------------------|-----------|----------------------------|
| `rosa-queimado`       | `#C4737A` | Destaques, hover           |
| `vermelho-cereja`     | `#A0192B` | CTAs, preços, títulos      |
| `creme-amanteigado`   | `#F5EDD6` | Background principal       |
| `marrom-cafe`         | `#4A2C1A` | Texto, header, footer      |
| `azul-petroleo`       | `#2D5F6B` | Informações, links         |

### Fontes

| Família       | Uso                     |
|---------------|-------------------------|
| **Shrikhand** | Títulos e logotipo      |
| **Montserrat**| Corpo de texto principal|
| **Poppins**   | Texto suave, labels     |

### Classes Utilitárias

- `.bg-xadrez` / `.bg-xadrez-sutil` — Padrão xadrez no fundo
- `.bg-kraft` — Textura de papel kraft
- `.sombra-polaroid` / `.sombra-polaroid-lg` — Sombras estilo polaroid
- `.cartao-polaroid` — Card com estética de foto polaroid
- `.borda-retro` / `.borda-retro-rosa` — Borda com sombra sólida retro
- `.badge-unico` — Badge "peça única"
- `.btn-primario` / `.btn-secundario` — Botões com estética do brechó
- `.input-campo` — Campo de formulário estilizado

## Lógica de Estoque Único

Cada peça do brechó é **única**. O módulo `cart.js` implementa uma trava:

```js
// Retorna { ok: false, motivo: "..." } se o item já está no carrinho
const resultado = cartState.adicionar(produto);
```

O módulo `products.js` expõe `estaDisponivel(id)` que verifica em tempo real se a peça já foi reservada, refletindo isso na UI.

## Scripts

```bash
pnpm dev      # Servidor de desenvolvimento
pnpm build    # Build para produção
pnpm serve    # Preview do build
```
