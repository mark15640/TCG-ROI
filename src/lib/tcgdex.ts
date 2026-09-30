// Card search and prices from TCGdex (https://tcgdex.dev), a free, keyless Pokémon TCG API whose
// `pricing.tcgplayer` block carries TCGplayer prices (USD, refreshed hourly).
import type { PriceVariant } from './types';

export const TCGDEX_API = 'https://api.tcgdex.net/v2/en';

export interface SetInfo {
  id: string;
  name: string;
  /** Printed set size, e.g. the 165 in 199/165. */
  official?: number;
  /** Position in TCGdex's set list; higher is newer. */
  order: number;
}

export interface CardSummary {
  id: string;
  localId: string;
  name: string;
  image?: string;
  setId: string;
  setName: string;
  /** "199/165" style number when the set size is known. */
  number: string;
  setOrder: number;
}

export interface CardDetail extends CardSummary {
  rarity?: string;
  illustrator?: string;
  variants: PriceVariant[];
  pricesUpdated?: string;
  tcgplayerUrl?: string;
}

export class TcgdexError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'not-found' | 'bad-response',
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

async function getJson<T>(path: string, signal?: AbortSignal, fetchImpl: Fetch = fetch): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(`${TCGDEX_API}${path}`, { signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new TcgdexError(
      import.meta.env.MODE === 'single'
        ? 'Card search isn’t available in this preview because it can’t reach the internet. Enter the card by hand, or use the full website.'
        : 'Couldn’t reach the card database. Check your connection and try again.',
      'network',
    );
  }
  if (res.status === 404) throw new TcgdexError('That card wasn’t found.', 'not-found');
  if (!res.ok) throw new TcgdexError(`The card database returned an error (${res.status}).`, 'bad-response');
  return (await res.json()) as T;
}

/** "sv03.5-199" → "sv03.5". Set ids can contain dashes, the local id never does. */
export function setIdOf(cardId: string): string {
  const i = cardId.lastIndexOf('-');
  return i > 0 ? cardId.slice(0, i) : cardId;
}

export function imageUrl(image: string | undefined, quality: 'low' | 'high'): string | undefined {
  return image ? `${image}/${quality}.webp` : undefined;
}

// ---- Sets (fetched once, used to label and sort search results) ----

let setsPromise: Promise<Map<string, SetInfo>> | null = null;

export function fetchSets(fetchImpl?: Fetch): Promise<Map<string, SetInfo>> {
  if (!setsPromise) {
    setsPromise = getJson<Array<{ id: string; name: string; cardCount?: { official?: number; total?: number } }>>(
      '/sets',
      undefined,
      fetchImpl,
    )
      .then((sets) => new Map(sets.map((s, order) => [s.id, { id: s.id, name: s.name, official: s.cardCount?.official, order }])))
      .catch((e) => {
        setsPromise = null; // allow a retry
        throw e;
      });
  }
  return setsPromise;
}

function summarize(
  raw: { id: string; localId: string; name: string; image?: string },
  sets: Map<string, SetInfo>,
  setOverride?: { id: string; name: string; cardCount?: { official?: number } },
): CardSummary {
  const setId = setOverride?.id ?? setIdOf(raw.id);
  const set = sets.get(setId);
  const setName = setOverride?.name ?? set?.name ?? setId;
  const official = setOverride?.cardCount?.official ?? set?.official;
  return {
    id: raw.id,
    localId: raw.localId,
    name: raw.name,
    image: raw.image,
    setId,
    setName,
    number: official ? `${raw.localId}/${official}` : raw.localId,
    setOrder: set?.order ?? -1,
  };
}

// ---- Search ----

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((t) => t.replace(/^#/, ''))
    .filter(Boolean);
}

/** The word sent to the API as a name filter: the first token with letters in it. */
export function nameTerm(query: string): string | null {
  return tokenize(query).find((t) => /[a-z]{2,}/.test(t)) ?? null;
}

const stripZeros = (s: string) => s.replace(/^0+(?=\d)/, '');

/** Narrows results locally: every word must match the card name, set name or card number. */
export function matchesQuery(card: CardSummary, tokens: string[]): boolean {
  const name = normalize(card.name);
  const set = normalize(card.setName);
  const local = stripZeros(normalize(card.localId));
  return tokens.every((t) => {
    if (/^\d+\/\d+$/.test(t)) {
      const [n, total] = t.split('/');
      return local === stripZeros(n) && card.number.endsWith(`/${stripZeros(total)}`);
    }
    if (/^\d+$/.test(t)) return local === stripZeros(t) || set.split(/\W+/).includes(t);
    return name.includes(t) || set.includes(t) || normalize(card.localId) === t;
  });
}

const searchCache = new Map<string, Promise<CardSummary[]>>();
const settledSearches = new Map<string, CardSummary[]>();

/** Cards whose name contains the query's first word, newest sets first. */
export function fetchByName(term: string, signal?: AbortSignal, fetchImpl?: Fetch): Promise<CardSummary[]> {
  const cached = searchCache.get(term);
  if (cached) return cached;
  const p = Promise.all([
    fetchSets(fetchImpl),
    getJson<Array<{ id: string; localId: string; name: string; image?: string }>>(
      `/cards?name=${encodeURIComponent(term)}`,
      signal,
      fetchImpl,
    ),
  ])
    .then(([sets, cards]) =>
      cards
        .map((c) => summarize(c, sets))
        .sort((a, b) => b.setOrder - a.setOrder || a.localId.localeCompare(b.localId, undefined, { numeric: true })),
    )
    .then((list) => {
      settledSearches.set(term, list);
      return list;
    })
    .catch((e) => {
      searchCache.delete(term);
      throw e;
    });
  searchCache.set(term, p);
  return p;
}

/** Results for a query that can be answered from memory right now, else null. */
export function peekSearch(query: string): CardSummary[] | null {
  const term = nameTerm(query);
  const list = term ? settledSearches.get(term) : undefined;
  if (!list) return null;
  const tokens = tokenize(query);
  return list.filter((c) => matchesQuery(c, tokens));
}

export async function searchCards(query: string, signal?: AbortSignal, fetchImpl?: Fetch): Promise<CardSummary[]> {
  const term = nameTerm(query);
  if (!term) return [];
  const cards = await fetchByName(term, signal, fetchImpl);
  const tokens = tokenize(query);
  return cards.filter((c) => matchesQuery(c, tokens));
}

// ---- Card detail and prices ----

const VARIANT_LABELS: Record<string, string> = {
  normal: 'Normal',
  holo: 'Holofoil',
  holofoil: 'Holofoil',
  reverse: 'Reverse Holofoil',
  'reverse-holofoil': 'Reverse Holofoil',
  reverseholofoil: 'Reverse Holofoil',
  '1st-edition': '1st Edition',
  '1st-edition-holofoil': '1st Edition Holofoil',
  '1steditionholofoil': '1st Edition Holofoil',
  '1st-edition-normal': '1st Edition',
  unlimited: 'Unlimited',
  'unlimited-holofoil': 'Unlimited Holofoil',
  unlimitedholofoil: 'Unlimited Holofoil',
};

export function variantLabel(key: string): string {
  const k = key.toLowerCase();
  if (VARIANT_LABELS[k]) return VARIANT_LABELS[k];
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

/**
 * Reads TCGplayer prices from a card's `pricing.tcgplayer` block. Every object with a price
 * field is treated as one printing, so new or differently named printings still come through.
 */
export function parseTcgplayerPricing(tcgplayer: unknown): { variants: PriceVariant[]; updated?: string; productId?: number } {
  if (!tcgplayer || typeof tcgplayer !== 'object') return { variants: [] };
  const block = tcgplayer as Record<string, unknown>;
  const variants: PriceVariant[] = [];
  let productId: number | undefined;
  for (const [key, value] of Object.entries(block)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const variant: PriceVariant = {
      key,
      label: variantLabel(key),
      low: num(v.lowPrice ?? v.low),
      mid: num(v.midPrice ?? v.mid),
      high: num(v.highPrice ?? v.high),
      market: num(v.marketPrice ?? v.market),
      directLow: num(v.directLowPrice ?? v.directLow),
    };
    if (variant.market ?? variant.mid ?? variant.low ?? variant.high) {
      variants.push(variant);
      productId ??= num(v.productId);
    }
  }
  const updated = typeof block.updated === 'string' ? block.updated : undefined;
  return { variants, updated, productId };
}

/** Near Mint price for a printing: market price, falling back to mid, then low. */
export function nmPriceOf(v: PriceVariant): number | undefined {
  return v.market ?? v.mid ?? v.low;
}

/** Normal printings first, reverse holos last. */
export function defaultVariant(variants: PriceVariant[]): PriceVariant | undefined {
  return variants.find((v) => !/reverse/i.test(v.key)) ?? variants[0];
}

interface RawCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  rarity?: string;
  illustrator?: string;
  set?: { id: string; name: string; cardCount?: { official?: number } };
  thirdParty?: { tcgplayer?: number };
  pricing?: { tcgplayer?: unknown };
}

const detailCache = new Map<string, Promise<CardDetail>>();

export function getCard(id: string, fetchImpl?: Fetch, { fresh = false } = {}): Promise<CardDetail> {
  const cached = detailCache.get(id);
  if (cached && !fresh) return cached;
  const p = Promise.all([fetchSets(fetchImpl).catch(() => new Map<string, SetInfo>()), getJson<RawCard>(`/cards/${encodeURIComponent(id)}`, undefined, fetchImpl)])
    .then(([sets, raw]) => {
      const { variants, updated, productId } = parseTcgplayerPricing(raw.pricing?.tcgplayer);
      const tcgId = productId ?? raw.thirdParty?.tcgplayer;
      return {
        ...summarize(raw, sets, raw.set),
        rarity: raw.rarity,
        illustrator: raw.illustrator,
        variants,
        pricesUpdated: updated,
        tcgplayerUrl: tcgId ? `https://www.tcgplayer.com/product/${tcgId}` : undefined,
      };
    })
    .catch((e) => {
      detailCache.delete(id);
      throw e;
    });
  detailCache.set(id, p);
  return p;
}

/** Test hook: clears the in-memory caches. */
export function clearTcgdexCaches() {
  setsPromise = null;
  searchCache.clear();
  settledSearches.clear();
  detailCache.clear();
}
