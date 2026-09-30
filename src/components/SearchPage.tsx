import { useEffect, useRef, useState } from 'react';
import { EXAMPLES } from '../lib/examples';
import { defaultVariant, getCard, imageUrl, nameTerm, nmPriceOf, peekSearch, searchCards, type CardSummary } from '../lib/tcgdex';
import { usd } from './fields';

const PAGE = 24;
const SUGGESTIONS = ['charizard 151', 'pikachu', 'umbreon', 'mew ex', 'gengar'];

// Prices need one request per card, so only a few run at a time.
const MAX_PRICE_REQUESTS = 4;
let active = 0;
const waiting: Array<() => void> = [];
function queued<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      task()
        .then(resolve, reject)
        .finally(() => {
          active--;
          waiting.shift()?.();
        });
    };
    if (active < MAX_PRICE_REQUESTS) run();
    else waiting.push(run);
  });
}

function PriceTag({ id }: { id: string }) {
  const [price, setPrice] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    queued(() => getCard(id))
      .then((c) => {
        const v = defaultVariant(c.variants);
        if (live) setPrice(v ? (nmPriceOf(v) ?? null) : null);
      })
      .catch(() => live && setPrice(null));
    return () => {
      live = false;
    };
  }, [id]);
  if (price === undefined) return <span className="price-tag muted">…</span>;
  if (price === null) return <span className="price-tag muted">No price</span>;
  return <span className="price-tag">{usd(price)}</span>;
}

function ResultTile({ card, onOpen }: { card: CardSummary; onOpen: () => void }) {
  const src = imageUrl(card.image, 'low');
  return (
    <button type="button" className="result" onClick={onOpen}>
      <span className="result-art">
        {src ? <img src={src} alt="" loading="lazy" /> : <span className="no-art">No image</span>}
      </span>
      <span className="result-name">{card.name}</span>
      <span className="result-set">{card.setName}</span>
      <span className="result-foot">
        <span className="result-num">#{card.number}</span>
        <PriceTag id={card.id} />
      </span>
    </button>
  );
}

export function SearchPage({
  query,
  setQuery,
  onOpenCard,
  onManual,
  onExample,
}: {
  query: string;
  setQuery: (q: string) => void;
  onOpenCard: (id: string) => void;
  onManual: () => void;
  onExample: (id: string) => void;
}) {
  const [results, setResults] = useState<CardSummary[] | null>(() => peekSearch(query));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const term = nameTerm(query);

  useEffect(() => {
    setShown(PAGE);
    if (!term) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    const known = peekSearch(query);
    if (known) {
      // Already fetched this name: narrow instantly, no request.
      setResults(known);
      setError(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchCards(query, ctrl.signal)
        .then((r) => {
          setResults(r);
          setError(null);
        })
        .catch((e: Error) => {
          if (e.name === 'AbortError') return;
          setError(e.message);
          setResults(null);
        })
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, term, attempt]);

  return (
    <div className="search-page">
      <section className="search-hero">
        <h2>Find your card</h2>
        <p className="muted">Search by name, then add the set or number to narrow it down.</p>
        <div className="search-box">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            id="card-search"
            type="search"
            value={query}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. charizard 151, or charizard 199/165"
            aria-label="Search for a card"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="icon clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          )}
        </div>
        <p className="muted small">Pokémon cards · prices from TCGplayer via TCGdex</p>
      </section>

      {!term && (
        <div className="search-idle">
          {query.trim() && <p className="muted">Add the card’s name, e.g. “charizard {query.trim()}”.</p>}
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => setQuery(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="alt-actions">
            <button type="button" className="link" onClick={onManual}>
              Enter a card by hand
            </button>
            {EXAMPLES.map((ex) => (
              <button key={ex.id} type="button" className="link" onClick={() => onExample(ex.id)}>
                Worked example: {ex.cardName} with graded sold prices
              </button>
            ))}
          </div>
        </div>
      )}

      {term && error && (
        <div className="search-message">
          <p>{error}</p>
          <div className="alt-actions">
            <button type="button" className="secondary" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
            <button type="button" className="link" onClick={onManual}>
              Enter the card by hand instead
            </button>
          </div>
        </div>
      )}

      {term && !error && results === null && loading && <p className="search-message muted">Searching…</p>}

      {term && !error && results && (
        <>
          <p className="result-count muted small" aria-live="polite">
            {results.length === 0
              ? `No cards match “${query.trim()}”.`
              : `${results.length} card${results.length === 1 ? '' : 's'}${loading ? ' · updating…' : ''}`}
          </p>
          {results.length === 0 && (
            <div className="alt-actions">
              <button type="button" className="link" onClick={onManual}>
                Enter the card by hand instead
              </button>
            </div>
          )}
          <div className="results-grid">
            {results.slice(0, shown).map((c) => (
              <ResultTile key={c.id} card={c} onOpen={() => onOpenCard(c.id)} />
            ))}
          </div>
          {results.length > shown && (
            <button type="button" className="secondary more" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({results.length - shown} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}
