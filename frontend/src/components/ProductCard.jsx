import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatCategoryLabel, formatDisplayText, formatPriceMAD, formatPriceText } from '../lib/productPresentation';
import ProductPreviewDialog from './ProductPreviewDialog';
import styles from './ProductCard.module.css';

const FALLBACK_IMAGE = '/images/products/product-fallback.svg';
const WISHLIST_STORAGE_KEY = 'beauty-spot-wishlist';
const WISHLIST_UPDATED_EVENT = 'beauty-spot-wishlist-updated';

function getProductPath(product) {
  return `/product/${product.id ?? product._id}`;
}

function getWishlistKey(product) {
  return String(product?.id ?? product?._id ?? product?.slug ?? product?.name ?? '').trim();
}

function readWishlist() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue) ? parsedValue.map(String) : [];
  } catch {
    return [];
  }
}

function writeWishlist(nextWishlist) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(nextWishlist));
  window.dispatchEvent(new CustomEvent(WISHLIST_UPDATED_EVENT, { detail: nextWishlist }));
}

function getProductRating(product) {
  const baseScore = product?.featured ? 4.9 : 4.6;
  const priceSignal = Number(product?.priceValue ?? product?.price ?? 0) || 0;
  return Math.min(5, Math.max(4.2, baseScore + Math.min(0.3, priceSignal / 1000)));
}

function getCategoryToneClass(category) {
  const normalizedCategory = String(category || '').toLowerCase().replace(/[-_\s]+/g, ' ');

  if (/makeup|maquillage/.test(normalizedCategory)) {
    return styles.categoryMakeup;
  }

  if (/skin|soin/.test(normalizedCategory)) {
    return styles.categorySkincare;
  }

  if (/perfume|perfumes|fragrance|parfum/.test(normalizedCategory)) {
    return styles.categoryPerfume;
  }

  if (/mini/.test(normalizedCategory)) {
    return styles.categoryMini;
  }

  return styles.categoryDefault;
}

const ProductCard = ({ product, onAddToCart, onPreview }) => {
  const { t, language } = useLanguage();
  const initialImage = product.image || product.images?.[0] || FALLBACK_IMAGE;
  const [imageSrc, setImageSrc] = useState(initialImage);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { addItem } = useCart();
  const { showToast } = useToast();
  const wishlistKey = getWishlistKey(product);
  const productName = formatPriceText(product.name, product.currency, language);
  const productBrand = formatDisplayText(product.brand || 'Beauty Spot') || 'Beauty Spot';
  const categoryLabel = formatCategoryLabel(product.category, language);
  const categoryToneClass = getCategoryToneClass(product.category);
  const badgeLabel = formatPriceText(product.badge || (product.featured ? 'Featured' : ''), product.currency, language) || null;
  const priceText = formatPriceMAD(product);
  const priceParts = priceText.split(/\s+-\s+/).filter(Boolean);
  const isInStock = Number(product.stock || 0) > 0;
  const ratingValue = getProductRating(product);
  const isFragrance =
    ['fragrance', 'perfume', 'perfumes', 'parfum'].includes(String(product.category || '').toLowerCase()) ||
    /eau de|parfum|perfume|fragrance/i.test([product.name, product.category].filter(Boolean).join(' '));
  const hasPreview = typeof onPreview === 'function';
  const handlePreview = () => {
    if (hasPreview) {
      onPreview(product);
      return;
    }

    setIsPreviewOpen(true);
  };
  const detailLabel = t('common.actions.viewProduct');

  useEffect(() => {
    const syncWishlistState = () => {
      setIsWishlisted(Boolean(wishlistKey) && readWishlist().includes(wishlistKey));
    };

    syncWishlistState();
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlistState);
    window.addEventListener('storage', syncWishlistState);

    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlistState);
      window.removeEventListener('storage', syncWishlistState);
    };
  }, [wishlistKey]);

  useEffect(() => {
    setImageSrc(initialImage);
  }, [initialImage]);

  const handleAdd = () => {
    addItem(product);
    showToast(t('product.addedToCart'));
    onAddToCart?.(product);
  };

  const handleWishlistToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!wishlistKey) {
      return;
    }

    const nextWishlist = new Set(readWishlist());

    if (nextWishlist.has(wishlistKey)) {
      nextWishlist.delete(wishlistKey);
    } else {
      nextWishlist.add(wishlistKey);
    }

    writeWishlist([...nextWishlist]);
  };

  return (
    <article className={isFragrance ? `${styles.card} ${styles.cardFragrance}` : styles.card}>
      <div className={styles.mediaShell}>
        {hasPreview ? (
          <button
            className={isFragrance ? `${styles.mediaButton} ${styles.mediaButtonFragrance}` : styles.mediaButton}
            type="button"
            onClick={handlePreview}
            aria-label={t('productCard.preview', { name: productName })}
          >
            {badgeLabel ? <span className={styles.badge}>{badgeLabel}</span> : null}
            <span className={styles.imageGlow} aria-hidden="true" />
            <img
              className={isFragrance ? `${styles.image} ${styles.imageFragrance}` : styles.image}
              src={imageSrc}
              alt={productName}
              onError={() => setImageSrc(FALLBACK_IMAGE)}
              loading="lazy"
              decoding="async"
            />
          </button>
        ) : (
          <Link
            className={isFragrance ? `${styles.mediaLink} ${styles.mediaLinkFragrance}` : styles.mediaLink}
            to={getProductPath(product)}
            aria-label={t('productCard.viewName', { name: productName })}
          >
            {badgeLabel ? <span className={styles.badge}>{badgeLabel}</span> : null}
            <span className={styles.imageGlow} aria-hidden="true" />
            <img
              className={isFragrance ? `${styles.image} ${styles.imageFragrance}` : styles.image}
              src={imageSrc}
              alt={productName}
              onError={() => setImageSrc(FALLBACK_IMAGE)}
              loading="lazy"
              decoding="async"
            />
          </Link>
        )}

        <button
          className={isWishlisted ? `${styles.wishlistButton} ${styles.wishlistButtonActive}` : styles.wishlistButton}
          type="button"
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? t('productCard.removeFavorites') : t('productCard.addFavorites')}
          onClick={handleWishlistToggle}
        >
          <Heart size={16} strokeWidth={2.1} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.brandRow}>
          <span className={styles.brand}>{productBrand}</span>
          <span className={isInStock ? styles.stockPill : styles.stockPillMuted}>
            {isInStock ? t('common.status.inStock') : t('common.status.restock')}
          </span>
        </div>

        <div className={styles.metaRow}>
          <span className={`${styles.category} ${categoryToneClass}`}>{categoryLabel}</span>
          <span className={priceParts.length > 1 ? `${styles.price} ${styles.priceRange}` : styles.price}>
            {priceParts.length > 1 ? (
              <>
                <span>{priceParts[0]}</span>
                <span>{priceParts[1]}</span>
              </>
            ) : (
              priceText
            )}
          </span>
        </div>

        <div className={styles.ratingRow} aria-label={t('common.misc.ratingOutOfFive', { value: ratingValue.toFixed(1) })}>
          <div className={styles.stars}>
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={`${wishlistKey || productName}-star-${index}`}
                size={12}
                strokeWidth={1.8}
                fill={index < Math.round(ratingValue) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span className={styles.ratingValue}>{ratingValue.toFixed(1)}</span>
        </div>

        {hasPreview ? (
          <button
            className={styles.titleButton}
            type="button"
            onClick={handlePreview}
            aria-label={t('productCard.openPreview', { name: productName })}
          >
            <h3 className={styles.title}>{productName}</h3>
          </button>
        ) : (
          <Link className={styles.titleLink} to={getProductPath(product)}>
            <h3 className={styles.title}>{productName}</h3>
          </Link>
        )}

        <div className={styles.actions}>
          <button
            className={styles.cartButton}
            type="button"
            onClick={handleAdd}
            aria-label={t('productCard.addToCartName', { name: productName })}
          >
            <ShoppingBag size={14} strokeWidth={2.1} />
            {t('common.actions.addToCart')}
          </button>
          <button
            className={styles.linkButton}
            type="button"
            onClick={handlePreview}
            aria-label={t('productCard.detailedPreview', { name: productName })}
          >
            {detailLabel}
          </button>
        </div>
      </div>

      {!hasPreview ? (
        <ProductPreviewDialog
          product={product}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onAddToCart={onAddToCart}
        />
      ) : null}
    </article>
  );
};

export default ProductCard;
