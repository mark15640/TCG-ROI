import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tcg-roi:theme';
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

const asTheme = (t: unknown): Theme | null => (t === 'light' || t === 'dark' ? t : null);

function savedTheme(): Theme | null {
  try {
    return asTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** The user's saved choice, else a theme the hosting page already set on <html>. */
function initialTheme(): Theme | null {
  return savedTheme() ?? asTheme(document.documentElement.dataset.theme);
}

function systemTheme(): Theme {
  return media()?.matches ? 'dark' : 'light';
}

/** Current day/night theme. Follows the system until the user picks one, then remembers it. */
export function useTheme(): [Theme, () => void] {
  const [chosen, setChosen] = useState<Theme | null>(initialTheme);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = chosen ?? system;

  useEffect(() => {
    const m = media();
    if (!m) return;
    const onChange = () => setSystem(systemTheme());
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    // Only ever set the attribute; clearing it could discard a theme the hosting page chose.
    if (chosen) document.documentElement.dataset.theme = chosen;
    // Match the browser / installed-app title bar to the page.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b0d10' : '#f5f6f8');
  }, [chosen, theme]);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setChosen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't persist.
    }
  };

  return [theme, toggle];
}
