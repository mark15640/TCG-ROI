import { useEffect, useState } from 'react';

// Screens live in the URL hash (#card-sv03.5-199, #manual) so the browser/phone back button moves
// between them and a card page can be bookmarked. Plain tokens only: some hosts pass nothing else.
export type Route = { name: 'search' } | { name: 'manual' } | { name: 'card'; id: string };

export function parseHash(hash: string): Route {
  const h = decodeURIComponent(hash.replace(/^#/, ''));
  if (h === 'manual') return { name: 'manual' };
  if (h.startsWith('card-') && h.length > 5) return { name: 'card', id: h.slice(5) };
  return { name: 'search' };
}

export function hrefFor(route: Route): string {
  if (route.name === 'manual') return '#manual';
  if (route.name === 'card') return `#card-${route.id}`;
  return '#';
}

export function navigate(route: Route) {
  const href = hrefFor(route);
  if (href === '#') {
    // Clear the hash without leaving a stray "#" in the address bar.
    history.pushState(null, '', location.pathname + location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = href;
  }
  window.scrollTo({ top: 0 });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);
  return route;
}
