import { useEffect, useMemo, useState } from 'react';
import { analyze } from './lib/calc';
import { defaultInputs } from './lib/data';
import type { Inputs } from './lib/types';
import { CardSection } from './components/CardSection';
import { GradeOutlookSection } from './components/GradeOutlookSection';
import { ResultsSection } from './components/ResultsSection';
import { GradersSection } from './components/GradersSection';
import { CostsSection } from './components/CostsSection';

export type Update = (mutate: (draft: Inputs) => void) => void;

const STORAGE_KEY = 'tcg-roi:inputs:v1';

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
          <p className="muted">
            Should you grade it or sell it raw? Compare PSA, CGC, SGC, BGS and TAG after eBay fees, postage and shipping
            supplies.
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (confirm('Reset every input to its default?')) setInputs(defaultInputs());
          }}
        >
          Reset all
        </button>
      </header>

      <div className="layout">
        <CardSection inputs={inputs} update={update} />
        <GradeOutlookSection inputs={inputs} update={update} total={analysis.distributionTotal} />
      </div>

      <ResultsSection analysis={analysis} inputs={inputs} />

      <GradersSection inputs={inputs} update={update} />
      <CostsSection inputs={inputs} update={update} />

      <footer className="muted small">
        Grading fees, eBay rates, postage and grade premiums are estimates that change often — edit any value to match
        current pricing. Nothing here is financial advice. Your inputs are saved in this browser only.
      </footer>
    </div>
  );
}
