import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import api, { getApiErrorMessage } from '../lib/api';
import { useCart } from '../context/CartContext';
import { formatPriceMAD } from '../lib/productPresentation';
import styles from './Checkout.module.css';

const initialFormData = {
  customerName: '',
  address: '',
  phone: '',
};

function formatMadAmount(value) {
  return formatPriceMAD({ price: value, currency: 'MAD' });
}

const Checkout = () => {
  const { t } = useLanguage();
  const { items, subtotal, clearCart } = useCart();
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCartEmpty = items.length === 0;
  const hasToken = typeof window !== 'undefined' && Boolean(window.localStorage.getItem('token'));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isCartEmpty) {
      setIsError(true);
      setMessage(t('checkout.emptyCart'));
      return;
    }

    if (!hasToken) {
      setIsError(true);
      setMessage(t('checkout.loginBeforeConfirm'));
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setMessage('');

    try {
      await api.post('/orders', {
        customerName: formData.customerName.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        paymentMethod: 'Paiement a la livraison',
        products: items.map((item) => ({
          productId: item.productId,
          product: item.productId,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
        })),
        total: subtotal,
      });

      clearCart();
      setFormData(initialFormData);
      setIsError(false);
      setMessage(t('checkout.orderSuccess'));
    } catch (error) {
      setIsError(true);
      setMessage(getApiErrorMessage(error, t('checkout.orderFailure')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{t('checkout.eyebrow')}</span>
          <h1>{t('checkout.title')}</h1>
          <p>{t('checkout.description')}</p>
        </div>

        <div className={styles.metaCard}>
          <div className={styles.metaRow}>
            <ShieldCheck size={18} strokeWidth={2.1} />
            <span>{t('checkout.paymentDelivery')}</span>
          </div>
          <strong>{formatMadAmount(subtotal)}</strong>
          <p>{t('checkout.itemsReady', { count: items.reduce((total, item) => total + item.quantity, 0) })}</p>
        </div>
      </div>

      <div className={styles.layout}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <h2>{t('checkout.shippingInfoTitle')}</h2>
            <p>{t('checkout.shippingInfoText')}</p>
          </div>

          {message ? (
            <div className={isError ? `${styles.notice} ${styles.noticeError}` : `${styles.notice} ${styles.noticeSuccess}`}>
              {message}
            </div>
          ) : null}

          {!hasToken ? (
            <p className={styles.inlineHint}>
              {t('checkout.loginHint')}{' '}
              <Link to="/login">{t('common.actions.login')}</Link>
            </p>
          ) : null}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="checkout-name">
              {t('checkout.name')}
            </label>
            <div className={styles.inputShell}>
              <UserRound className={styles.inputIcon} size={18} strokeWidth={2} />
              <input
                id="checkout-name"
                className={styles.input}
                type="text"
                name="customerName"
                placeholder={t('checkout.namePlaceholder')}
                value={formData.customerName}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="checkout-address">
              {t('checkout.address')}
            </label>
            <div className={styles.inputShell}>
              <MapPin className={styles.inputIcon} size={18} strokeWidth={2} />
              <textarea
                id="checkout-address"
                className={`${styles.input} ${styles.textarea}`}
                name="address"
                placeholder={t('checkout.addressPlaceholder')}
                value={formData.address}
                onChange={handleChange}
                rows={4}
                autoComplete="street-address"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="checkout-phone">
              {t('checkout.phone')}
            </label>
            <div className={styles.inputShell}>
              <Phone className={styles.inputIcon} size={18} strokeWidth={2} />
              <input
                id="checkout-phone"
                className={styles.input}
                type="tel"
                name="phone"
                placeholder={t('checkout.phonePlaceholder')}
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>
          </div>

          <button className={styles.submitButton} type="submit" disabled={isSubmitting || isCartEmpty}>
            <span>{isSubmitting ? t('common.actions.confirming') : t('common.actions.confirmOrder')}</span>
            <ArrowRight size={18} strokeWidth={2.2} />
          </button>
        </form>

        <aside className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <span>{t('checkout.summary')}</span>
            <strong>{formatMadAmount(subtotal)}</strong>
          </div>

          <div className={styles.summaryList}>
            {items.map((item) => (
              <div key={item.productId} className={styles.summaryItem}>
                <div className={styles.summaryItemMeta}>
                  <strong>{item.name}</strong>
                  <span>{item.quantity} x {formatMadAmount(item.price)}</span>
                </div>
                <p>{formatMadAmount(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Checkout;
