import { useState, type CSSProperties, type PointerEvent } from 'react';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Pointer handlers that tilt an element toward the cursor, like angling a foil card under a
 * light. They set --rx/--ry (rotation) and --mx/--my (sheen position) for the CSS to use.
 * Mouse and pen only: on touch screens a tilt would fight with scrolling.
 */
export function tilt(maxDeg = 10) {
  return {
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (e.pointerType === 'touch' || reducedMotion()) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', `${((0.5 - y) * maxDeg).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((x - 0.5) * maxDeg).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      el.dataset.tilting = '';
    },
    onPointerLeave(e: PointerEvent<HTMLElement>) {
      const el = e.currentTarget;
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
      delete el.dataset.tilting;
    },
  };
}

/** An image that fades in once it has loaded, over a shimmering placeholder. */
export function FadeImage({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="no-art">No image</span>;
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      className={`fade-img ${loaded ? 'loaded' : ''}`}
      // Cached images can finish before React attaches onLoad.
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0 && !loaded) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}

/** Staggers a list's entrance: item i starts a little after item i−1 (capped so long lists don't drag). */
export function stagger(i: number, stepMs = 45, cap = 14): CSSProperties {
  return { '--delay': `${Math.min(i, cap) * stepMs}ms` } as CSSProperties;
}
