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
import { getBrandProductCount, getBrandShopHref } from '../lib/brands';
import { filterProductsByShopCategory } from '../lib/shopCategories';
import { formatDisplayText, formatPriceText, getPriceValueMAD } from '../lib/productPresentation';
import styles from './Home.module.css';

const FALLBACK_IMAGE = '/images/products/product-fallback.svg';
const HERO_IMAGE_PRIMARY = '/images/hero/beauty-boutique-hero.avif';
const HERO_IMAGE_FALLBACK = '/images/hero/beauty-boutique-hero.avif';
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
  const categoryPills = useMemo(
    () => [
      { icon: Brush, label: t('common.categories.makeup'), href: '/shop?category=makeup' },
      { icon: ShieldCheck, label: t('common.categories.skincare'), href: '/shop?category=skincare' },
      { icon: Flower2, label: t('common.categories.perfumes'), href: '/shop?category=perfumes' },
      { icon: Package, label: t('common.categories.miniSize'), href: '/shop?category=mini-size' },
      { icon: Tag, label: t('common.categories.offers'), href: '/shop' },
    ],
    [t],
  );
  const trustItems = useMemo(
    () => [
      { icon: Truck, title: t('home.trust1Title'), subtitle: t('home.trust1Subtitle') },
      { icon: Gift, title: t('home.trust2Title'), subtitle: t('home.trust2Subtitle') },
      { icon: ShieldCheck, title: t('home.trust3Title'), subtitle: t('home.trust3Subtitle') },
    ],
    [t],
  );
  const categoryThemes = useMemo(
    () => ({
      nouveautes: {
        label: t('home.themes.newLabel'),
        description: t('home.themes.newDescription'),
        href: '/shop',
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
      .filter((brand) => brand.featured)
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
      <section className={styles.hero}>
        <div
          className={styles.heroMedia}
          role="img"
          aria-label={t('home.heroImageLabel')}
          style={{ backgroundImage: `url("${heroImageSrc}")` }}
        />

        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>{t('home.heroEyebrow')}</p>

          <h1 className={styles.heroTitle}>
            <span>{t('home.heroTitleLine1')}</span>
            <span>{t('home.heroTitleLine2')}</span>
            <em>{t('home.heroTitleLine3')}</em>
          </h1>

          <p className={styles.heroDescription}>{t('home.heroDescription')}</p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} to="/shop">
              {t('common.actions.discoverShop')} <ArrowRight size={14} strokeWidth={2} />
            </Link>
            <Link className={styles.secondaryButton} to="/shop?category=mini-size">
              {t('common.categories.miniSize')}
            </Link>
          </div>

          <div className={styles.categoryPills}>
            {categoryPills.map((pill) => (
              <Link key={pill.label} className={styles.categoryPill} to={pill.href}>
                <pill.icon size={13} strokeWidth={1.8} aria-hidden="true" />
                <span>{pill.label}</span>
              </Link>
            ))}
          </div>

          <div className={styles.trustCard}>
            {trustItems.map((item) => (
              <div key={item.title} className={styles.trustItem}>
                <item.icon className={styles.trustIcon} size={18} strokeWidth={1.8} aria-hidden="true" />
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
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
          {selectionCards.map((card) => (
            <Link key={card.label} className={styles.selectionCard} to={card.href}>
              <div className={styles.selectionCopy}>
                <h3>{card.label}</h3>
                <p>{card.description}</p>
                <span>{t('common.actions.discover')}</span>
              </div>

              {card.sample ? (
                <img
                  className={styles.selectionImage}
                  src={card.sample.image || card.sample.images?.[0] || FALLBACK_IMAGE}
                  alt={formatPriceText(card.sample.name, card.sample.currency, language)}
                  loading="lazy"
                />
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>{t('home.brandsEyebrow')}</p>
            <h2>{t('home.brandsTitle')}</h2>
            <p className={styles.sectionSubcopy}>{t('home.brandsSubtitle')}</p>
          </div>

          <Link className={styles.sectionButton} to="/marques">
            {t('common.actions.viewAll')}
          </Link>
        </div>

        <div className={styles.brandGrid} aria-label={t('home.brandsAria')}>
          {featuredBrands.map((brand) => (
            <Link key={brand.id} className={styles.brandCard} to={getBrandShopHref(brand.id)}>
              <span className={styles.brandBadge}>{t(`common.categories.${brand.category}`)}</span>
              <div className={styles.brandMark}>
                <BrandMark brand={brand} imageClassName={styles.brandImage} fallbackClassName={styles.brandInitials} />
              </div>
              <strong className={styles.brandName}>{brand.name}</strong>
              <span className={styles.brandMeta}>
                {brand.productCount > 0
                  ? t('home.brandProducts', { count: brand.productCount })
                  : t('home.brandDiscover')}
              </span>
            </Link>
          ))}
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
