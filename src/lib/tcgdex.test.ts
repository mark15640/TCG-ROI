import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultInputs } from './data';
import { applyCard, selectVariant } from './selection';
import {
  TCGDEX_API,
  clearTcgdexCaches,
  defaultVariant,
  getCard,
  matchesQuery,
  nameTerm,
  parseTcgplayerPricing,
  peekSearch,
  searchCards,
  setIdOf,
  type CardSummary,
} from './tcgdex';

const SETS = [
  { id: 'base1', name: 'Base Set', cardCount: { official: 102, total: 102 } },
  { id: 'sv03.5', name: '151', cardCount: { official: 165, total: 207 } },
  { id: 'sv03', name: 'Obsidian Flames', cardCount: { official: 197, total: 230 } },
];

const CHARIZARDS = [
  { id: 'base1-4', localId: '4', name: 'Charizard', image: 'https://assets.tcgdex.net/en/base/base1/4' },
  { id: 'sv03.5-006', localId: '006', name: 'Charizard ex', image: 'https://assets.tcgdex.net/en/sv/sv03.5/006' },
  { id: 'sv03.5-199', localId: '199', name: 'Charizard ex', image: 'https://assets.tcgdex.net/en/sv/sv03.5/199' },
  { id: 'sv03-125', localId: '125', name: 'Charizard ex', image: 'https://assets.tcgdex.net/en/sv/sv03/125' },
];

const DETAIL_199 = {
  id: 'sv03.5-199',
  localId: '199',
  name: 'Charizard ex',
  image: 'https://assets.tcgdex.net/en/sv/sv03.5/199',
  rarity: 'Special illustration rare',
  set: { id: 'sv03.5', name: '151', cardCount: { official: 165, total: 207 } },
  pricing: {
    tcgplayer: {
      updated: '2026-09-30T20:00:00.000Z',
      unit: 'USD',
      holofoil: { productId: 517045, lowPrice: 300, midPrice: 360, highPrice: 900, marketPrice: 353.06, directLowPrice: null },
    },
  },
};

function mockFetch() {
  return vi.fn(async (url: string) => {
    const path = url.replace(TCGDEX_API, '');
    let body: unknown;
    if (path === '/sets') body = SETS;
    else if (path.startsWith('/cards?name=')) body = CHARIZARDS;
    else if (path === '/cards/sv03.5-199') body = DETAIL_199;
    else return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
}

beforeEach(() => clearTcgdexCaches());

describe('query parsing', () => {
  it('uses the first word with letters as the API name filter', () => {
    expect(nameTerm('charizard 151')).toBe('charizard');
    expect(nameTerm('151 charizard')).toBe('charizard');
    expect(nameTerm('199/165')).toBeNull();
    expect(nameTerm('Pokémon')).toBe('pokemon');
  });

  it('splits the set id off a card id', () => {
    expect(setIdOf('sv03.5-199')).toBe('sv03.5');
    expect(setIdOf('base1-4')).toBe('base1');
  });
});

describe('searchCards', () => {
  it('labels cards with their set and sorts newest sets first', async () => {
    const f = mockFetch();
    const r = await searchCards('charizard', undefined, f);
    expect(r.map((c) => c.id)).toEqual(['sv03-125', 'sv03.5-006', 'sv03.5-199', 'base1-4']);
    expect(r.find((c) => c.id === 'sv03.5-199')).toMatchObject({ setName: '151', number: '199/165' });
  });

  it('narrows by set name, number, or number/total', async () => {
    const f = mockFetch();
    const ids = async (q: string) => (await searchCards(q, undefined, f)).map((c) => c.id);
    expect(await ids('charizard 151')).toEqual(['sv03.5-006', 'sv03.5-199']);
    expect(await ids('charizard 199')).toEqual(['sv03.5-199']);
    expect(await ids('charizard 199/165')).toEqual(['sv03.5-199']);
    expect(await ids('charizard 6')).toEqual(['sv03.5-006']);
    expect(await ids('charizard obsidian')).toEqual(['sv03-125']);
    expect(await ids('charizard ex')).toHaveLength(3);
    expect(await ids('charizard vmax')).toEqual([]);
  });

  it('asks the API once per name and narrows locally after that', async () => {
    const f = mockFetch();
    await searchCards('charizard', undefined, f);
    await searchCards('charizard 151', undefined, f);
    await searchCards('charizard 199', undefined, f);
    const cardCalls = (f as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([u]) => String(u).includes('/cards?'));
    expect(cardCalls).toHaveLength(1);
  });

  it('reports a network failure', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(searchCards('pikachu', undefined, f)).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('matchesQuery', () => {
  const card: CardSummary = {
    id: 'sv03.5-199',
    localId: '199',
    name: 'Charizard ex',
    setId: 'sv03.5',
    setName: '151',
    number: '199/165',
    setOrder: 1,
  };
  it('ignores case, accents and a leading #', () => {
    expect(matchesQuery(card, ['charizard', '#199'].map((t) => t.replace(/^#/, '')))).toBe(true);
    expect(matchesQuery({ ...card, name: 'Flabébé' }, ['flabebe'])).toBe(true);
  });
});

describe('prices', () => {
  it('reads TCGplayer prices per printing', () => {
    const { variants, updated, productId } = parseTcgplayerPricing(DETAIL_199.pricing.tcgplayer);
    expect(updated).toBe('2026-09-30T20:00:00.000Z');
    expect(productId).toBe(517045);
    expect(variants).toEqual([
      { key: 'holofoil', label: 'Holofoil', low: 300, mid: 360, high: 900, market: 353.06, directLow: undefined },
    ]);
  });

  it('accepts other printing names and field spellings, skipping empty ones', () => {
    const { variants } = parseTcgplayerPricing({
      unit: 'USD',
      normal: { market: 0.25, low: 0.05 },
      'reverse-holofoil': { marketPrice: 1.1 },
      '1stEditionHolofoil': { marketPrice: 500 },
      holo: { marketPrice: null },
    });
    expect(variants.map((v) => [v.label, v.market])).toEqual([
      ['Normal', 0.25],
      ['Reverse Holofoil', 1.1],
      ['1st Edition Holofoil', 500],
    ]);
    expect(defaultVariant(variants)?.key).toBe('normal');
    expect(parseTcgplayerPricing(undefined).variants).toEqual([]);
  });

  it('prefers a non-reverse printing', () => {
    const { variants } = parseTcgplayerPricing({ reverse: { marketPrice: 2 }, holofoil: { marketPrice: 5 } });
    expect(defaultVariant(variants)?.key).toBe('holofoil');
  });
});

describe('loading a card into the calculator', () => {
  it('fills the NM price from the market price and clears the previous card’s comps', async () => {
    const detail = await getCard('sv03.5-199', mockFetch());
    expect(detail.tcgplayerUrl).toBe('https://www.tcgplayer.com/product/517045');

    const inputs = defaultInputs();
    inputs.companies.PSA.compOverrides = { 10: 999 };
    inputs.ebay.promotedRate = 0.05;
    inputs.condition = 'LP';
    applyCard(inputs, detail);

    expect(inputs.nmPrice).toBe(353.06);
    expect(inputs.cardName).toBe('Charizard ex 199/165 (151)');
    expect(inputs.card).toMatchObject({ id: 'sv03.5-199', variantKey: 'holofoil', setName: '151' });
    expect(inputs.companies.PSA.compOverrides).toEqual({});
    expect(inputs.condition).toBe('NM');
    expect(inputs.ebay.promotedRate).toBe(0.05);

    // Re-applying the same card (a price refresh) keeps comps and condition.
    inputs.companies.PSA.compOverrides = { 10: 1410 };
    inputs.condition = 'LP';
    applyCard(inputs, detail);
    expect(inputs.companies.PSA.compOverrides).toEqual({ 10: 1410 });
    expect(inputs.condition).toBe('LP');
  });

  it('switches printings', () => {
    const inputs = defaultInputs();
    const { variants } = parseTcgplayerPricing({ normal: { marketPrice: 1 }, reverse: { marketPrice: 3 } });
    applyCard(inputs, {
      id: 'x-1',
      localId: '1',
      name: 'Test',
      setId: 'x',
      setName: 'X',
      number: '1/100',
      setOrder: 0,
      variants,
    });
    expect(inputs.nmPrice).toBe(1);
    selectVariant(inputs, 'reverse');
    expect(inputs.nmPrice).toBe(3);
    expect(inputs.card?.variantKey).toBe('reverse');
  });

  it('reports a missing card', async () => {
    await expect(getCard('nope-1', mockFetch())).rejects.toMatchObject({ kind: 'not-found' });
  });
});

describe('peekSearch', () => {
  it('answers from memory once a name has been fetched', async () => {
    expect(peekSearch('charizard 151')).toBeNull();
    await searchCards('charizard', undefined, mockFetch());
    expect(peekSearch('charizard 151')?.map((c) => c.id)).toEqual(['sv03.5-006', 'sv03.5-199']);
  });
});
