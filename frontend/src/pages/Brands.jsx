import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import BrandMark from '../components/BrandMark';
import localProducts from '../data/products';
import brands from '../data/brands';
import { getBrandProductCount, getBrandShopHref, hasLocalBrandLogo, sortBrandsAlphabetically } from '../lib/brands';
import { useLanguage } from '../context/LanguageContext';
import styles from './Brands.module.css';

const ALPHABET = ['all', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const BRANDS_HERO_IMAGE = '/images/hero/brands-hero.jpg';

function getFilterLetter(name) {
  const firstCharacter = String(name || '').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(firstCharacter) ? firstCharacter : '#';
}

function getSearchText(brand) {
  return [brand.name, brand.category, ...(brand.aliases || [])].join(' ').toLowerCase();
}

const Brands = () => {
  const { t } = useLanguage();
  const hasLocalProducts = localProducts.length > 0;
  const [products, setProducts] = useState(hasLocalProducts ? localProducts : []);
  const [loading, setLoading] = useState(!hasLocalProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('all');

  useEffect(() => {
    if (hasLocalProducts) {
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
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [hasLocalProducts]);

  const brandCards = useMemo(() => {
    return sortBrandsAlphabetically(brands)
      .filter(hasLocalBrandLogo)
      .map((brand) => ({
        ...brand,
        productCount: getBrandProductCount(products, brand.id),
        letter: getFilterLetter(brand.name),
      }));
  }, [products]);

  const filteredBrands = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return brandCards.filter((brand) => {
      const matchesLetter = selectedLetter === 'all' ? true : brand.letter === selectedLetter;
      const matchesSearch = normalizedSearch ? getSearchText(brand).includes(normalizedSearch) : true;
      return matchesLetter && matchesSearch;
    });
  }, [brandCards, searchTerm, selectedLetter]);

  const visibleLetters = useMemo(() => {
    return new Set(brandCards.map((brand) => brand.letter));
  }, [brandCards]);

  return (
    <div className={styles.page}>
      <section className={styles.hero} style={{ '--brands-hero-image': `url('${BRANDS_HERO_IMAGE}')` }}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t('brands.eyebrow')}</p>
          <h1>{t('brands.title')}</h1>
          <p>{t('brands.description')}</p>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <strong>{brandCards.length}</strong>
            <span>{t('brands.totalBrands')}</span>
          </div>
          <div className={styles.statCard}>
            <strong>{filteredBrands.length}</strong>
            <span>{t('brands.visibleBrands')}</span>
          </div>
          <div className={styles.statCard}>
            <strong>{brandCards.filter((brand) => brand.productCount > 0).length}</strong>
            <span>{t('brands.availableBrands')}</span>
          </div>
        </div>
      </section>

      <section className={styles.controls}>
        <label className={styles.searchField}>
          <Search size={16} strokeWidth={1.9} aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('brands.searchPlaceholder')}
            aria-label={t('brands.searchPlaceholder')}
          />
        </label>

        <div className={styles.alphabetBar} aria-label={t('brands.alphabetAria')}>
          {ALPHABET.map((letter) => {
            const isEnabled = letter === 'all' || visibleLetters.has(letter);
            const label = letter === 'all' ? t('common.categories.all') : letter;

            return (
              <button
                key={letter}
                type="button"
                className={selectedLetter === letter ? styles.letterButtonActive : styles.letterButton}
                onClick={() => setSelectedLetter(letter)}
                disabled={!isEnabled}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.gridSection}>
        <div className={styles.gridHeader}>
          <p>{t('brands.gridSummary', { count: filteredBrands.length })}</p>
          <Link className={styles.viewAllLink} to="/shop">
            {t('brands.browseAllProducts')}
          </Link>
        </div>

        {loading ? <p className={styles.loadingText}>{t('brands.loading')}</p> : null}

        {filteredBrands.length ? (
          <div className={styles.grid}>
            {filteredBrands.map((brand) => (
              <Link key={brand.id} className={styles.card} to={getBrandShopHref(brand.id)}>
                <span className={styles.cardCategory}>{t(`common.categories.${brand.category}`)}</span>
                <div className={styles.logoShell}>
                  <BrandMark brand={brand} imageClassName={styles.logoImage} fallbackClassName={styles.initials} />
                </div>
                <span className={styles.count}>
                  {brand.productCount > 0
                    ? t('brands.productCount', { count: brand.productCount })
                    : t('brands.noProductsYet')}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h2>{t('brands.emptyTitle')}</h2>
            <p>{t('brands.emptyText')}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Brands;
