import { COMPANIES, CONDITIONS, GRADE_DISTRIBUTION_PRESETS } from '../lib/data';
import { rawPrice, saleResult } from '../lib/calc';
import type { Inputs } from '../lib/types';
import { Field, NumberInput, usd } from './fields';
import type { Update } from '../App';

function RawValueTable({ inputs }: { inputs: Inputs }) {
  const nmNet = saleResult(inputs.nmPrice, inputs.rawSale, inputs.ebay, false).net;
  return (
    <div className="table-scroll">
      <table className="table compact">
        <thead>
          <tr>
            <th>Condition</th>
            <th className="num">% of NM</th>
            <th className="num">Raw value</th>
            <th className="num">Net after eBay</th>
            <th className="num">vs NM</th>
          </tr>
        </thead>
        <tbody>
          {CONDITIONS.map((c) => {
            const price = rawPrice({ nmPrice: inputs.nmPrice, condition: c.id, rawPriceOverride: null });
            const net = saleResult(price, inputs.rawSale, inputs.ebay, false).net;
            return (
              <tr key={c.id} className={inputs.condition === c.id ? 'highlight' : ''}>
                <td>{c.label}</td>
                <td className="num">{Math.round(c.rawMultiplier * 100)}%</td>
                <td className="num">{usd(price)}</td>
                <td className={`num ${net < 0 ? 'neg' : ''}`}>{usd(net)}</td>
                <td className="num muted">{c.id === 'NM' ? '—' : usd(net - nmNet)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CardSection({ inputs, update }: { inputs: Inputs; update: Update }) {
  const condition = CONDITIONS.find((c) => c.id === inputs.condition)!;

  return (
    <section className="card card-inputs">
      <div className="card-row">
        <Field label="Card">
          <input
            type="text"
            value={inputs.cardName}
            placeholder="Card name (optional)"
            onChange={(e) => update((d) => void (d.cardName = e.target.value))}
          />
        </Field>
        <Field label="Near Mint price">
          <NumberInput prefix="$" value={inputs.nmPrice} onChange={(v) => update((d) => void (d.nmPrice = v ?? 0))} />
        </Field>
        <Field label="You paid">
          <NumberInput
            prefix="$"
            nullable
            placeholder="optional"
            value={inputs.costBasis}
            onChange={(v) => update((d) => void (d.costBasis = v))}
          />
        </Field>
      </div>

      <div className="card-row two">
        <div className="field">
          <span className="field-label">Condition</span>
          <div className="chips" role="radiogroup" aria-label="Condition">
            {CONDITIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={inputs.condition === c.id}
                className={`chip ${inputs.condition === c.id ? 'on' : ''}`}
                title={`${c.label}: ${c.description}`}
                onClick={() =>
                  update((d) => {
                    d.condition = c.id;
                    d.gradeDistribution = { ...GRADE_DISTRIBUTION_PRESETS[c.id] };
                    d.distributionIsPreset = true;
                  })
                }
              >
                {c.id}
              </button>
            ))}
          </div>
          <span className="field-hint">
            {condition.label}: {condition.description}
          </span>
        </div>

        <div className="field">
          <span className="field-label">Compare</span>
          <div className="chips" role="group" aria-label="Grading companies to compare">
            {COMPANIES.map((c) => {
              const on = inputs.companies[c.id].enabled;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  className={`chip ${on ? 'on' : ''}`}
                  title={c.fullName}
                  onClick={() => update((d) => void (d.companies[c.id].enabled = !on))}
                >
                  <span className="swatch" style={{ background: c.color }} />
                  {c.name}
                </button>
              );
            })}
          </div>
          <span className="field-hint">Pick one company to focus on it, or several to compare.</span>
        </div>
      </div>

      <details className="disclosure">
        <summary>Raw value at each condition</summary>
        <RawValueTable inputs={inputs} />
        <Field label="Override raw price for this condition" hint="Use if you have sold comps for this exact condition.">
          <NumberInput
            prefix="$"
            nullable
            placeholder={rawPrice({ ...inputs, rawPriceOverride: null }).toFixed(2)}
            value={inputs.rawPriceOverride}
            onChange={(v) => update((d) => void (d.rawPriceOverride = v))}
          />
        </Field>
      </details>
    </section>
  );
}
