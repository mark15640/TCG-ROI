import { SHIPPING_METHODS } from '../lib/data';
import { materialsCost } from '../lib/calc';
import type { Inputs, SaleSetup } from '../lib/types';
import { Field, NumberInput, PercentInput, Section, usd } from './fields';
import type { Update } from '../App';

type SaleKey = 'rawSale' | 'gradedSale';

function SaleSetupEditor({ inputs, update, which }: { inputs: Inputs; update: Update; which: SaleKey }) {
  const setup: SaleSetup = inputs[which];
  const isSlab = which === 'gradedSale';
  return (
    <div className="sale-setup">
      <h3>{isSlab ? 'Shipping a graded slab' : 'Shipping a raw card'}</h3>
      <div className="grid-2 tight">
        <Field label="Shipping method">
          <select
            value={setup.shippingMethodId}
            onChange={(e) => update((d) => void (d[which].shippingMethodId = e.target.value))}
          >
            {SHIPPING_METHODS.filter((m) => !isSlab || m.allowsSlabs).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {usd(m.postage)}
                {m.maxSaleValue !== null ? ` (≤${usd(m.maxSaleValue, 0)})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shipping charged to buyer" hint="$0 = free shipping.">
          <NumberInput
            prefix="$"
            value={setup.shippingCharged}
            onChange={(v) => update((d) => void (d[which].shippingCharged = v ?? 0))}
          />
        </Field>
      </div>

      <div className="table-scroll">
      <table className="table compact materials">
        <thead>
          <tr>
            <th>Supply</th>
            <th className="num">Unit cost</th>
            <th className="num">Qty</th>
            <th className="num">Cost</th>
            <th aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {setup.materials.map((m, i) => (
            <tr key={m.id}>
              <td>
                <input
                  type="text"
                  value={m.name}
                  aria-label="Supply name"
                  onChange={(e) => update((d) => void (d[which].materials[i].name = e.target.value))}
                />
              </td>
              <td className="num">
                <NumberInput
                  className="cell"
                  prefix="$"
                  value={m.unitCost}
                  ariaLabel={`${m.name} unit cost`}
                  onChange={(v) => update((d) => void (d[which].materials[i].unitCost = v ?? 0))}
                />
              </td>
              <td className="num">
                <NumberInput
                  className="cell qty"
                  step={1}
                  value={m.qty}
                  ariaLabel={`${m.name} quantity`}
                  onChange={(v) => update((d) => void (d[which].materials[i].qty = v ?? 0))}
                />
              </td>
              <td className="num">{usd(m.unitCost * m.qty)}</td>
              <td>
                <button
                  type="button"
                  className="icon"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => update((d) => void d[which].materials.splice(i, 1))}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <button
                type="button"
                className="link"
                onClick={() =>
                  update((d) =>
                    void d[which].materials.push({
                      id: `custom-${Date.now()}`,
                      name: 'New supply',
                      unitCost: 0,
                      qty: 1,
                    }),
                  )
                }
              >
                + Add supply
              </button>
            </td>
            <td colSpan={2} className="num muted">
              Supplies total
            </td>
            <td className="num">
              <strong>{usd(materialsCost(setup.materials))}</strong>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}

export function CostsSection({ inputs, update }: { inputs: Inputs; update: Update }) {
  const e = inputs.ebay;
  return (
    <Section
      title="Selling & shipping costs"
      subtitle="eBay fees, postage and supplies for the final sale, plus the cost of getting cards to and from the grader."
    >
      <h3>eBay fees</h3>
      <div className="grid-4">
        <Field label="Final value fee" hint={`On order total up to ${usd(e.fvfThreshold, 0)}`}>
          <PercentInput value={e.fvfRate} onChange={(v) => update((d) => void (d.ebay.fvfRate = v))} />
        </Field>
        <Field label="Fee above threshold">
          <PercentInput value={e.fvfRateAbove} onChange={(v) => update((d) => void (d.ebay.fvfRateAbove = v))} />
        </Field>
        <Field label="Per-order fee" hint={`${usd(e.perOrderFeeLow)} if ≤ ${usd(e.perOrderFeeCutoff, 0)}`}>
          <NumberInput
            prefix="$"
            value={e.perOrderFeeHigh}
            onChange={(v) => update((d) => void (d.ebay.perOrderFeeHigh = v ?? 0))}
          />
        </Field>
        <Field label="Promoted listing rate" hint="0% if not promoting">
          <PercentInput value={e.promotedRate} onChange={(v) => update((d) => void (d.ebay.promotedRate = v))} />
        </Field>
        <Field label="Buyer sales tax" hint="eBay’s fee applies to tax too">
          <PercentInput value={e.salesTaxRate} onChange={(v) => update((d) => void (d.ebay.salesTaxRate = v))} />
        </Field>
      </div>

      <div className="grid-2 split">
        <SaleSetupEditor inputs={inputs} update={update} which="rawSale" />
        <SaleSetupEditor inputs={inputs} update={update} which="gradedSale" />
      </div>

      <h3>Sending cards to the grader</h3>
      <div className="grid-4">
        <Field label="Shipping to grader" hint="Per submission, insured">
          <NumberInput
            prefix="$"
            value={inputs.inboundShippingPerSubmission}
            onChange={(v) => update((d) => void (d.inboundShippingPerSubmission = v ?? 0))}
          />
        </Field>
        <Field label="Cards per submission" hint="Shipping is split across these">
          <NumberInput
            step={1}
            min={1}
            value={inputs.cardsPerSubmission}
            onChange={(v) => update((d) => void (d.cardsPerSubmission = Math.max(1, v ?? 1)))}
          />
        </Field>
        <Field label="Submission supplies / card" hint="Card saver, sleeve">
          <NumberInput
            prefix="$"
            value={inputs.submissionSuppliesPerCard}
            onChange={(v) => update((d) => void (d.submissionSuppliesPerCard = v ?? 0))}
          />
        </Field>
      </div>
    </Section>
  );
}
