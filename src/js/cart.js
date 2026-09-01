// src/js/cart.js

/**
 * Gerenciador de Estado do Carrinho (Padrão Sênior - Event-Driven Architecture)
 */
class CartService {
  constructor() {
    this.state = {
      items: JSON.parse(localStorage.getItem("garimpeira_cart")) || [],
    };
  }

  getItems() {
    return this.state.items;
  }

  addItem(product) {
    if (product.soldOut) {
      return { success: false, message: "Este garimpo raro já foi vendido para outra pessoa extraordinária!" };
    }

    if (this.isItemInCart(product.id)) {
      return { success: false, message: "Você já agarrou esse garimpo! Ele já está na sua sacola." };
    }

    this.state.items.push({ ...product, quantity: 1 });
    this._saveAndNotify();

    return { success: true, message: "Garimpo adicionado com sucesso! Achou, é seu." };
  }

  addCustomPack(selectedProducts, basePack) {
    const targetQuantity = parseInt(basePack.badge) || 5;

    if (!selectedProducts || selectedProducts.length !== targetQuantity) {
      return { success: false, message: `O pack precisa ter exatamente ${targetQuantity} peças.` };
    }

    for (const p of selectedProducts) {
      if (this.isItemInCart(p.id)) {
        return { success: false, message: `A peça "${p.title}" já está na sua sacola em outro pedido. Remova-a de lá primeiro.` };
      }
    }

    // Calcula o preço dinamicamente somando o valor de cada peça escolhida
    const dynamicPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);

    const bundleItem = {
      id: basePack.id, // ID original do pack para o calcular-frete puxar a caixa correta
      title: basePack.title, // Ex: pack#10
      subtitle: "Pack Customizado",
      price: dynamicPrice, 
      image: selectedProducts[0].image || selectedProducts[0].url_foto, 
      is_custom_pack: true,
      custom_items: selectedProducts.map(p => p.id), 
      quantity: 1,
      category: 'packs' 
    };

    // Remove um pack idêntico se a pessoa tentar adicionar o mesmo tamanho duas vezes (proteção de UX)
    this.state.items = this.state.items.filter(item => item.id !== bundleItem.id);

    this.state.items.push(bundleItem);
    this._saveAndNotify();

    return { success: true, message: "Pack adicionado com sucesso!" };
  }

  removeItem(productId) {
    this.state.items = this.state.items.filter((item) => item.id !== productId);
    this._saveAndNotify();
  }

  getTotalPrice() {
    return this.state.items.reduce((total, item) => total + item.price, 0);
  }

  getItemCount() {
    return this.state.items.length;
  }

  isItemInCart(productId) {
    return this.state.items.some(
      (item) => item.id === productId || (item.is_custom_pack && item.custom_items && item.custom_items.includes(productId))
    );
  }

  _saveAndNotify() {
    localStorage.setItem("garimpeira_cart", JSON.stringify(this.state.items));
    const cartEvent = new CustomEvent("cart:updated", {
      detail: {
        items: this.state.items,
        total: this.getTotalPrice(),
        count: this.getItemCount(),
      },
    });
    window.dispatchEvent(cartEvent);
  }
}

export const cartService = new CartService();