import { useState } from 'react';
import { COMPANIES, GRADES } from '../lib/data';
import type { Inputs } from '../lib/types';
import { Field, NumberInput, Section, usd } from './fields';
import type { Update } from '../App';

export function GradersSection({ inputs, update }: { inputs: Inputs; update: Update }) {
  const [mode, setMode] = useState<'comps' | 'multipliers'>('comps');

  return (
    <Section
      title="Grading companies"
      subtitle="Service tiers, fees and what each grade sells for. Fees are editable estimates — check each company’s current price list."
    >
      <div className="company-grid">
        {COMPANIES.map((company) => {
          const s = inputs.companies[company.id];
          return (
            <div className={`company-card ${s.enabled ? '' : 'disabled'}`} key={company.id}>
              <label className="company-head">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) => update((d) => void (d.companies[company.id].enabled = e.target.checked))}
                />
                <span className="swatch" style={{ background: company.color }} />
                <strong>{company.name}</strong>
                <span className="muted small">{company.fullName}</span>
              </label>
              <Field label="Service tier">
                <select
                  value={s.tierId}
                  disabled={!s.enabled}
                  onChange={(e) => update((d) => void (d.companies[company.id].tierId = e.target.value))}
                >
                  <option value="auto">Auto (best fit)</option>
                  {company.tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {usd(t.price)}
                      {t.maxDeclaredValue !== null ? ` · ≤${usd(t.maxDeclaredValue, 0)}` : ''}
                      {t.minCards ? ` · ${t.minCards}+ cards` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid-2 tight">
                <Field label="Return ship / sub.">
                  <NumberInput
                    prefix="$"
                    value={s.returnShippingPerSubmission}
                    onChange={(v) => update((d) => void (d.companies[company.id].returnShippingPerSubmission = v ?? 0))}
                  />
                </Field>
                <Field label="Add-ons / card" hint={company.id === 'BGS' ? 'e.g. subgrades' : undefined}>
                  <NumberInput
                    prefix="$"
                    value={s.addOnPerCard}
                    onChange={(v) => update((d) => void (d.companies[company.id].addOnPerCard = v ?? 0))}
                  />
                </Field>
              </div>
            </div>
          );
        })}
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
              {COMPANIES.map((c) => (
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
                {COMPANIES.map((c) => {
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
    </Section>
  );
}
