import { useState } from 'react';
import { COMPANIES, GRADES } from '../lib/data';
import type { Inputs } from '../lib/types';
import { NumberInput, usd } from './fields';
import type { Update } from '../App';

export function GradersSection({ inputs, update }: { inputs: Inputs; update: Update }) {
  const [mode, setMode] = useState<'comps' | 'multipliers'>('comps');

  const selected = COMPANIES.filter((c) => inputs.companies[c.id].enabled);
  if (selected.length === 0) {
    return <p className="empty muted">Pick at least one grading company above.</p>;
  }

  return (
    <div className="panel">
      <p className="panel-intro muted">
        Service tiers and what each grade sells for. Fees are estimates, so check each company’s current price list.
      </p>
      <div className="table-scroll">
        <table className="table tiers">
          <thead>
            <tr>
              <th>Company</th>
              <th>Service tier</th>
              <th className="num">Return ship / submission</th>
              <th className="num">Add-ons / card</th>
            </tr>
          </thead>
          <tbody>
            {selected.map((company) => {
              const s = inputs.companies[company.id];
              return (
                <tr key={company.id}>
                  <td>
                    <span className="swatch" style={{ background: company.color }} />
                    <strong>{company.name}</strong>
                  </td>
                  <td>
                    <select
                      value={s.tierId}
                      aria-label={`${company.name} service tier`}
                      onChange={(e) => update((d) => void (d.companies[company.id].tierId = e.target.value))}
                    >
                      <option value="auto">Auto (best fit)</option>
                      {company.tiers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}: {usd(t.price)}
                          {t.maxDeclaredValue !== null ? `, value ≤ ${usd(t.maxDeclaredValue, 0)}` : ''}
                          {t.minCards ? `, ${t.minCards}+ cards` : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="num">
                    <NumberInput
                      className="cell"
                      prefix="$"
                      value={s.returnShippingPerSubmission}
                      ariaLabel={`${company.name} return shipping per submission`}
                      onChange={(v) =>
                        update((d) => void (d.companies[company.id].returnShippingPerSubmission = v ?? 0))
                      }
                    />
                  </td>
                  <td className="num">
                    <NumberInput
                      className="cell"
                      prefix="$"
                      value={s.addOnPerCard}
                      ariaLabel={`${company.name} add-ons per card`}
                      onChange={(v) => update((d) => void (d.companies[company.id].addOnPerCard = v ?? 0))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="subhead">
        <h3>Graded sale prices</h3>
        <div className="segmented small" role="radiogroup" aria-label="Value entry mode">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'comps'}
            className={mode === 'comps' ? 'active' : ''}
            onClick={() => setMode('comps')}
          >
            Sold comps ($)
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'multipliers'}
            className={mode === 'multipliers' ? 'active' : ''}
            onClick={() => setMode('multipliers')}
          >
            Multipliers (× NM)
          </button>
        </div>
      </div>
      <p className="muted small">
        {mode === 'comps'
          ? 'Enter recent sold prices for this card where you have them. Blank cells use the estimate shown (NM price × multiplier).'
          : 'Default graded value as a multiple of the raw NM price. Premiums vary a lot by card — sold comps are always better.'}
      </p>
      <div className="table-scroll">
        <table className="table compact values">
          <thead>
            <tr>
              <th>Grade</th>
              {selected.map((c) => (
                <th key={c.id} className="num">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRADES.map((g) => (
              <tr key={g}>
                <td>{g}</td>
                {selected.map((c) => {
                  const s = inputs.companies[c.id];
                  return (
                    <td key={c.id} className="num" title={c.gradeLabels[g]}>
                      {mode === 'comps' ? (
                        <NumberInput
                          className="cell"
                          prefix="$"
                          nullable
                          placeholder={(inputs.nmPrice * s.multipliers[g]).toFixed(0)}
                          value={s.compOverrides[g] ?? null}
                          ariaLabel={`${c.name} ${g} sold price`}
                          onChange={(v) =>
                            update((d) => {
                              if (v === null) delete d.companies[c.id].compOverrides[g];
                              else d.companies[c.id].compOverrides[g] = v;
                            })
                          }
                        />
                      ) : (
                        <NumberInput
                          className="cell"
                          suffix="×"
                          step={0.05}
                          value={s.multipliers[g]}
                          ariaLabel={`${c.name} ${g} multiplier`}
                          onChange={(v) => update((d) => void (d.companies[c.id].multipliers[g] = v ?? 0))}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
