import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Heart, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import api from '../lib/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { featuredBrandSpotlight } from '../data/beautyEditorial';
import localProducts from '../data/products';
import { formatCategoryLabel, formatDisplayText, formatPriceMAD, formatPriceText } from '../lib/productPresentation';
import styles from './Product.module.css';

const FALLBACK_IMAGE = '/images/products/product-fallback.svg';

const Product = () => {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [product, setProduct] = useState({});
  const [error, setError] = useState('');
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    const localProduct = localProducts.find((item) => String(item.id) === String(id));
    if (localProduct) {
      setProduct(localProduct);
      setError('');
      return undefined;
    }

    let isActive = true;

    api
      .get(`/products/${id}`)
      .then((res) => {
        if (isActive) {
          setProduct(res.data);
          setError('');
        }
      })
      .catch(() => {
        if (isActive) {
          setError(t('product.loadError'));
        }
      });

    return () => {
      isActive = false;
    };
  }, [id, t]);

  const benefitChips = useMemo(() => {
    const category = String(product.category || 'beauty').trim().toLowerCase();
    const base = {
      makeup: t('product.benefits.makeup'),
      skincare: t('product.benefits.skincare'),
      fragrance: t('product.benefits.fragrance'),
      haircare: t('product.benefits.haircare'),
      bodycare: t('product.benefits.bodycare'),
      tools: t('product.benefits.tools'),
      accessories: t('product.benefits.accessories'),
      gifts: t('product.benefits.gifts'),
    };

    return base[category] || t('product.benefits.default');
  }, [product.category, t]);

  const productName = formatPriceText(product.name, product.currency, language);
  const productBrand = formatDisplayText(product.brand || 'Beauty Spot') || 'Beauty Spot';
  const productDescription = formatPriceText(product.description || '', product.currency, language);

  const handleAddToCart = () => {
    addItem(product);
    showToast(t('product.addedToCart'));
  };

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to="/shop">
        <ArrowLeft size={16} strokeWidth={2.2} />
        {t('product.backToShop')}
      </Link>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.layout}>
        <div className={styles.mediaPanel}>
          <div className={styles.imageWrap}>
            <img src={product.image || product.images?.[0] || FALLBACK_IMAGE} alt={productName} />
          </div>
        </div>

        <div className={styles.detailsPanel}>
          <div className={styles.headerMeta}>
            <span>{productBrand}</span>
            <span>{formatCategoryLabel(product.category, language)}</span>
          </div>

          <h1>{productName}</h1>
          <p className={styles.description}>{productDescription}</p>

          <div className={styles.priceBlock}>
            <strong>{formatPriceMAD(product)}</strong>
            <span>{product.stock > 0 ? t('common.status.inStock') : t('common.status.restockSoon')}</span>
          </div>

          <div className={styles.benefitRow}>
            {benefitChips.map((chip) => (
              <span key={chip} className={styles.benefitChip}>
                {chip}
              </span>
            ))}
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryButton} type="button" onClick={handleAddToCart}>
              {t('common.actions.addToCart')}
            </button>
            <button className={styles.secondaryButton} type="button">
              <Heart size={16} strokeWidth={2.2} />
              {t('common.actions.save')}
            </button>
            {product.productUrl ? (
              <a className={styles.secondaryButton} href={product.productUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} strokeWidth={2.2} />
                {t('common.actions.seeOriginal')}
              </a>
            ) : null}
          </div>

          <div className={styles.serviceGrid}>
            <div className={styles.serviceCard}>
              <Truck size={18} strokeWidth={2.2} />
              <div>
                <strong>{t('product.services.fastTitle')}</strong>
                <p>{t('product.services.fastText')}</p>
              </div>
            </div>
            <div className={styles.serviceCard}>
              <ShieldCheck size={18} strokeWidth={2.2} />
              <div>
                <strong>{t('product.services.chosenTitle')}</strong>
                <p>{t('product.services.chosenText')}</p>
              </div>
            </div>
            <div className={styles.serviceCard}>
              <Sparkles size={18} strokeWidth={2.2} />
              <div>
                <strong>{t('product.services.giftTitle')}</strong>
                <p>{t('product.services.giftText')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.brandSection}>
        <div>
          <span className={styles.eyebrow}>{t('product.iconicEyebrow')}</span>
          <h2>{t('product.iconicTitle')}</h2>
        </div>

        <div className={styles.brandGrid}>
          {featuredBrandSpotlight.slice(0, 4).map((brand) => (
            <article key={brand.name} className={styles.brandCard}>
              <span>{brand.category}</span>
              <h3>{brand.name}</h3>
              <p>{brand.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Product;
