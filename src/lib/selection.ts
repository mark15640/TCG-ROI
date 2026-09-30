import { COMPANIES, GRADE_DISTRIBUTION_PRESETS } from './data';
import { defaultVariant, nmPriceOf, type CardDetail } from './tcgdex';
import type { Inputs } from './types';

/**
 * Loads a searched card into the calculator: its name, image and TCGplayer prices, with the
 * Near Mint price taken from the chosen printing. Graded comps belong to the previous card, so
 * they are cleared; fee, shipping and grader settings are kept.
 */
export function applyCard(draft: Inputs, card: CardDetail, variantKey?: string): void {
  const variant = card.variants.find((v) => v.key === variantKey) ?? defaultVariant(card.variants);
  const sameCard = draft.card?.id === card.id;
  draft.card = {
    id: card.id,
    name: card.name,
    setName: card.setName,
    number: card.number,
    rarity: card.rarity,
    image: card.image,
    variants: card.variants,
    variantKey: variant?.key ?? null,
    pricesUpdated: card.pricesUpdated,
    tcgplayerUrl: card.tcgplayerUrl,
  };
  draft.cardName = `${card.name} ${card.number} (${card.setName})`;
  const price = variant ? nmPriceOf(variant) : undefined;
  if (price !== undefined) draft.nmPrice = price;
  draft.rawPriceOverride = null;
  if (!sameCard) {
    draft.condition = 'NM';
    draft.gradeDistribution = { ...GRADE_DISTRIBUTION_PRESETS.NM };
    draft.distributionIsPreset = true;
    for (const c of COMPANIES) draft.companies[c.id].compOverrides = {};
  }
}

/** Switches to another printing of the loaded card and uses its price. */
export function selectVariant(draft: Inputs, key: string): void {
  if (!draft.card) return;
  const v = draft.card.variants.find((x) => x.key === key);
  if (!v) return;
  draft.card.variantKey = key;
  const price = nmPriceOf(v);
  if (price !== undefined) draft.nmPrice = price;
  draft.rawPriceOverride = null;
}

/** Starts a hand-entered card. */
export function startManual(draft: Inputs): void {
  draft.card = null;
  draft.cardName = '';
  draft.rawPriceOverride = null;
  for (const c of COMPANIES) draft.companies[c.id].compOverrides = {};
}
