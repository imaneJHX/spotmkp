import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Brush, Flower2, Gift, Package, ShieldCheck, Tag, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductRail from '../components/ProductRail';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import BrandMark from '../components/BrandMark';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';
import localProducts from '../data/products';
import brands from '../data/brands';
import { getBrandProductCount, getBrandShopHref, hasLocalBrandLogo } from '../lib/brands';
import { filterProductsByShopCategory } from '../lib/shopCategories';
import { formatDisplayText, formatPriceText, getPriceValueMAD } from '../lib/productPresentation';
import styles from './Home.module.css';

const FALLBACK_IMAGE = '/images/products/product-fallback.svg';
const HERO_IMAGE_PRIMARY = '/images/hero/homepage-hero.jpg';
const HERO_IMAGE_FALLBACK = '/images/hero/homepage-hero.jpg';
function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function getProductKey(product) {
  return String(product?.id ?? product?._id ?? product?.slug ?? product?.name ?? Math.random());
}

function getProductHref(product) {
  return `/product/${product?.id ?? product?._id ?? product?.slug ?? ''}`;
}

function getPriceSignalValue(product) {
  return Number(product?.priceValue ?? product?.price ?? 0) || 0;
}

function updateMetaTag(attributeName, attributeValue, content) {
  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function pickUniqueProducts(candidates, limit, excludedKeys = new Set()) {
  const picks = [];

  for (const product of candidates) {
    const key = getProductKey(product);

    if (!key || excludedKeys.has(key)) {
      continue;
    }

    excludedKeys.add(key);
    picks.push(product);

    if (picks.length >= limit) {
      break;
    }
  }

  return picks;
}

function getBestSellerScore(product) {
  const category = normalizeCategory(product?.category);
  const badge = String(product?.badge || '').toLowerCase();

  return (
    (product?.featured ? 22 : 0) +
    (badge.includes('gift') ? 14 : 0) +
    (badge.includes('trending') ? 12 : 0) +
    (category === 'makeup' ? 20 : 0) +
    (category === 'skincare' ? 16 : 0) +
    (category === 'fragrance' || category === 'perfume' || category === 'perfumes' ? 16 : 0) +
    Math.min(16, getPriceSignalValue(product) / 7)
  );
}

function getNewestScore(product) {
  const idValue = Number(product?.id ?? product?._id ?? 0);

  if (Number.isFinite(idValue) && idValue > 0) {
    return idValue;
  }

  return getPriceSignalValue(product);
}

function buildStructuredData(products, description, language) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Beauty Spot',
    description,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: formatPriceText(product?.name, product?.currency, language),
          brand: formatDisplayText(product?.brand || 'Beauty Spot'),
          image: product?.image || FALLBACK_IMAGE,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'MAD',
            price: String(getPriceValueMAD(product)),
            availability:
              Number(product?.stock || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${window.location.origin}${getProductHref(product)}`,
          },
        },
      })),
    },
  };
}

const Home = () => {
  const { t, language } = useLanguage();
  const hasLocalProducts = localProducts.length > 0;
  const [products, setProducts] = useState(hasLocalProducts ? localProducts : []);
  const [loading, setLoading] = useState(!hasLocalProducts);
  const [error, setError] = useState('');
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_PRIMARY);
  const homeTitle = t('home.title');
  const homeDescription = t('home.description');
  // Category pills removed as per redesign
  // Redesigned trust items (ships)
  const trustItems = useMemo(
    () => [
      { icon: Truck, title: 'Livraison offerte', subtitle: 'dès 350 DH' },
      { icon: Gift, title: 'Échantillons offerts', subtitle: 'sur chaque commande' },
      { icon: ShieldCheck, title: 'Paiement sécurisé', subtitle: '100% sécurisé' },
    ],
    [],
  );
  const categoryThemes = useMemo(
    () => ({
      nouveautes: {
        label: t('home.themes.newLabel'),
        description: t('home.themes.newDescription'),
        href: '/shop?sort=newest',
      },
      bestsellers: {
        label: t('home.themes.bestLabel'),
        description: t('home.themes.bestDescription'),
        href: '/shop',
      },
      makeup: {
        label: t('common.categories.makeup'),
        description: t('home.themes.makeupDescription'),
        href: '/shop?category=makeup',
      },
      skincare: {
        label: t('common.categories.skincare'),
        description: t('home.themes.skincareDescription'),
        href: '/shop?category=skincare',
      },
      perfumes: {
        label: t('common.categories.perfumes'),
        description: t('home.themes.perfumesDescription'),
        href: '/shop?category=perfumes',
      },
    }),
    [t],
  );
  const featuredBrands = useMemo(() => {
    return brands
      .filter((brand) => brand.featured && hasLocalBrandLogo(brand))
      .slice(0, 10)
      .map((brand) => ({
        ...brand,
        productCount: getBrandProductCount(products, brand.id),
      }));
  }, [products]);

  useEffect(() => {
    if (hasLocalProducts) {
      setProducts(localProducts);
      setLoading(false);
      setError('');
      return undefined;
    }

    let isActive = true;
    setLoading(true);

    api
      .get('/products')
      .then((response) => {
        if (!isActive) {
          return;
        }

        setProducts(response.data);
        setLoading(false);
        setError('');
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setLoading(false);
        setError(t('home.error'));
      });

    return () => {
      isActive = false;
    };
  }, [hasLocalProducts, t]);

  const { bestSellers, selectionCards } = useMemo(() => {
    const catalogue = Array.isArray(products) ? products.filter(Boolean) : [];
    const bestSellerProducts = pickUniqueProducts(
      [...catalogue].sort((left, right) => getBestSellerScore(right) - getBestSellerScore(left)),
      10
    );
    const newArrivalProducts = pickUniqueProducts(
      [...catalogue].sort((left, right) => getNewestScore(right) - getNewestScore(left)),
      8
    );
    const makeupProducts = pickUniqueProducts(filterProductsByShopCategory(catalogue, 'makeup'), 2);
    const skincareProducts = pickUniqueProducts(filterProductsByShopCategory(catalogue, 'skincare'), 2);
    const perfumeProducts = pickUniqueProducts(filterProductsByShopCategory(catalogue, 'perfumes'), 2);

    return {
      bestSellers: bestSellerProducts,
      newArrivals: newArrivalProducts,
      selectionCards: [
        {
          ...categoryThemes.nouveautes,
          sample: newArrivalProducts[0] || bestSellerProducts[0] || catalogue[0] || null,
        },
        {
          ...categoryThemes.bestsellers,
          sample: bestSellerProducts[0] || newArrivalProducts[0] || catalogue[0] || null,
        },
        {
          ...categoryThemes.makeup,
          sample: makeupProducts[0] || bestSellerProducts[1] || catalogue[1] || null,
        },
        {
          ...categoryThemes.skincare,
          sample: skincareProducts[0] || bestSellerProducts[2] || catalogue[2] || null,
        },
        {
          ...categoryThemes.perfumes,
          sample: perfumeProducts[0] || bestSellerProducts[3] || catalogue[3] || null,
        },
      ],
    };
  }, [categoryThemes, products]);

  useEffect(() => {
    document.title = homeTitle;

    const heroShareImage = `${window.location.origin}${heroImageSrc === HERO_IMAGE_PRIMARY ? HERO_IMAGE_FALLBACK : heroImageSrc}`;

    updateMetaTag('name', 'description', homeDescription);
    updateMetaTag('property', 'og:title', homeTitle);
    updateMetaTag('property', 'og:description', homeDescription);
    updateMetaTag('property', 'og:image', heroShareImage);
    updateMetaTag('name', 'twitter:title', homeTitle);
    updateMetaTag('name', 'twitter:description', homeDescription);
    updateMetaTag('name', 'twitter:image', heroShareImage);

    const existingSchema = document.head.querySelector('script[data-schema="beauty-spot-home"]');
    if (existingSchema) {
      existingSchema.remove();
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.schema = 'beauty-spot-home';
    script.text = JSON.stringify(buildStructuredData(bestSellers.slice(0, 8), homeDescription, language));
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [bestSellers, heroImageSrc, homeDescription, homeTitle, language]);

  return (
    <div className={styles.page}>
      <section
        className={styles.hero}
        style={{ '--hero-image': `url('${heroImageSrc}')` }}
        role="img"
        aria-label={t('home.heroImageLabel')}
      >
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>{t('home.heroEyebrow')}</p>

            <h1 className={styles.heroTitle}>
              <span>{t('home.heroTitleLine1')} {t('home.heroTitleLine2')}</span>
              <em>{t('home.heroTitleLine3')}</em>
            </h1>

            <p className={styles.heroDescription}>{t('home.heroDescription')}</p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} to="/shop">
                {t('common.actions.discoverShop')} <ArrowRight size={14} strokeWidth={2} />
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroImageFrame} aria-hidden="true">
              <span className={styles.heroImage} />
            </div>
            <div className={styles.trustShips}>
              {trustItems.map((item) => (
                <div key={item.title} className={styles.trustShip}>
                  <item.icon className={styles.trustShipIcon} size={20} strokeWidth={2} aria-hidden="true" />
                  <div className={styles.trustShipText}>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.selectionsSection}`}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>{t('home.selectionsEyebrow')}</p>
            <h2>{t('home.selectionsTitle')}</h2>
          </div>

          <Link className={styles.sectionButton} to="/shop">
            {t('common.actions.viewAll')}
          </Link>
        </div>

        <div className={styles.selectionRail} aria-label={t('home.selectionRailAria')}>
          {selectionCards.map((card, idx) => {
            // Use landscape demo images for each card
            const landscapeImages = [
              '/images/landscape/selection1.jpg',
              '/images/landscape/selection2.jpg',
              '/images/landscape/selection3.jpg',
              '/images/landscape/selection4.jpg',
              '/images/landscape/selection5.jpg',
            ];
            const landscapeImg = landscapeImages[idx % landscapeImages.length];
            return (
              <Link key={card.label} className={styles.selectionCard} to={card.href}>
                <div className={styles.selectionCardImageWrap}>
                  <img
                    className={styles.selectionCardImage}
                    src={landscapeImg}
                    alt={formatPriceText(card.sample?.name || card.label, card.sample?.currency, language)}
                    loading="lazy"
                  />
                </div>
                <div className={styles.selectionCardContent}>
                  <h3>{card.label}</h3>
                  <p>{card.description}</p>
                  <span className={styles.selectionCardBtn}>{t('common.actions.discover')}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={`${styles.section} ${styles.brandsSection}`}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>{t('home.brandsEyebrow')}</p>
            <h2>{t('home.brandsSubtitle')}</h2>
          </div>

          <Link className={styles.sectionButton} to="/marques">
            {t('common.actions.viewAll')}
          </Link>
        </div>

        <div className={styles.brandMarquee} aria-label={t('home.brandsAria')}>
          <div className={styles.brandGrid}>
            {[0, 1, 2, 3].map((groupIndex) => (
              <div key={`brand-group-${groupIndex}`} className={styles.brandSet} aria-hidden={groupIndex === 1}>
                {featuredBrands.map((brand) => (
                  <Link
                    key={`${brand.id}-${groupIndex}`}
                    className={styles.brandCard}
                    to={getBrandShopHref(brand.id)}
                    tabIndex={groupIndex === 1 ? -1 : undefined}
                  >
                    <div className={styles.brandMark}>
                      <BrandMark brand={brand} imageClassName={styles.brandImage} fallbackClassName={styles.brandInitials} />
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.bestHeader}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>{t('home.bestSellersEyebrow')}</p>
            <h2>{t('home.bestSellersTitle')}</h2>
          </div>
          <Link className={styles.sectionButton} to="/shop">
            {t('common.actions.viewAll')}
          </Link>
        </div>

        <ProductRail ariaLabel={t('home.bestSellersEyebrow')}>
          {loading
            ? Array.from({ length: 5 }, (_, index) => <ProductCardSkeleton key={`best-seller-${index}`} />)
            : bestSellers.map((product) => (
                <ProductCard key={getProductKey(product)} product={product} />
              ))}
        </ProductRail>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
};

export default Home;
