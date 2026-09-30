import { useEffect, useState } from 'react';
import type { Analysis } from '../lib/calc';
import { applyCard, selectVariant } from '../lib/selection';
import { getCard, imageUrl, nmPriceOf } from '../lib/tcgdex';
import type { Inputs, SelectedCard } from '../lib/types';
import type { Update } from '../App';
import { CardSection } from './CardSection';
import { CostsSection } from './CostsSection';
import { GradeOutlookSection } from './GradeOutlookSection';
import { GradersSection } from './GradersSection';
import { ResultsSection } from './ResultsSection';
import { usd } from './fields';
import { FadeImage, tilt } from './motion';

const TABS = [
  { id: 'results', label: 'Results' },
  { id: 'odds', label: 'Grade odds' },
  { id: 'prices', label: 'Prices & tiers' },
  { id: 'costs', label: 'Fees & shipping' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const fmtDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

function CardHeader({
  card,
  update,
  onRefresh,
  refreshing,
  refreshError,
}: {
  card: SelectedCard;
  update: Update;
  onRefresh: () => void;
  refreshing: boolean;
  refreshError: string | null;
}) {
  const src = imageUrl(card.image, 'high');
  const updated = fmtDate(card.pricesUpdated);
  return (
    <section className="card card-header-panel">
      <div className="card-art" {...tilt(14)}>
        {src ? <FadeImage src={src} alt={card.name} eager /> : <span className="no-art">No image</span>}
        <span className="sheen" aria-hidden="true" />
      </div>
      <div className="card-info">
        <div>
          <h2>{card.name}</h2>
          <p className="muted">
            {card.setName} · #{card.number}
            {card.rarity && ` · ${card.rarity}`}
          </p>
        </div>

        {card.variants.length > 0 ? (
          <div className="table-scroll">
            <table className="table compact price-table">
              <caption className="field-label">TCGplayer prices (Near Mint)</caption>
              <thead>
                <tr>
                  <th>Printing</th>
                  <th className="num">Market</th>
                  <th className="num">Low</th>
                  <th className="num">Mid</th>
                  <th className="num">High</th>
                </tr>
              </thead>
              <tbody>
                {card.variants.map((v) => {
                  const on = v.key === card.variantKey;
                  return (
                    <tr key={v.key} className={on ? 'highlight' : ''}>
                      <td>
                        <label className="variant-pick">
                          <input
                            type="radio"
                            name="printing"
                            checked={on}
                            onChange={() => update((d) => selectVariant(d, v.key))}
                          />
                          {v.label}
                        </label>
                      </td>
                      <td className="num strong">{v.market !== undefined ? usd(v.market) : '—'}</td>
                      <td className="num">{v.low !== undefined ? usd(v.low) : '—'}</td>
                      <td className="num">{v.mid !== undefined ? usd(v.mid) : '—'}</td>
                      <td className="num">{v.high !== undefined ? usd(v.high) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="warn">
            TCGplayer has no price for this card right now. Enter the Near Mint price below from recent sales.
          </p>
        )}

        <div className="card-meta">
          {updated && <span className="muted small">Prices updated {updated}</span>}
          {card.tcgplayerUrl && (
            <a className="link small" href={card.tcgplayerUrl} target="_blank" rel="noreferrer">
              View on TCGplayer ↗
            </a>
          )}
          <button type="button" className="link small" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh prices'}
          </button>
          {refreshError && <span className="warn small">{refreshError}</span>}
        </div>
        <p className="muted small">
          Graded sale prices aren’t in TCGplayer’s data. They’re estimated until you add recent sold prices under{' '}
          <strong>Prices &amp; tiers</strong>.
        </p>
      </div>
    </section>
  );
}

export function CardPage({
  cardId,
  inputs,
  update,
  analysis,
  onBack,
}: {
  /** Card to show, or null for a hand-entered card. */
  cardId: string | null;
  inputs: Inputs;
  update: Update;
  analysis: Analysis;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<TabId>('results');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const loaded = cardId !== null && inputs.card?.id === cardId;

  useEffect(() => {
    if (cardId === null || loaded) return;
    let live = true;
    setLoadError(null);
    getCard(cardId)
      .then((c) => live && update((d) => applyCard(d, c)))
      .catch((e: Error) => live && setLoadError(e.message));
    return () => {
      live = false;
    };
    // `update` is recreated each render; loading depends only on which card is requested.
  }, [cardId, loaded, attempt]);

  const refresh = () => {
    if (!cardId) return;
    setRefreshing(true);
    setRefreshError(null);
    getCard(cardId, undefined, { fresh: true })
      .then((c) =>
        update((d) => {
          // Keep an edited NM price; otherwise follow the new market price.
          const v = d.card?.variants.find((x) => x.key === d.card?.variantKey);
          const edited = v && nmPriceOf(v) !== undefined && Math.abs(nmPriceOf(v)! - d.nmPrice) > 0.004;
          const keep = d.nmPrice;
          applyCard(d, c, d.card?.variantKey ?? undefined);
          if (edited) d.nmPrice = keep;
        }),
      )
      .catch((e: Error) => setRefreshError(e.message))
      .finally(() => setRefreshing(false));
  };

  const back = (
    <button type="button" className="back link" onClick={onBack}>
      ← Search
    </button>
  );

  if (cardId !== null && !loaded) {
    return (
      <div className="card-page">
        {back}
        <section className="card loading-panel">
          {loadError ? (
            <>
              <p>{loadError}</p>
              <div className="alt-actions">
                <button type="button" className="secondary" onClick={() => setAttempt((a) => a + 1)}>
                  Try again
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Loading card and prices…</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="card-page">
      {back}
      {inputs.card && (
        <CardHeader
          card={inputs.card}
          update={update}
          onRefresh={refresh}
          refreshing={refreshing}
          refreshError={refreshError}
        />
      )}

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
          {tab === 'odds' && <GradeOutlookSection inputs={inputs} update={update} total={analysis.distributionTotal} />}
          {tab === 'prices' && <GradersSection inputs={inputs} update={update} />}
          {tab === 'costs' && <CostsSection inputs={inputs} update={update} />}
        </div>
      </section>
    </div>
  );
}
