import { CONDITIONS, GRADE_DISTRIBUTION_PRESETS } from '../lib/data';
import { rawPrice, saleResult } from '../lib/calc';
import type { Inputs } from '../lib/types';
import { Field, NumberInput, Section, usd } from './fields';
import type { Update } from '../App';

export function CardSection({ inputs, update }: { inputs: Inputs; update: Update }) {
  return (
    <Section title="Card" subtitle="Start with the raw Near Mint market price (e.g. TCGplayer market or recent eBay solds).">
      <div className="grid-2">
        <Field label="Card name (optional)">
          <input
            type="text"
            value={inputs.cardName}
            placeholder="e.g. Charizard ex 199/165"
            onChange={(e) => update((d) => void (d.cardName = e.target.value))}
          />
        </Field>
        <Field label="Raw Near Mint price">
          <NumberInput prefix="$" value={inputs.nmPrice} onChange={(v) => update((d) => void (d.nmPrice = v ?? 0))} />
        </Field>
      </div>

      <div className="field">
        <span className="field-label">Your card’s condition</span>
        <div className="segmented" role="radiogroup" aria-label="Condition">
          {CONDITIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={inputs.condition === c.id}
              className={inputs.condition === c.id ? 'active' : ''}
              title={c.description}
              onClick={() =>
                update((d) => {
                  d.condition = c.id;
                  d.gradeDistribution = { ...GRADE_DISTRIBUTION_PRESETS[c.id] };
                  d.distributionIsPreset = true;
                })
              }
            >
              <strong>{c.id}</strong>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <span className="field-hint">
          {CONDITIONS.find((c) => c.id === inputs.condition)?.description} Changing condition also resets the likely
          grades below.
        </span>
      </div>

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
            const nmNet = saleResult(inputs.nmPrice, inputs.rawSale, inputs.ebay, false).net;
            return (
              <tr key={c.id} className={inputs.condition === c.id ? 'highlight' : ''}>
                <td>
                  {c.label} <span className="muted">({c.id})</span>
                </td>
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

      <div className="grid-2">
        <Field label="Raw price override (optional)" hint="Use if you have actual sold comps for this condition.">
          <NumberInput
            prefix="$"
            nullable
            placeholder={rawPrice({ ...inputs, rawPriceOverride: null }).toFixed(2)}
            value={inputs.rawPriceOverride}
            onChange={(v) => update((d) => void (d.rawPriceOverride = v))}
          />
        </Field>
        <Field label="What you paid (optional)" hint="Adds total profit figures to the results.">
          <NumberInput
            prefix="$"
            nullable
            placeholder="—"
            value={inputs.costBasis}
            onChange={(v) => update((d) => void (d.costBasis = v))}
          />
        </Field>
      </div>
    </Section>
  );
}
