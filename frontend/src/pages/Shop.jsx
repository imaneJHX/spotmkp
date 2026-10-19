import React, { useEffect, useMemo, useState } from 'react';
import { BadgePercent, CheckCircle2, Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import localProducts from '../data/products';
import { filterProductsByBrand, getBrandById } from '../lib/brands';
import ProductCard from '../components/ProductCard';
import ProductPreviewDialog from '../components/ProductPreviewDialog';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import { useLanguage } from '../context/LanguageContext';
import {
  DEFAULT_SHOP_CATEGORY,
  SHOP_CATEGORIES,
  filterProductsByShopCategory,
  getShopCategories,
  getShopCategoryLabel,
} from '../lib/shopCategories';
import styles from './Shop.module.css';

function getProductKey(product) {
  return String(product.id ?? product._id ?? product.slug ?? product.name);
}

function parseCategoryParam(searchParams) {
  const rawValue = searchParams.get('category');
  const isValid = SHOP_CATEGORIES.some((category) => category.id === rawValue);

  return isValid ? rawValue : DEFAULT_SHOP_CATEGORY;
}

function parseBrandParam(searchParams) {
  const rawValue = searchParams.get('brand');
  const brand = rawValue ? getBrandById(rawValue) : null;
  return brand?.id || '';
}

function parseSortParam(searchParams) {
  return searchParams.get('sort') === 'newest' ? 'newest' : '';
}

function parseFeaturedParam(searchParams) {
  return searchParams.get('featured') === 'true';
}

function getProductOrderValue(product) {
  const numericId = Number(product?.id ?? product?._id ?? 0);
  return Number.isFinite(numericId) ? numericId : 0;
}

function isOfferProduct(product) {
  const badge = String(product?.badge || '').toLowerCase();
  const price = Number(product?.priceValue ?? product?.price ?? 0);

  return (
    badge.includes('under') ||
    badge.includes('sale') ||
    badge.includes('offer') ||
    badge.includes('deal') ||
    badge.includes('promo') ||
    badge.includes('discount') ||
    (Number.isFinite(price) && price > 0 && price <= 25)
  );
}

const SHOP_HERO_BACKGROUNDS = {
  default: '/images/hero/homepage-hero.jpg',
  newest: '/images/landscape/selection2.jpg',
  makeup: '/images/landscape/selection3.jpg',
  skincare: '/images/landscape/selection4.jpg',
  perfumes: '/images/landscape/selection5.jpg',
  'mini-size': '/images/landscape/selection1.jpg',
  offers: '/images/hero/offers-hero.jpg',
};

const Shop = () => {
  const { t, language } = useLanguage();
  const hasLocalProducts = localProducts.length > 0;
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(!hasLocalProducts);
  const [error, setError] = useState('');
  const [sourceStatus, setSourceStatus] = useState('loading');
  const [selectedCategory, setSelectedCategory] = useState(() => parseCategoryParam(searchParams));
  const [previewProduct, setPreviewProduct] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const selectedBrandId = parseBrandParam(searchParams);
  const selectedSort = parseSortParam(searchParams);
  const showFeaturedOffers = parseFeaturedParam(searchParams);
  const activeBrand = selectedBrandId ? getBrandById(selectedBrandId) : null;

  useEffect(() => {
    const nextCategory = parseCategoryParam(searchParams);

    if (nextCategory !== selectedCategory) {
      setSelectedCategory(nextCategory);
    }
  }, [searchParams, selectedCategory]);

  useEffect(() => {
    if (hasLocalProducts) {
      setProducts(localProducts);
      setLoading(false);
      setError('');
      setSourceStatus('local');
      return undefined;
    }

    let isActive = true;

    setLoading(true);
    api
      .get('/products')
      .then((res) => {
        if (isActive) {
          setProducts(res.data);
          setLoading(false);
          setError('');
          setSourceStatus('live');
        }
      })
      .catch(() => {
        if (isActive) {
          setLoading(false);
          setError(t('shop.errors.unavailable'));
          setSourceStatus('unavailable');
        }
      });

    return () => {
      isActive = false;
    };
  }, [hasLocalProducts, t]);

  const visibleProducts = useMemo(() => {
    const categoryProducts = filterProductsByShopCategory(products, selectedCategory);
    const brandProducts = selectedBrandId ? filterProductsByBrand(categoryProducts, selectedBrandId) : categoryProducts;
    const collectionProducts = showFeaturedOffers ? brandProducts.filter(isOfferProduct) : brandProducts;

    if (selectedSort === 'newest') {
      return [...collectionProducts].sort((firstProduct, secondProduct) => (
        getProductOrderValue(secondProduct) - getProductOrderValue(firstProduct)
      ));
    }

    return collectionProducts;
  }, [products, selectedBrandId, selectedCategory, selectedSort, showFeaturedOffers]);

  const allBrands = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.brand).filter(Boolean)));
  }, [products]);

  const visibleBrands = useMemo(() => {
    return Array.from(new Set(visibleProducts.map((product) => product.brand).filter(Boolean)));
  }, [visibleProducts]);

  const categoryOptions = useMemo(() => {
    return getShopCategories(language).map((category) => ({
      ...category,
      count: selectedBrandId
        ? filterProductsByBrand(filterProductsByShopCategory(products, category.id), selectedBrandId).length
        : filterProductsByShopCategory(products, category.id).length,
    }));
  }, [language, products, selectedBrandId]);

  const activeCategoryLabel = useMemo(() => {
    if (showFeaturedOffers) {
      return t('common.categories.offers');
    }

    if (selectedSort === 'newest') {
      return t('common.categories.new');
    }

    return getShopCategoryLabel(selectedCategory, language);
  }, [language, selectedCategory, selectedSort, showFeaturedOffers, t]);

  const activeCategoryMeta = useMemo(() => {
    const metaMap = {
      [DEFAULT_SHOP_CATEGORY]: {
        heading: t('shop.meta.allHeading'),
        description: t('shop.meta.allDescription'),
      },
      makeup: {
        heading: t('shop.meta.makeupHeading'),
        description: t('shop.meta.makeupDescription'),
      },
      skincare: {
        heading: t('shop.meta.skincareHeading'),
        description: t('shop.meta.skincareDescription'),
      },
      perfumes: {
        heading: t('shop.meta.perfumesHeading'),
        description: t('shop.meta.perfumesDescription'),
      },
      'mini-size': {
        heading: t('shop.meta.miniHeading'),
        description: t('shop.meta.miniDescription'),
      },
    };

    const baseMeta = metaMap[selectedCategory] || metaMap[DEFAULT_SHOP_CATEGORY];
    const collectionMeta = showFeaturedOffers
      ? {
          heading: t('common.categories.offers'),
          description: t('home.themes.bestDescription'),
        }
      : selectedSort === 'newest'
        ? {
            heading: t('common.categories.new'),
            description: t('home.themes.newDescription'),
          }
        : baseMeta;

    if (!activeBrand) {
      return collectionMeta;
    }

    return {
      heading: t('shop.meta.brandHeading', { brand: activeBrand.name }),
      description: t('shop.meta.brandDescription', {
        brand: activeBrand.name,
        category: activeCategoryLabel,
      }),
    };
  }, [activeBrand, activeCategoryLabel, selectedCategory, selectedSort, showFeaturedOffers, t]);

  const heroBackgroundImage = useMemo(() => {
    if (showFeaturedOffers) {
      return SHOP_HERO_BACKGROUNDS.offers;
    }

    if (selectedSort === 'newest') {
      return SHOP_HERO_BACKGROUNDS.newest;
    }

    return SHOP_HERO_BACKGROUNDS[selectedCategory] || SHOP_HERO_BACKGROUNDS.default;
  }, [selectedCategory, selectedSort, showFeaturedOffers]);

  const hasFilteredResults = visibleProducts.length > 0;
  const brandCount =
    hasFilteredResults ? visibleBrands.length : selectedCategory === DEFAULT_SHOP_CATEGORY ? allBrands.length : 0;
  const isFilteredEmpty = products.length > 0 && visibleProducts.length === 0;

  useEffect(() => {
    if (!previewProduct) {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setIsPreviewOpen(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [previewProduct]);

  useEffect(() => {
    if (!previewProduct || isPreviewOpen) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPreviewProduct(null);
    }, 240);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isPreviewOpen, previewProduct]);

  useEffect(() => {
    if (!previewProduct) {
      return undefined;
    }

    const activeProductStillVisible = visibleProducts.some((product) => getProductKey(product) === getProductKey(previewProduct));

    if (!activeProductStillVisible) {
      setIsPreviewOpen(false);
    }

    return undefined;
  }, [previewProduct, visibleProducts]);

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);

    const nextParams = new URLSearchParams(searchParams);

    if (categoryId === DEFAULT_SHOP_CATEGORY) {
      nextParams.delete('category');
    } else {
      nextParams.set('category', categoryId);
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleClearBrand = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('brand');
    setSearchParams(nextParams, { replace: true });
  };

  const handleOpenPreview = (product) => {
    setPreviewProduct(product);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} style={{ '--shop-hero-image': `url('${heroBackgroundImage}')` }}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>{t('shop.eyebrow')}</span>
          <h1>{activeCategoryMeta.heading}</h1>
          <p>{activeCategoryMeta.description}</p>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroStat}>
            <Search size={18} strokeWidth={2.1} />
            <div>
              <strong>{visibleProducts.length}</strong>
              <span>{activeCategoryLabel}</span>
            </div>
          </div>
          <div className={styles.heroStat}>
            <SlidersHorizontal size={18} strokeWidth={2.1} />
            <div>
              <strong>{SHOP_CATEGORIES.length}</strong>
              <span>{t('shop.categoriesSimple')}</span>
            </div>
          </div>
          <div className={styles.heroStat}>
            <BadgePercent size={18} strokeWidth={2.1} />
            <div>
              <strong>{brandCount}</strong>
              <span>{t('shop.visibleBrands')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.categorySection} aria-label={t('shop.categoriesProductsAria')}>
        <div className={styles.categoryMeta}>
          <span className={styles.eyebrow}>{t('shop.chosenCategories')}</span>
          <p className={styles.categorySummary}>
            {t('shop.categorySummary', {
              label: activeCategoryLabel,
              countText: t('common.misc.pieces', { count: visibleProducts.length }),
            })}
          </p>
        </div>

        <div className={styles.categoryScroller}>
          <div className={styles.categoryBar}>
            {categoryOptions.map((category) => (
              <button
                key={category.id}
                type="button"
                className={category.id === selectedCategory ? styles.categoryTabActive : styles.categoryTab}
                onClick={() => handleCategoryChange(category.id)}
                aria-pressed={category.id === selectedCategory}
                aria-label={t('shop.categoryProductsAria', { label: category.label, count: category.count })}
              >
                <span>{category.label}</span>
                <small>{category.count}</small>
              </button>
            ))}
          </div>
        </div>

        {activeBrand ? (
          <div className={styles.activeBrandRow}>
            <div className={styles.activeBrandPill}>
              <span>{t('shop.activeBrandLabel')}</span>
              <strong>{activeBrand.name}</strong>
            </div>
            <button type="button" className={styles.clearBrandButton} onClick={handleClearBrand}>
              {t('shop.clearBrand')}
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.catalogueStatus}>
        <div className={styles.statusPill}>
          <CheckCircle2 size={16} strokeWidth={2.2} />
          <span>{loading ? t('shop.source.loading') : t(`shop.source.${sourceStatus}`)}</span>
        </div>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.gridSection}>
        {loading ? (
          <div className={styles.productGrid}>
            {Array.from({ length: 8 }, (_, index) => (
              <ProductCardSkeleton key={`shop-skeleton-${index}`} />
            ))}
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className={styles.productGrid}>
            {visibleProducts.map((product) => (
              <ProductCard
                key={getProductKey(product)}
                product={product}
                onPreview={handleOpenPreview}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            {isFilteredEmpty ? (
              <>
                <h3>{t('shop.emptyFilteredTitle', { category: activeCategoryLabel })}</h3>
                <p>{t('shop.emptyFilteredText')}</p>
              </>
            ) : (
              <>
                <h3>{t('shop.emptyCatalogTitle')}</h3>
                <p>{t('shop.emptyCatalogText')}</p>
              </>
            )}
          </div>
        )}
      </section>

      <ProductPreviewDialog
        product={previewProduct}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onAddToCart={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default Shop;
