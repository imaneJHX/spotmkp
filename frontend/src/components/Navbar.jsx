import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, Trash2, UserRound, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatPriceMAD } from '../lib/productPresentation';
import styles from './Navbar.module.css';

function formatMadAmount(value) {
  return formatPriceMAD({ price: value, currency: 'MAD' });
}

function navClassName(isActive, accent = false) {
  const classes = [styles.navLink];

  if (isActive) {
    classes.push(styles.navLinkActive);
  }

  if (accent) {
    classes.push(styles.navLinkAccent);
  }

  return classes.join(' ');
}

const Navbar = () => {
  const location = useLocation();
  const { itemCount, items, subtotal, removeItem, lastAddedItem, lastActionId } = useCart();
  const { language, setLanguage, languages, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const cartPanelRef = useRef(null);
  const languageMenuRef = useRef(null);
  const lastSeenCartActionRef = useRef(0);

  const cartSummaryText = useMemo(
    () => t('navbar.cartSummary', { count: itemCount }),
    [itemCount, t],
  );

  const selectedLanguage = useMemo(
    () => languages.find((entry) => entry.value === language) || languages[0],
    [language, languages],
  );

  const navItems = useMemo(
    () => [
      { label: t('common.categories.new'), to: '/shop?sort=newest' },
      { label: t('common.categories.makeup'), to: '/shop?category=makeup' },
      { label: t('common.categories.skincare'), to: '/shop?category=skincare' },
      { label: t('common.categories.perfumes'), to: '/shop?category=perfumes' },
      { label: t('common.categories.miniSize'), to: '/shop?category=mini-size' },
      { label: t('common.categories.brands'), to: '/marques' },
      { label: t('common.categories.offers'), to: '/shop?featured=true', accent: true },
    ],
    [t],
  );

  const currentPath = `${location.pathname}${location.search}`;

  const toggleMenu = () => {
    setIsMenuOpen((currentValue) => !currentValue);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchOpen((currentValue) => !currentValue);
  };

  const toggleCart = () => {
    setIsCartOpen((currentValue) => !currentValue);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const toggleLanguageMenu = () => {
    setIsLanguageMenuOpen((currentValue) => !currentValue);
  };

  const closeLanguageMenu = () => {
    setIsLanguageMenuOpen(false);
  };

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!lastActionId || lastActionId === lastSeenCartActionRef.current || !lastAddedItem) {
      return;
    }

    lastSeenCartActionRef.current = lastActionId;
    setIsCartOpen(true);
  }, [lastActionId, lastAddedItem]);

  useEffect(() => {
    if (!isCartOpen) {
      return undefined;
    }

    document.body.classList.add('modal-open');

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeCart();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const animationFrame = window.requestAnimationFrame(() => {
      cartPanelRef.current?.focus();
    });

    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!languageMenuRef.current?.contains(event.target)) {
        closeLanguageMenu();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeLanguageMenu();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLanguageMenuOpen]);

  return (
    <>
      <header className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div ref={languageMenuRef} className={styles.languagePicker}>
              <button
                type="button"
                className={styles.languageButton}
                aria-label={t('navbar.changeLanguage')}
                aria-haspopup="menu"
                aria-expanded={isLanguageMenuOpen}
                onClick={toggleLanguageMenu}
              >
                <span>{selectedLanguage.code}</span>
                <ChevronDown
                  className={isLanguageMenuOpen ? styles.languageChevronOpen : styles.languageChevron}
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>

              {isLanguageMenuOpen ? (
                <div className={styles.languageDropdown} role="menu" aria-label={t('common.language')}>
                  {languages.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={entry.value === language}
                      className={
                        entry.value === language
                          ? `${styles.languageOption} ${styles.languageOptionActive}`
                          : styles.languageOption
                      }
                      onClick={() => {
                        setLanguage(entry.value);
                        closeLanguageMenu();
                      }}
                    >
                      <span className={styles.languageOptionCode}>{entry.code}</span>
                      <span className={styles.languageOptionLabel}>{entry.nativeName}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <span>{t('navbar.freeShipping')}</span>
          </div>

          <div className={styles.topBarSpacer} aria-hidden="true" />
        </div>

        <nav className={styles.nav}>
          <div className={styles.primaryRow}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              aria-label={isMenuOpen ? t('navbar.closeMenu') : t('navbar.openMenu')}
              aria-expanded={isMenuOpen}
              onClick={toggleMenu}
            >
              {isMenuOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
            </button>

            <div className={styles.logoWrap}>
              <Link className={styles.brand} to="/" aria-label={t('navbar.homeAria')} onClick={closeMenu}>
                <strong>Beauty Spot</strong>
                <span>{t('navbar.brandTagline')}</span>
              </Link>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.iconButton} aria-label={t('navbar.search')} onClick={toggleSearch}>
                <Search size={18} strokeWidth={1.8} />
              </button>
              <Link className={styles.iconButton} to="/login" aria-label={t('navbar.account')}>
                <UserRound size={18} strokeWidth={1.8} />
              </Link>
              <Link className={styles.iconButton} to="/register" aria-label={t('navbar.wishlist')}>
                <Heart size={18} strokeWidth={1.8} />
              </Link>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={t('navbar.viewCart', { count: itemCount })}
                aria-expanded={isCartOpen}
                onClick={toggleCart}
              >
                <ShoppingBag size={18} strokeWidth={1.8} />
                {itemCount ? <span className={styles.cartBadge}>{itemCount > 99 ? '99+' : itemCount}</span> : null}
              </button>
            </div>
          </div>

          <div className={`${styles.searchPanel} ${isSearchOpen ? styles.searchPanelOpen : ''}`}>
            <div className={styles.searchField}>
              <Search size={16} strokeWidth={1.8} />
              <input
                ref={searchInputRef}
                type="search"
                placeholder={t('navbar.searchPlaceholder')}
                aria-label={t('navbar.searchAria')}
              />
              <button
                type="button"
                className={styles.searchCloseButton}
                onClick={toggleSearch}
                aria-label={t('navbar.closeSearch')}
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className={`${styles.secondaryRow} ${isMenuOpen ? styles.secondaryRowOpen : ''}`}>
            {navItems.map((item) => {
              const isActive = currentPath === item.to;

              return (
                <Link
                  key={item.label}
                  className={navClassName(isActive, item.accent)}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {isCartOpen ? (
        <button type="button" className={styles.cartBackdrop} aria-label={t('navbar.closeMiniCart')} onClick={closeCart} />
      ) : null}

      <aside
        ref={cartPanelRef}
        className={`${styles.cartPanel} ${isCartOpen ? styles.cartPanelOpen : ''}`}
        tabIndex={-1}
        aria-label={t('navbar.miniCartAria')}
      >
        <div className={styles.cartPanelHeader}>
          <div>
            <span className={styles.cartPanelEyebrow}>{t('navbar.miniCartEyebrow')}</span>
            <strong>{cartSummaryText}</strong>
          </div>
          <button type="button" className={styles.cartCloseButton} onClick={closeCart} aria-label={t('navbar.closeMiniCart')}>
            <X size={18} strokeWidth={1.9} />
          </button>
        </div>

        {items.length ? (
          <>
            <div className={styles.cartList}>
              {items.map((item) => (
                <article key={item.productId} className={styles.cartItem}>
                  <div className={styles.cartItemMedia}>
                    <img src={item.image} alt={item.name} loading="lazy" />
                  </div>

                  <div className={styles.cartItemContent}>
                    <span className={styles.cartItemBrand}>{item.brand}</span>
                    <strong className={styles.cartItemName}>{item.name}</strong>
                    <div className={styles.cartItemMeta}>
                      <span>{formatMadAmount(item.price)}</span>
                      <span>{t('common.misc.qty')} {item.quantity}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.cartRemoveButton}
                    onClick={() => removeItem(item.productId)}
                    aria-label={t('navbar.removeFromCart', { name: item.name })}
                  >
                    <Trash2 size={15} strokeWidth={1.9} />
                  </button>
                </article>
              ))}
            </div>

            <div className={styles.cartFooter}>
              <div className={styles.cartTotalRow}>
                <span>{t('common.misc.total')}</span>
                <strong>{formatMadAmount(subtotal)}</strong>
              </div>

              <div className={styles.cartActions}>
                <Link className={styles.cartSecondaryButton} to="/cart" onClick={closeCart}>
                  {t('common.actions.cart')}
                </Link>
                <Link className={styles.cartPrimaryButton} to="/checkout" onClick={closeCart}>
                  {t('common.actions.order')}
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.cartEmptyState}>
            <h3>{t('navbar.emptyCartTitle')}</h3>
            <p>{t('navbar.emptyCartDescription')}</p>
            <Link className={styles.cartPrimaryButton} to="/shop" onClick={closeCart}>
              {t('common.actions.discoverShop')}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
};

export default Navbar;
