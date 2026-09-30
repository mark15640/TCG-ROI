import { COMPANIES, GRADE_DISTRIBUTION_PRESETS } from './data';
import type { CompanyId, ConditionId, Grade, Inputs } from './types';

export interface CardExample {
  id: string;
  cardName: string;
  nmPrice: number;
  condition: ConditionId;
  /** Sold comps per company and grade. Grades left out fall back to the multiplier estimate. */
  comps: Partial<Record<CompanyId, Partial<Record<Grade, number>>>>;
  /** When and where the prices were gathered. */
  asOf: string;
  sources: string;
}

export const EXAMPLES: CardExample[] = [
  {
    id: 'charizard-151-199',
    cardName: 'Charizard ex 199/165 (SV 151 SIR)',
    // TCGplayer Near Mint market price.
    nmPrice: 353,
    condition: 'NM',
    comps: {
      // PSA 10: late-Sep 2026 eBay solds $1,265–$1,746, average ≈ $1,410. PSA 9: $345–$365.
      PSA: { 10: 1410, 9: 360 },
      // CGC 10: sales range $410–$980, average ≈ $616; last sale $410 (Sep 24, 2026).
      CGC: { 10: 616 },
      // BGS 9.5 Gem Mint (the app's top BGS grade): $560–$670, Aug–Sep 2026.
      BGS: { 10: 575 },
      // SGC 10: $687–$800, Mar–Apr 2026 (thin market).
      SGC: { 10: 700 },
      // TAG: only one unverified $1,550 sale found, so TAG is left to the PSA-anchored estimate.
    },
    asOf: 'September 2026',
    sources: 'TCGplayer market price, eBay sold listings via PriceCharting and Card Ladder',
  },
];

/** Loads an example card's price and comps, keeping the user's fee and shipping settings. */
export function applyExample(draft: Inputs, example: CardExample): void {
  draft.cardName = example.cardName;
  draft.nmPrice = example.nmPrice;
  draft.condition = example.condition;
  draft.rawPriceOverride = null;
  draft.gradeDistribution = { ...GRADE_DISTRIBUTION_PRESETS[example.condition] };
  draft.distributionIsPreset = true;
  for (const c of COMPANIES) {
    draft.companies[c.id].compOverrides = { ...example.comps[c.id] };
  }
}
