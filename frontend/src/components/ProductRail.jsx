import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ProductRail.module.css';

const DRAG_THRESHOLD = 6;

function ProductRail({ children, ariaLabel = 'Rail produits' }) {
  const items = useMemo(() => React.Children.toArray(children), [children]);
  const trackRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return undefined;
    }

    const updateScrollState = () => {
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      setScrollState({
        canScrollLeft: track.scrollLeft > 8,
        canScrollRight: track.scrollLeft < maxScrollLeft - 8,
      });
    };

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(track);

    track.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      resizeObserver.disconnect();
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [items.length]);

  const endDrag = () => {
    const track = trackRef.current;
    if (!track || !dragStateRef.current.active) {
      return;
    }

    const { pointerId } = dragStateRef.current;
    dragStateRef.current.active = false;
    track.dataset.dragging = 'false';

    if (pointerId !== null && track.hasPointerCapture?.(pointerId)) {
      track.releasePointerCapture(pointerId);
    }

    window.setTimeout(() => {
      dragStateRef.current.moved = false;
    }, 0);
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'touch' || event.button !== 0) {
      return;
    }

    const track = trackRef.current;
    if (!track) {
      return;
    }

    dragStateRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: track.scrollLeft,
    };

    track.dataset.dragging = 'true';
    track.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const track = trackRef.current;
    const dragState = dragStateRef.current;

    if (!track || !dragState.active) {
      return;
    }

    const delta = event.clientX - dragState.startX;
    if (Math.abs(delta) > DRAG_THRESHOLD) {
      dragState.moved = true;
    }

    track.scrollLeft = dragState.startScrollLeft - delta;
  };

  const handleClickCapture = (event) => {
    if (!dragStateRef.current.moved) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  const handleWheel = (event) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const hasHorizontalOverflow = track.scrollWidth > track.clientWidth + 4;
    const isMostlyVertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);

    if (!hasHorizontalOverflow || !isMostlyVertical) {
      return;
    }

    track.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  const handleKeyDown = (event) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const scrollAmount = Math.max(240, track.clientWidth * 0.82);

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollByPage = (direction) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    track.scrollBy({
      left: direction * Math.max(240, track.clientWidth * 0.82),
      behavior: 'smooth',
    });
  };

  return (
    <div
      className={[
        styles.shell,
        scrollState.canScrollLeft ? styles.shellLeft : '',
        scrollState.canScrollRight ? styles.shellRight : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className={styles.navButton}
        onClick={() => scrollByPage(-1)}
        aria-label={`Faire defiler ${ariaLabel} vers la gauche`}
        disabled={!scrollState.canScrollLeft}
      >
        <ChevronLeft size={18} strokeWidth={2.2} />
      </button>

      <div
        ref={trackRef}
        className={styles.track}
        aria-label={ariaLabel}
        data-dragging="false"
        tabIndex={0}
        onClickCapture={handleClickCapture}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onWheel={handleWheel}
      >
        {items.map((item, index) => (
          <div key={item.key ?? index} className={styles.item}>
            {item}
          </div>
        ))}
      </div>

      <button
        type="button"
        className={styles.navButton}
        onClick={() => scrollByPage(1)}
        aria-label={`Faire defiler ${ariaLabel} vers la droite`}
        disabled={!scrollState.canScrollRight}
      >
        <ChevronRight size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export default ProductRail;
