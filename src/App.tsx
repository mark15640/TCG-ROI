import { useEffect, useMemo, useState } from 'react';
import { analyze } from './lib/calc';
import { defaultInputs } from './lib/data';
import type { Inputs } from './lib/types';
import { CardSection } from './components/CardSection';
import { GradeOutlookSection } from './components/GradeOutlookSection';
import { ResultsSection } from './components/ResultsSection';
import { GradersSection } from './components/GradersSection';
import { CostsSection } from './components/CostsSection';
import { useTheme } from './theme';

export type Update = (mutate: (draft: Inputs) => void) => void;

const STORAGE_KEY = 'tcg-roi:inputs:v1';

const TABS = [
  { id: 'results', label: 'Results' },
  { id: 'odds', label: 'Grade odds' },
  { id: 'prices', label: 'Prices & tiers' },
  { id: 'costs', label: 'Fees & shipping' },
] as const;

type TabId = (typeof TABS)[number]['id'];

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
  const [tab, setTab] = useState<TabId>('results');
  const [theme, toggleTheme] = useTheme();

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

  const analysis = useMemo(() => analyze(inputs), [inputs]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>TCG Grading ROI</h1>
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
            className="secondary"
            onClick={() => {
              if (confirm('Reset every input to its default?')) setInputs(defaultInputs());
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <CardSection inputs={inputs} update={update} />

      <section className="card tabs-card">
        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'results' && <ResultsSection analysis={analysis} inputs={inputs} />}
          {tab === 'odds' && (
            <GradeOutlookSection inputs={inputs} update={update} total={analysis.distributionTotal} />
          )}
          {tab === 'prices' && <GradersSection inputs={inputs} update={update} />}
          {tab === 'costs' && <CostsSection inputs={inputs} update={update} />}
        </div>
      </section>

      <footer className="muted small">
        Fees and prices are editable estimates and change often. Not financial advice. Inputs are saved in this browser
        only.
      </footer>
    </div>
  );
}
