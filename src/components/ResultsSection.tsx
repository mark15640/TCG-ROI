import { useEffect, useRef, useState } from 'react';
import { CONDITION_BY_ID } from '../lib/data';
import type { Analysis, CompanyResult, RawResult } from '../lib/calc';
import type { CompanyId, Inputs } from '../lib/types';
import { pct, usd } from './fields';

const signed = (n: number) => `${n >= 0 ? '+' : ''}${usd(n)}`;

function Recommendation({ analysis, inputs }: { analysis: Analysis; inputs: Inputs }) {
  const best = analysis.companies.find((c) => c.companyId === analysis.bestCompanyId);
  const card = inputs.cardName.trim() || 'this card';
  if (!best) {
    return <div className="banner neutral">Pick at least one grading company above to see results.</div>;
  }
  if (analysis.recommendation === 'grade') {
    return (
      <div className="banner good">
        <span className="banner-kicker">Recommendation</span>
        <strong>
          Grade {card} with {best.name}
        </strong>
        <span>
          Expected {usd(best.expectedGainVsRaw)} more than selling raw, a {pct(best.roiOnGradingCost)} return on{' '}
          {usd(best.costs.total)} in grading costs.
        </span>
      </div>
    );
  }
  return (
    <div className="banner bad">
      <span className="banner-kicker">Recommendation</span>
      <strong>Sell {card} raw</strong>
      <span>
        {analysis.companies.length > 1 ? `The best option, ${best.name},` : `Grading with ${best.name}`} is expected to
        come out {usd(-best.expectedGainVsRaw)} behind selling raw.
        {best.breakEvenGrade !== null &&
          ` It only pays off at a ${best.breakEvenGrade} or better (${pct(best.probabilityBeatsRaw)} chance).`}
      </span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone === 'pos' ? 'pos-text' : tone === 'neg' ? 'neg' : ''}`}>{value}</span>
    </div>
  );
}

function RawCard({ raw, hasBasis }: { raw: RawResult; hasBasis: boolean }) {
  return (
    <div className="option raw">
      <div className="option-head">
        <strong>Sell raw</strong>
        <span className="muted small">{CONDITION_BY_ID[raw.condition].label}</span>
      </div>
      <div className="option-big">
        {usd(raw.sale.net)}
        <span className="muted small">net</span>
      </div>
      <div className="stats">
        <Stat label="Sale price" value={usd(raw.price)} />
        <Stat label="eBay fees" value={usd(raw.sale.fees.total)} />
        <Stat label="Ship + supplies" value={usd(raw.sale.postage + raw.sale.materials)} />
        {hasBasis && (
          <Stat
            label="Profit"
            value={usd(raw.profitVsCostBasis!)}
            tone={raw.profitVsCostBasis! >= 0 ? 'pos' : 'neg'}
          />
        )}
      </div>
    </div>
  );
}

function CompanyCard({
  c,
  best,
  hasBasis,
  selected,
  onSelect,
}: {
  c: CompanyResult;
  best: boolean;
  hasBasis: boolean;
  selected: boolean;
  onSelect?: () => void;
}) {
  const good = c.expectedGainVsRaw >= 0;
  return (
    <div className={`option ${selected ? 'selected' : ''} ${best ? 'best' : ''}`}>
      <div className="option-head">
        <strong>
          <span className="swatch" style={{ background: c.color }} />
          {c.name}
        </strong>
        {best && <span className="tag good">Best</span>}
        <span className="muted small">
          {c.costs.tier.name} · ~{c.turnaroundDays} days
        </span>
      </div>
      <div className={`option-big ${good ? 'pos-text' : 'neg'}`}>
        {signed(c.expectedGainVsRaw)}
        <span className="muted small">vs raw</span>
      </div>
      <div className="stats">
        <Stat label="ROI" value={pct(c.roiOnGradingCost)} tone={good ? 'pos' : 'neg'} />
        <Stat label="Grading cost" value={usd(c.costs.total)} />
        <Stat label="Beats raw" value={pct(c.probabilityBeatsRaw)} />
        <Stat label="Break-even" value={c.breakEvenGrade === null ? 'Never' : `${c.breakEvenGrade}+`} />
        {hasBasis && (
          <Stat
            label="Profit"
            value={usd(c.profitVsCostBasis!)}
            tone={c.profitVsCostBasis! >= 0 ? 'pos' : 'neg'}
          />
        )}
      </div>
      {c.warnings.length > 0 && <p className="option-warn">⚠ {c.warnings.join(' ')}</p>}
      {onSelect && (
        <button type="button" className="link" onClick={onSelect} aria-expanded={selected}>
          {selected ? 'Hide breakdown' : 'Show breakdown'}
        </button>
      )}
    </div>
  );
}

function CompanyDetail({ c, rawNet }: { c: CompanyResult; rawNet: number }) {
  return (
    <div className="detail">
      <div className="detail-outcomes">
        <h4>{c.name}: if it grades…</h4>
        <div className="table-scroll">
          <table className="table compact">
            <thead>
              <tr>
                <th>Grade</th>
                <th className="num">Odds</th>
                <th className="num">Sells for</th>
                <th className="num">You keep</th>
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
                      {!o.fromComp && <span className="est">est.</span>}
                    </td>
                    <td className="num">{usd(o.sale.net - c.costs.total)}</td>
                    <td className={`num ${o.gainVsRaw >= 0 ? 'pos-text' : 'neg'}`}>{signed(o.gainVsRaw)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          “You keep” is after eBay fees, postage, supplies and grading costs. Selling raw keeps {usd(rawNet)}.
        </p>
      </div>
      <div className="detail-costs">
        <h4>Grading cost per card</h4>
        <dl>
          <dt>
            {c.costs.tier.name} tier{c.costs.tierAutoSelected && <span className="muted"> (auto)</span>}
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
      </div>
    </div>
  );
}

export function ResultsSection({ analysis, inputs }: { analysis: Analysis; inputs: Inputs }) {
  const [openId, setOpenId] = useState<CompanyId | null>(null);
  const hasBasis = inputs.costBasis !== null;
  const sorted = [...analysis.companies].sort((a, b) => b.expectedGainVsRaw - a.expectedGainVsRaw);
  const single = sorted.length === 1;
  const detail = single ? sorted[0] : sorted.find((c) => c.companyId === openId);
  const showBest = !single && analysis.recommendation === 'grade';
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openId) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [openId]);

  return (
    <div className="results">
      <Recommendation analysis={analysis} inputs={inputs} />

      <div className="options">
        <RawCard raw={analysis.raw} hasBasis={hasBasis} />
        {sorted.map((c) => (
          <CompanyCard
            key={c.companyId}
            c={c}
            best={showBest && c.companyId === analysis.bestCompanyId}
            hasBasis={hasBasis}
            selected={!single && detail?.companyId === c.companyId}
            onSelect={single ? undefined : () => setOpenId(openId === c.companyId ? null : c.companyId)}
          />
        ))}
      </div>

      {detail && (
        <div ref={detailRef}>
          <CompanyDetail c={detail} rawNet={analysis.raw.sale.net} />
        </div>
      )}
      {analysis.raw.sale.warnings.length > 0 && (
        <p className="warn small">⚠ Raw sale: {analysis.raw.sale.warnings.join(' ')}</p>
      )}

      <details className="disclosure">
        <summary>How is this calculated?</summary>
        <p className="muted small">
          Every figure is per card, after eBay fees, postage and shipping supplies. <strong>vs raw</strong> is the
          expected graded sale (weighted by your grade odds) minus grading costs, minus what selling raw would net.{' '}
          <strong>ROI</strong> is that gain divided by grading costs. <strong>Beats raw</strong> is the chance you land
          a grade that comes out ahead, and <strong>Break-even</strong> is the lowest grade that does.
        </p>
      </details>
    </div>
  );
}
