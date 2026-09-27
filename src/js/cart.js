// src/js/cart.js

/**
 * Gerenciador de Estado do Carrinho (Breshop - Marketplace C2C)
 */
class CartService {
  constructor() {
    this.state = {
      items: JSON.parse(localStorage.getItem("breshop_cart")) || [],
    };
  }

  getItems() {
    return this.state.items;
  }

  addItem(product) {
    if (product.soldOut) {
      return { success: false, message: "Esta peça já foi vendida para outra pessoa!" };
    }

    if (this.isItemInCart(product.id)) {
      return { success: false, message: "Você já adicionou essa peça na sua sacola." };
    }

    // Armazena a peça garantindo que capturamos o seller_id para o futuro split
    this.state.items.push({ 
      id: product.id,
      title: product.title || product.nome,
      price: product.price || product.preco,
      image: product.image || (product.url_foto ? product.url_foto.split(',')[0].trim() : ''),
      seller_id: product.seller_id,
      quantity: 1 
    });
    
    this._saveAndNotify();

    return { success: true, message: "Peça adicionada com sucesso!" };
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
    return this.state.items.some((item) => item.id === productId);
  }

  _saveAndNotify() {
    localStorage.setItem("breshop_cart", JSON.stringify(this.state.items));
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