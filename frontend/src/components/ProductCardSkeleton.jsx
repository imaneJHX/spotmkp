import React from 'react';
import styles from './ProductCardSkeleton.module.css';

const ProductCardSkeleton = () => {
  return (
    <article className={styles.card} aria-hidden="true">
      <div className={styles.media}>
        <div className={styles.badge} />
        <div className={styles.imageGlow} />
        <div className={styles.image} />
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <div className={`${styles.line} ${styles.lineSmall}`} />
          <div className={styles.pill} />
        </div>
        <div className={styles.midRow}>
          <div className={`${styles.line} ${styles.lineTiny}`} />
          <div className={`${styles.line} ${styles.linePrice}`} />
        </div>
        <div className={`${styles.line} ${styles.lineTitle}`} />
        <div className={`${styles.line} ${styles.lineTitleAlt}`} />

        <div className={styles.actionRow}>
          <div className={styles.primaryButton} />
          <div className={styles.secondaryButton} />
        </div>
      </div>
    </article>
  );
};

export default ProductCardSkeleton;
