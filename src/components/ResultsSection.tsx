import { Fragment, useState } from 'react';
import { CONDITION_BY_ID } from '../lib/data';
import type { Analysis, CompanyResult } from '../lib/calc';
import type { Inputs } from '../lib/types';
import { Section, pct, usd } from './fields';

function Recommendation({ analysis, inputs }: { analysis: Analysis; inputs: Inputs }) {
  const best = analysis.companies.find((c) => c.companyId === analysis.bestCompanyId);
  const card = inputs.cardName.trim() || 'this card';
  if (!best) {
    return <div className="banner neutral">Enable at least one grading company to compare.</div>;
  }
  if (analysis.recommendation === 'grade') {
    return (
      <div className="banner good">
        <strong>
          Grade {card} with {best.name} ({best.costs.tier.name})
        </strong>
        <span>
          Expected {usd(best.expectedGainVsRaw)} more than selling raw — {pct(best.roiOnGradingCost)} return on{' '}
          {usd(best.costs.total)} of grading costs, with a {pct(best.probabilityBeatsRaw)} chance the grade you get beats
          selling raw.
        </span>
      </div>
    );
  }
  return (
    <div className="banner bad">
      <strong>Sell {card} raw</strong>
      <span>
        Selling raw in {CONDITION_BY_ID[analysis.raw.condition].label} condition nets about {usd(analysis.raw.sale.net)}.
        The best grading option ({best.name}) is expected to come out {usd(-best.expectedGainVsRaw)} behind after fees.
        {best.breakEvenGrade !== null &&
          ` It only pays off at grade ${best.breakEvenGrade} or better (${pct(best.probabilityBeatsRaw)} chance).`}
      </span>
    </div>
  );
}

function GainBars({ companies }: { companies: CompanyResult[] }) {
  const extent = Math.max(1, ...companies.map((c) => Math.abs(c.expectedGainVsRaw)));
  return (
    <div className="bars" role="img" aria-label="Expected gain versus selling raw, by company">
      {companies.map((c) => {
        const w = (Math.abs(c.expectedGainVsRaw) / extent) * 50;
        const positive = c.expectedGainVsRaw >= 0;
        return (
          <div className="bar-row" key={c.companyId}>
            <span className="bar-label">{c.name}</span>
            <div className="bar-track">
              <div className="bar-axis" />
              <div
                className={`bar ${positive ? 'pos' : 'neg'}`}
                style={positive ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
              />
            </div>
            <span className={`bar-value ${positive ? 'pos-text' : 'neg'}`}>
              {positive ? '+' : ''}
              {usd(c.expectedGainVsRaw)}
            </span>
          </div>
        );
      })}
      <p className="muted small">Expected gain vs. selling raw. Left of center = you lose money by grading.</p>
    </div>
  );
}

function CompanyDetail({ c, rawNet }: { c: CompanyResult; rawNet: number }) {
  return (
    <div className="detail">
      <div className="detail-costs">
        <h4>Grading cost per card</h4>
        <dl>
          <dt>
            {c.costs.tier.name} fee{c.costs.tierAutoSelected && <span className="muted"> (auto)</span>}
          </dt>
          <dd>{usd(c.costs.gradingFee)}</dd>
          {c.costs.addOn > 0 && (
            <>
              <dt>Add-ons</dt>
              <dd>{usd(c.costs.addOn)}</dd>
            </>
          )}
          <dt>Shipping to grader</dt>
          <dd>{usd(c.costs.inboundShipping)}</dd>
          <dt>Return shipping</dt>
          <dd>{usd(c.costs.returnShipping)}</dd>
          <dt>Submission supplies</dt>
          <dd>{usd(c.costs.supplies)}</dd>
          <dt className="total">Total</dt>
          <dd className="total">{usd(c.costs.total)}</dd>
        </dl>
        <p className="muted small">
          ~{c.turnaroundDays} business days
          {c.costs.tier.maxDeclaredValue !== null && ` · declared value up to ${usd(c.costs.tier.maxDeclaredValue, 0)}`}
          {c.costs.tier.note && ` · ${c.costs.tier.note}`}
        </p>
      </div>
      <div className="detail-outcomes">
        <h4>If it grades…</h4>
        <table className="table compact">
          <thead>
            <tr>
              <th>Grade</th>
              <th className="num">Odds</th>
              <th className="num">Sells for</th>
              <th className="num">eBay fees</th>
              <th className="num">Ship + supplies</th>
              <th className="num">Net after grading</th>
              <th className="num">vs raw</th>
            </tr>
          </thead>
          <tbody>
            {c.outcomes
              .filter((o) => o.probability > 0)
              .map((o) => (
                <tr key={o.grade}>
                  <td>{o.label}</td>
                  <td className="num">{pct(o.probability)}</td>
                  <td className="num">
                    {usd(o.salePrice)}
                    {o.fromComp ? <span className="tag">comp</span> : <span className="tag muted">est.</span>}
                  </td>
                  <td className="num">{usd(o.sale.fees.total)}</td>
                  <td className="num">{usd(o.sale.postage + o.sale.materials)}</td>
                  <td className="num">{usd(o.sale.net - c.costs.total)}</td>
                  <td className={`num ${o.gainVsRaw >= 0 ? 'pos-text' : 'neg'}`}>
                    {o.gainVsRaw >= 0 ? '+' : ''}
                    {usd(o.gainVsRaw)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="muted small">Raw sale nets {usd(rawNet)} for comparison.</p>
      </div>
    </div>
  );
}

export function ResultsSection({ analysis, inputs }: { analysis: Analysis; inputs: Inputs }) {
  const [open, setOpen] = useState<string | null>(null);
  const { raw } = analysis;
  const hasBasis = inputs.costBasis !== null;
  const sorted = [...analysis.companies].sort((a, b) => b.expectedGainVsRaw - a.expectedGainVsRaw);

  return (
    <Section title="Grading ROI" subtitle="Every figure is per card, after eBay fees, postage and shipping supplies.">
      <Recommendation analysis={analysis} inputs={inputs} />
      {sorted.length > 0 && <GainBars companies={sorted} />}

      <div className="table-scroll">
        <table className="table results">
          <thead>
            <tr>
              <th>Option</th>
              <th>Tier</th>
              <th className="num">Grading cost</th>
              <th className="num">Expected sale</th>
              <th className="num">Expected net</th>
              <th className="num">Gain vs raw</th>
              <th className="num">ROI</th>
              <th className="num">Beats raw</th>
              <th className="num">Break-even</th>
              {hasBasis && <th className="num">Profit</th>}
              <th className="num">Days</th>
            </tr>
          </thead>
          <tbody>
            <tr className="raw-row">
              <td>
                <strong>Sell raw</strong> <span className="muted">({raw.condition})</span>
              </td>
              <td className="muted">—</td>
              <td className="num">{usd(0)}</td>
              <td className="num">{usd(raw.price)}</td>
              <td className="num">{usd(raw.sale.net)}</td>
              <td className="num muted">—</td>
              <td className="num muted">—</td>
              <td className="num muted">—</td>
              <td className="num muted">—</td>
              {hasBasis && (
                <td className={`num ${raw.profitVsCostBasis! >= 0 ? 'pos-text' : 'neg'}`}>
                  {usd(raw.profitVsCostBasis!)}
                </td>
              )}
              <td className="num">0</td>
            </tr>
            {sorted.map((c) => (
              <Fragment key={c.companyId}>
                <tr
                  className={`clickable ${c.companyId === analysis.bestCompanyId ? 'best' : ''}`}
                  onClick={() => setOpen(open === c.companyId ? null : c.companyId)}
                  aria-expanded={open === c.companyId}
                >
                  <td>
                    <span className="swatch" style={{ background: c.color }} />
                    <strong>{c.name}</strong>
                    {c.companyId === analysis.bestCompanyId && analysis.recommendation === 'grade' && (
                      <span className="tag good">best</span>
                    )}
                    <span className="chev">{open === c.companyId ? '▾' : '▸'}</span>
                  </td>
                  <td>{c.costs.tier.name}</td>
                  <td className="num">{usd(c.costs.total)}</td>
                  <td className="num">{usd(c.expectedSalePrice)}</td>
                  <td className="num">{usd(c.expectedNetAfterGrading)}</td>
                  <td className={`num ${c.expectedGainVsRaw >= 0 ? 'pos-text' : 'neg'}`}>
                    {c.expectedGainVsRaw >= 0 ? '+' : ''}
                    {usd(c.expectedGainVsRaw)}
                  </td>
                  <td className={`num ${c.roiOnGradingCost >= 0 ? 'pos-text' : 'neg'}`}>{pct(c.roiOnGradingCost)}</td>
                  <td className="num">{pct(c.probabilityBeatsRaw)}</td>
                  <td className="num">{c.breakEvenGrade === null ? 'never' : `${c.breakEvenGrade}+`}</td>
                  {hasBasis && (
                    <td className={`num ${c.profitVsCostBasis! >= 0 ? 'pos-text' : 'neg'}`}>
                      {usd(c.profitVsCostBasis!)}
                    </td>
                  )}
                  <td className="num">~{c.turnaroundDays}</td>
                </tr>
                {c.warnings.length > 0 && (
                  <tr className="warn-row">
                    <td colSpan={hasBasis ? 11 : 10}>⚠ {c.warnings.join(' ')}</td>
                  </tr>
                )}
                {open === c.companyId && (
                  <tr className="detail-row">
                    <td colSpan={hasBasis ? 11 : 10}>
                      <CompanyDetail c={c} rawNet={raw.sale.net} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {raw.sale.warnings.length > 0 && <p className="warn">⚠ Raw sale: {raw.sale.warnings.join(' ')}</p>}
      <p className="muted small">
        <strong>Gain vs raw</strong> = expected net from the graded sale − grading costs − what the raw sale nets.{' '}
        <strong>ROI</strong> = gain ÷ grading costs. <strong>Break-even</strong> = lowest grade that still beats selling
        raw. Click a row for the per-grade breakdown.
      </p>
    </Section>
  );
}
