import React, { useEffect, useMemo, useState } from 'react';
import { getBrandInitials, getBrandLogoCandidates } from '../lib/brands';

function getSourceKind(source) {
  if (!source) {
    return 'fallback';
  }

  return source.startsWith('/brands/') ? 'local' : 'brandfetch';
}

function BrandMark({ brand, imageClassName, fallbackClassName }) {
  const clientId = import.meta.env.VITE_BRANDFETCH_CLIENT_ID || '';
  const sources = useMemo(() => getBrandLogoCandidates(brand, clientId), [brand, clientId]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const activeSource = sources[sourceIndex] || null;
  const sourceKind = getSourceKind(activeSource);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.log('[BrandMark]', {
      brand: brand?.name || 'Unknown',
      domain: brand?.domain || null,
      source: sourceKind,
    });
  }, [brand, sourceKind]);

  if (activeSource) {
    return (
      <img
        className={imageClassName}
        src={activeSource}
        alt={brand?.name || 'Brand logo'}
        loading="lazy"
        decoding="async"
        referrerPolicy="origin"
        onError={() => setSourceIndex((currentValue) => currentValue + 1)}
      />
    );
  }

  return <span className={fallbackClassName}>{getBrandInitials(brand?.name)}</span>;
}

export default BrandMark;
