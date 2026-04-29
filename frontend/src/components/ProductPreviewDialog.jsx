import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatCategoryLabel, formatDisplayText, formatPriceMAD, formatPriceText } from '../lib/productPresentation';
import styles from './ProductPreviewDialog.module.css';

const FALLBACK_IMAGE = '/images/products/product-fallback.svg';

function getPreviewText(product, language, t) {
  const fallbackText = t('preview.fallbackText', {
    brand: product.brand || 'Beauty Spot',
    category: formatCategoryLabel(product.category, language),
  });
  const formattedText = formatPriceText(product.description || fallbackText, product.currency, language)
    .replace(/\s+/g, ' ')
    .trim();
  const firstSentence = formattedText.split(/(?<=[.!?])\s+/)[0] || formattedText;

  if (firstSentence.length <= 118) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, 115).trimEnd()}...`;
}

function getProductRating(product) {
  const baseScore = product?.featured ? 4.9 : 4.6;
  const priceSignal = Number(product?.priceValue ?? product?.price ?? 0) || 0;
  return Math.min(5, Math.max(4.2, baseScore + Math.min(0.3, priceSignal / 1000)));
}

function getReviewCount(product) {
  const priceSignal = Number(product?.priceValue ?? product?.price ?? 0) || 0;
  return Math.max(18, Math.round(24 + priceSignal * 1.7));
}

function getOptionConfig(product) {
  const optionValues = product?.sizes || product?.shades || product?.variants || product?.options || [];

  if (!Array.isArray(optionValues) || optionValues.length === 0) {
    return null;
  }

  const labelKey = product?.sizes ? 'preview.format' : product?.shades ? 'preview.shade' : 'preview.selection';
  const values = optionValues
    .map((value) => {
      if (typeof value === 'string') {
        return value.trim();
      }

      if (value && typeof value === 'object') {
        return String(value.label || value.name || value.value || '').trim();
      }

      return '';
    })
    .filter(Boolean);

  if (values.length === 0) {
    return null;
  }

  return { labelKey, values };
}

const ProductPreviewDialog = ({ product, isOpen, onClose, onAddToCart }) => {
  const { t, language } = useLanguage();
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const initialImage = product?.image || product?.images?.[0] || FALLBACK_IMAGE;
  const [imageSrc, setImageSrc] = useState(initialImage);
  const optionConfig = getOptionConfig(product);
  const [selectedOption, setSelectedOption] = useState(optionConfig?.values?.[0] || '');
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    if (!product) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
      previousFocusRef.current?.focus?.();
    };
  }, [product, onClose]);

  useEffect(() => {
    if (!product) {
      return undefined;
    }

    setImageSrc(initialImage);
    setSelectedOption(optionConfig?.values?.[0] || '');
  }, [initialImage, optionConfig, product]);

  useEffect(() => {
    if (!product) {
      return undefined;
    }

    if (isOpen) {
      document.body.classList.add('modal-open');

      const animationFrame = window.requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });

      return () => {
        window.cancelAnimationFrame(animationFrame);
      };
    }

    document.body.classList.remove('modal-open');
    return undefined;
  }, [product, isOpen]);

  if (!product || !isOpen) {
    return null;
  }

  const productName = formatPriceText(product.name, product.currency, language);
  const productBrand = formatDisplayText(product.brand || 'Beauty Spot') || 'Beauty Spot';
  const previewText = getPreviewText(product, language, t);
  const ratingValue = getProductRating(product);
  const reviewCount = getReviewCount(product);

  const handleAddToCart = () => {
    addItem(product);
    showToast(t('product.addedToCart'));
    onAddToCart?.(product);
  };

  return createPortal(
    <div className={styles.portal} data-state={isOpen ? 'open' : 'closed'}>
      <button className={styles.backdrop} type="button" aria-label={t('preview.close')} onClick={onClose} />

      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button
          ref={closeButtonRef}
          className={styles.closeButton}
          type="button"
          aria-label={t('preview.closeFor', { name: productName })}
          onClick={onClose}
        >
          <X size={20} strokeWidth={2.1} />
        </button>

        <div className={styles.mediaPanel}>
          <img className={styles.image} src={imageSrc} alt={productName} onError={() => setImageSrc(FALLBACK_IMAGE)} />
        </div>

        <div className={styles.content}>
          <span className={styles.brand}>{productBrand}</span>

          <h2 id={titleId} className={styles.title}>
            {productName}
          </h2>

          <div className={styles.ratingRow} aria-label={t('common.misc.ratingOutOfFive', { value: ratingValue.toFixed(1) })}>
            <div className={styles.stars}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={`${productName}-preview-star-${index}`}
                  size={13}
                  strokeWidth={1.8}
                  fill={index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className={styles.ratingValue}>{ratingValue.toFixed(1)}</span>
            <span className={styles.reviewCount}>{t('common.misc.reviews', { count: reviewCount })}</span>
          </div>

          <p className={styles.price}>{formatPriceMAD(product)}</p>
          <p className={styles.description}>{previewText}</p>

          {optionConfig ? (
            <label className={styles.selectorGroup}>
              <span className={styles.selectorLabel}>{t(optionConfig.labelKey)}</span>
              <select
                className={styles.selector}
                value={selectedOption}
                onChange={(event) => setSelectedOption(event.target.value)}
              >
                {optionConfig.values.map((option) => (
                  <option key={`${productName}-${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className={styles.actions}>
            <button className={styles.cartButton} type="button" onClick={handleAddToCart}>
              <ShoppingBag size={14} strokeWidth={2.1} />
              {t('common.actions.addToCart')}
            </button>

            <Link className={styles.detailLink} to={`/product/${product.id ?? product._id}`} onClick={() => onClose?.()}>
              {t('common.actions.fullSheet')}
            </Link>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default ProductPreviewDialog;
