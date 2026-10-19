import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gift, ShieldCheck, Smartphone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import styles from './Footer.module.css';

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const footerCards = useMemo(
    () => [
      {
        icon: ShieldCheck,
        title: t('footer.card1Title'),
        description: t('footer.card1Description'),
      },
      {
        icon: Smartphone,
        title: t('footer.card2Title'),
        description: t('footer.card2Description'),
      },
      {
        icon: Gift,
        title: t('footer.card3Title'),
        description: t('footer.card3Description'),
      },
    ],
    [t],
  );

  const footerColumns = useMemo(
    () => [
      {
        title: t('footer.columnShop'),
        links: [
          { label: t('footer.home'), to: '/' },
          { label: t('common.categories.new'), to: '/shop?sort=newest' },
          { label: t('footer.allProducts'), to: '/shop' },
          { label: t('common.categories.brands'), to: '/marques' },
          { label: t('common.categories.miniSize'), to: '/shop?category=mini-size' },
        ],
      },
      {
        title: t('footer.columnAccount'),
        links: [
          { label: t('common.actions.createAccount'), to: '/register' },
          { label: t('common.actions.login'), to: '/login' },
          { label: t('common.actions.cart'), to: '/cart' },
          { label: t('common.actions.checkout'), to: '/checkout' },
        ],
      },
      {
        title: t('footer.columnService'),
        links: [
          { label: t('common.misc.shipping'), to: '/shop' },
          { label: t('footer.favorites'), to: '/shop?featured=true' },
          { label: t('common.categories.perfumes'), to: '/shop?category=perfumes' },
          { label: t('common.categories.skincare'), to: '/shop?category=skincare' },
        ],
      },
    ],
    [t],
  );

  const footerTags = useMemo(
    () => [
      t('common.categories.all'),
      t('common.categories.makeup'),
      t('common.categories.skincare'),
      t('common.categories.perfumes'),
      t('common.categories.miniSize'),
    ],
    [t],
  );

  return (
    <footer className={styles.footer}>
      <div className={styles.surface}>
        <div className={styles.topRow}>
          <div className={styles.brandBlock}>
            <Link className={styles.footerBrandLogo} to="/" aria-label={t('navbar.homeAria')}>
              <strong>Beauty Spot</strong>
              <span>{t('navbar.brandTagline')}</span>
            </Link>
            <h2>{t('footer.brandTitle')}</h2>
            <p>{t('footer.brandDescription')}</p>
          </div>

          <div className={styles.linkGrid}>
            {footerColumns.map((column) => (
              <div key={column.title} className={styles.linkColumn}>
                <span className={styles.columnLabel}>{column.title}</span>
                {column.links.map((link) => (
                  <Link key={`${column.title}-${link.label}`} to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.signalRow}>
          {footerCards.map((card) => (
            <div key={card.title} className={styles.signalCard}>
              <card.icon size={18} strokeWidth={1.9} />
              <div>
                <strong>{card.title}</strong>
                <p>{card.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.bottomRow}>
          <p>{t('footer.bottomLine', { year: currentYear })}</p>
          <div className={styles.badgeRow}>
            {footerTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
