"use client";

import { useMemo, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { createCartSaleAction } from "@/lib/actions/pos";

type Product = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  stockQuantity: number;
};

type CartItem = {
  productId: string;
  quantity: number;
};

const paymentLabels = [
  { value: "PIX", label: "Pix" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
  { value: "DEBIT_CARD", label: "Cartão de débito" },
  { value: "CASH", label: "Dinheiro" },
  { value: "OTHER", label: "Outro" }
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export function CheckoutRegister({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    if (!normalizedSearch) {
      return true;
    }

    return `${product.name} ${product.sku}`.toLowerCase().includes(normalizedSearch);
  });
  const subtotal = cart.reduce((total, item) => {
    const product = productsById.get(item.productId);
    return total + (product?.priceCents ?? 0) * item.quantity;
  }, 0);

  function addProduct(productId: string) {
    const product = productsById.get(productId);
    if (!product) {
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.productId === productId);
      const currentQuantity = existingItem?.quantity ?? 0;
      if (currentQuantity >= product.stockQuantity) {
        return currentCart;
      }

      if (existingItem) {
        return currentCart.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...currentCart, { productId, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    const product = productsById.get(productId);
    if (!product) {
      return;
    }

    const nextQuantity = Math.max(0, Math.min(quantity, product.stockQuantity));
    setCart((currentCart) =>
      nextQuantity
        ? currentCart.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item))
        : currentCart.filter((item) => item.productId !== productId)
    );
  }

  return (
    <div className="checkout-shell">
      <section className="checkout-products" aria-label="Produtos">
        <div className="checkout-search field">
          <label htmlFor="checkout-search">Buscar produto</label>
          <input
            id="checkout-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou SKU"
          />
        </div>
        <div className="checkout-product-grid">
          {filteredProducts.map((product) => (
            <button
              className="checkout-product"
              key={product.id}
              type="button"
              onClick={() => addProduct(product.id)}
              disabled={product.stockQuantity <= 0}
            >
              <strong>{product.name}</strong>
              <span>{product.sku || "Sem SKU"}</span>
              <em>{formatMoney(product.priceCents)}</em>
              <small>Estoque: {product.stockQuantity}</small>
            </button>
          ))}
          {!filteredProducts.length ? <p className="muted">Nenhum produto encontrado.</p> : null}
        </div>
      </section>

      <SafeActionForm action={createCartSaleAction} className="checkout-cart" successMessage="Venda finalizada.">
        <div className="checkout-cart-head">
          <div>
            <p className="eyebrow">Venda atual</p>
            <h2>Caixa</h2>
          </div>
          <strong>{formatMoney(subtotal)}</strong>
        </div>

        <input type="hidden" name="items" value={JSON.stringify(cart)} />

        <div className="checkout-items">
          {cart.map((item) => {
            const product = productsById.get(item.productId);
            if (!product) {
              return null;
            }

            return (
              <div className="checkout-item" key={item.productId}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{formatMoney(product.priceCents)} un.</span>
                </div>
                <div className="checkout-quantity">
                  <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                    -
                  </button>
                  <input
                    aria-label={`Quantidade de ${product.name}`}
                    type="number"
                    min="1"
                    max={product.stockQuantity}
                    value={item.quantity}
                    onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
                  />
                  <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                    +
                  </button>
                </div>
                <strong>{formatMoney(product.priceCents * item.quantity)}</strong>
              </div>
            );
          })}
          {!cart.length ? <p className="muted">Adicione produtos para iniciar a venda.</p> : null}
        </div>

        <div className="checkout-fields">
          <div className="field">
            <label htmlFor="checkout-customer">Cliente</label>
            <input id="checkout-customer" name="customerName" type="text" placeholder="Opcional" />
          </div>
          <div className="field">
            <label htmlFor="checkout-payment">Pagamento</label>
            <select id="checkout-payment" name="paymentMethod" defaultValue="PIX">
              {paymentLabels.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="checkout-total">
          <span>Total</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>

        <div className="checkout-actions">
          <button className="button" type="button" onClick={() => setCart([])} disabled={!cart.length}>
            Limpar
          </button>
          <button className="button button-primary" type="submit" disabled={!cart.length}>
            Finalizar venda
          </button>
        </div>
      </SafeActionForm>
    </div>
  );
}
