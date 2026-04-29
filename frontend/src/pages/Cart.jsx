import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatPriceMAD } from '../lib/productPresentation';
import styles from './Cart.module.css';

function formatMadAmount(value) {
  return formatPriceMAD({ price: value, currency: 'MAD' });
}

const Cart = () => {
  const { t } = useLanguage();
  const { items, subtotal, removeItem, updateQuantity, clearCart } = useCart();
  const hasItems = items.length > 0;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{t('cart.eyebrow')}</span>
          <h1>{t('cart.title')}</h1>
          <p>{t('cart.description')}</p>
        </div>

        <div className={styles.summaryCard}>
          <span>{t('common.misc.subtotal')}</span>
          <strong>{formatMadAmount(subtotal)}</strong>
          <p>{t('cart.itemsInCart', { count: items.reduce((total, item) => total + item.quantity, 0) })}</p>
        </div>
      </div>

      {hasItems ? (
        <div className={styles.layout}>
          <div className={styles.itemsPanel}>
            {items.map((item) => (
              <article key={item.productId} className={styles.itemCard}>
                <div className={styles.itemMedia}>
                  <img src={item.image} alt={item.name} loading="lazy" />
                </div>

                <div className={styles.itemContent}>
                  <div className={styles.itemMeta}>
                    <span>{item.brand}</span>
                    <strong>{item.name}</strong>
                  </div>

                  <div className={styles.itemFooter}>
                    <div className={styles.quantityControl} aria-label={t('cart.quantityFor', { name: item.name })}>
                      <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                        <Minus size={14} strokeWidth={2.2} />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                        <Plus size={14} strokeWidth={2.2} />
                      </button>
                    </div>

                    <div className={styles.itemActions}>
                      <strong>{formatMadAmount(item.price * item.quantity)}</strong>
                      <button type="button" className={styles.removeButton} onClick={() => removeItem(item.productId)}>
                        <Trash2 size={15} strokeWidth={2.1} />
                        {t('common.actions.remove')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className={styles.orderCard}>
            <div className={styles.orderMeta}>
              <span>{t('cart.recap')}</span>
              <strong>{formatMadAmount(subtotal)}</strong>
            </div>

            <p>{t('cart.localSaveText')}</p>

            <div className={styles.orderActions}>
              <Link className={styles.primaryButton} to="/checkout">
                <ShoppingBag size={17} strokeWidth={2.1} />
                {t('common.actions.placeOrder')}
              </Link>
              <button className={styles.secondaryButton} type="button" onClick={clearCart}>
                {t('common.actions.emptyCart')}
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h2>{t('cart.emptyTitle')}</h2>
          <p>{t('cart.emptyText')}</p>
          <Link className={styles.primaryButton} to="/shop">
            {t('common.actions.continueShopping')}
          </Link>
        </div>
      )}
    </section>
  );
};

export default Cart;
