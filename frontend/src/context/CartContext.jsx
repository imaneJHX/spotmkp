import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { formatDisplayText, formatPriceText, getPriceValueMAD } from '../lib/productPresentation';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'beauty-spot-cart';
const FALLBACK_IMAGE = '/images/products/product-fallback.svg';

function getProductKey(product) {
  return String(product?._id ?? product?.id ?? product?.slug ?? product?.name ?? '').trim();
}

function normalizeStoredCartItem(item) {
  const productId = String(item?.productId || '').trim();
  const quantity = Number(item?.quantity);
  const price = Number(item?.price);

  if (!productId) {
    return null;
  }

  return {
    productId,
    name: formatPriceText(item?.name || 'Produit Beauty Spot', 'MAD'),
    brand: formatDisplayText(item?.brand || 'Beauty Spot') || 'Beauty Spot',
    image: String(item?.image || FALLBACK_IMAGE).trim() || FALLBACK_IMAGE,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
  };
}

function normalizeProductForCart(product, quantity = 1) {
  const productId = getProductKey(product);
  const price = getPriceValueMAD(product);

  if (!productId) {
    return null;
  }

  return normalizeStoredCartItem({
    productId,
    name: product?.name,
    brand: product?.brand,
    image: product?.image || product?.images?.[0] || FALLBACK_IMAGE,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    quantity,
  });
}

function readStoredCartItems() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map(normalizeStoredCartItem).filter(Boolean);
  } catch {
    return [];
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const incomingItem = action.payload;

      if (!incomingItem) {
        return state;
      }

      const existingItem = state.items.find((item) => item.productId === incomingItem.productId);

      if (!existingItem) {
        return {
          ...state,
          items: [...state.items, incomingItem],
          lastAddedItem: incomingItem,
          lastActionId: state.lastActionId + 1,
        };
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === incomingItem.productId
            ? { ...item, quantity: item.quantity + incomingItem.quantity }
            : item,
        ),
        lastAddedItem: {
          ...existingItem,
          quantity: existingItem.quantity + incomingItem.quantity,
        },
        lastActionId: state.lastActionId + 1,
      };
    }
    case 'remove':
      return {
        ...state,
        items: state.items.filter((item) => item.productId !== action.payload),
      };
    case 'update':
      return {
        ...state,
        items: state.items
          .map((item) =>
            item.productId === action.payload.productId
              ? { ...item, quantity: action.payload.quantity }
              : item,
          )
          .filter((item) => item.quantity > 0),
      };
    case 'clear':
      return {
        ...state,
        items: [],
      };
    default:
      return state;
  }
}

function getInitialState() {
  return {
    items: readStoredCartItems(),
    lastAddedItem: null,
    lastActionId: 0,
  };
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, getInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const value = useMemo(() => {
    const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = state.items.reduce((total, item) => total + item.price * item.quantity, 0);

    return {
      items: state.items,
      itemCount,
      subtotal,
      lastAddedItem: state.lastAddedItem,
      lastActionId: state.lastActionId,
      addItem: (product, quantity = 1) => {
        const normalizedItem = normalizeProductForCart(product, quantity);
        dispatch({ type: 'add', payload: normalizedItem });
      },
      removeItem: (productId) => {
        dispatch({ type: 'remove', payload: productId });
      },
      updateQuantity: (productId, quantity) => {
        const nextQuantity = Number(quantity);
        dispatch({
          type: 'update',
          payload: {
            productId,
            quantity: Number.isInteger(nextQuantity) ? nextQuantity : 1,
          },
        });
      },
      clearCart: () => {
        dispatch({ type: 'clear' });
      },
    };
  }, [state.items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider.');
  }

  return context;
}
