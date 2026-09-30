import { useEffect, useMemo, useState } from 'react';
import { analyze } from './lib/calc';
import { defaultInputs } from './lib/data';
import type { Inputs } from './lib/types';
import { CardPage } from './components/CardPage';
import { SearchPage } from './components/SearchPage';
import { EXAMPLES, applyExample } from './lib/examples';
import { startManual } from './lib/selection';
import { navigate, useRoute } from './router';
import { useTheme } from './theme';

export type Update = (mutate: (draft: Inputs) => void) => void;

const STORAGE_KEY = 'tcg-roi:inputs:v2';

const QUERY_KEY = 'tcg-roi:query';

function loadQuery(): string {
  try {
    return sessionStorage.getItem(QUERY_KEY) ?? '';
  } catch {
    return '';
  }
}

function loadInputs(): Inputs {
  const defaults = defaultInputs();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved) as Partial<Inputs>;
    // Shallow-merge so settings added in later versions still get defaults.
    return {
      ...defaults,
      ...parsed,
      card: parsed.card ?? null,
      ebay: { ...defaults.ebay, ...parsed.ebay },
      rawSale: { ...defaults.rawSale, ...parsed.rawSale },
      gradedSale: { ...defaults.gradedSale, ...parsed.gradedSale },
      companies: Object.fromEntries(
        Object.entries(defaults.companies).map(([id, c]) => [
          id,
          { ...c, ...parsed.companies?.[id as keyof Inputs['companies']] },
        ]),
      ) as Inputs['companies'],
    };
  } catch {
    return defaults;
  }
}

export default function App() {
  const [inputs, setInputs] = useState<Inputs>(loadInputs);
  const [query, setQuery] = useState(loadQuery);
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      // Storage unavailable (private mode etc.) — the app still works without it.
    }
  }, [inputs]);

  const update: Update = (mutate) =>
    setInputs((prev) => {
      const draft = structuredClone(prev);
      mutate(draft);
      return draft;
    });

  useEffect(() => {
    try {
      sessionStorage.setItem(QUERY_KEY, query);
    } catch {
      // Not remembered across reloads; fine.
    }
  }, [query]);

  const analysis = useMemo(() => analyze(inputs), [inputs]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>
            <a href="#" onClick={(e) => (e.preventDefault(), navigate({ name: 'search' }))}>
              TCG Grading ROI
            </a>
          </h1>
          <p className="muted">Grade it or sell it raw? Every number is after eBay fees, postage and supplies.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
            title={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
          >
            <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? 'Day' : 'Night'}
          </button>
          <button
            type="button"
            className={`secondary ${confirmReset ? 'danger' : ''}`}
            onClick={() => {
              if (confirmReset) {
                setInputs(defaultInputs());
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
              }
            }}
            onBlur={() => setConfirmReset(false)}
          >
            {confirmReset ? 'Tap again to reset' : 'Reset'}
          </button>
        </div>
      </header>

      {route.name === 'search' ? (
        <SearchPage
          query={query}
          setQuery={setQuery}
          onOpenCard={(id) => navigate({ name: 'card', id })}
          onManual={() => {
            update(startManual);
            navigate({ name: 'manual' });
          }}
          onExample={(id) => {
            const ex = EXAMPLES.find((e) => e.id === id);
            if (ex) update((d) => applyExample(d, ex));
            navigate({ name: 'manual' });
          }}
        />
      ) : (
        <CardPage
          cardId={route.name === 'card' ? route.id : null}
          inputs={inputs}
          update={update}
          analysis={analysis}
          onBack={() => navigate({ name: 'search' })}
        />
      )}

      <footer className="muted small">
        Fees and prices are editable estimates and change often. Not financial advice. Inputs are saved in this browser
        only.
      </footer>
    </div>
  );
}
