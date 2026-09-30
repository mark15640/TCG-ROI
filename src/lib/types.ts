export type ConditionId = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

export type CompanyId = 'PSA' | 'CGC' | 'SGC' | 'BGS' | 'TAG';

/** Whole-number grade outcomes used across every company (10 = top grade). */
export type Grade = 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;

export type GradeMap<T> = Record<Grade, T>;

export interface Condition {
  id: ConditionId;
  label: string;
  /** Raw price as a fraction of the Near Mint price. */
  rawMultiplier: number;
  description: string;
}

export interface GradingTier {
  id: string;
  name: string;
  /** Per-card grading fee in USD. */
  price: number;
  /** Maximum declared value allowed for this tier. `null` = no cap. */
  maxDeclaredValue: number | null;
  /** Rough turnaround in business days. */
  turnaroundDays: number;
  /** Minimum cards per submission, if the tier requires one. */
  minCards?: number;
  note?: string;
}

export interface GradingCompany {
  id: CompanyId;
  name: string;
  fullName: string;
  /** Label printed on the slab for each whole-number grade. */
  gradeLabels: GradeMap<string>;
  tiers: GradingTier[];
  /** Return shipping + insurance per submission (USD). */
  returnShippingPerSubmission: number;
  /** Graded sale price as a multiple of the raw Near Mint price, per grade. */
  valueMultipliers: GradeMap<number>;
  color: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  unitCost: number;
  qty: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  /** Postage the seller pays (USD). */
  postage: number;
  /** Largest sale price this method is appropriate for. `null` = any. */
  maxSaleValue: number | null;
  /** Whether a graded slab can go out this way. */
  allowsSlabs: boolean;
  tracked: boolean;
}

export interface EbaySettings {
  /** Final value fee rate on the portion of the order up to `fvfThreshold`. */
  fvfRate: number;
  /** Final value fee rate on the portion above `fvfThreshold`. */
  fvfRateAbove: number;
  fvfThreshold: number;
  /** Per-order fee when the order total is at or below `perOrderFeeCutoff`. */
  perOrderFeeLow: number;
  /** Per-order fee when the order total is above `perOrderFeeCutoff`. */
  perOrderFeeHigh: number;
  perOrderFeeCutoff: number;
  /** Promoted Listings ad rate (0 = not promoting). */
  promotedRate: number;
  /** Average buyer sales tax. eBay charges its fee on the tax-inclusive total. */
  salesTaxRate: number;
}

export interface SaleSetup {
  shippingMethodId: string;
  /** What the buyer pays for shipping. Counted as revenue and in eBay's fee base. */
  shippingCharged: number;
  materials: MaterialItem[];
}

export interface CompanySettings {
  enabled: boolean;
  /** `'auto'` picks the cheapest tier whose declared-value cap covers the expected value. */
  tierId: string | 'auto';
  /** Extra per-card cost, e.g. BGS subgrades or a membership amortised per card. */
  addOnPerCard: number;
  returnShippingPerSubmission: number;
  /** Real sold comps per grade. A value here replaces the multiplier estimate. */
  compOverrides: Partial<Record<Grade, number>>;
  multipliers: GradeMap<number>;
}

/** One printing's TCGplayer prices (USD). */
export interface PriceVariant {
  key: string;
  label: string;
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

/** A card picked from search, with the prices it was loaded with. */
export interface SelectedCard {
  id: string;
  name: string;
  setName: string;
  number: string;
  rarity?: string;
  image?: string;
  variants: PriceVariant[];
  variantKey: string | null;
  pricesUpdated?: string;
  tcgplayerUrl?: string;
}

export interface Inputs {
  /** Card picked from search, or null when entered by hand. */
  card: SelectedCard | null;
  cardName: string;
  /** Market price of the card raw in Near Mint condition. */
  nmPrice: number;
  condition: ConditionId;
  /** Optional override of the raw price at the chosen condition. */
  rawPriceOverride: number | null;
  /** What you paid for the card (optional, for total-profit figures). */
  costBasis: number | null;
  /** Probability (%) of landing each grade. */
  gradeDistribution: GradeMap<number>;
  /** Whether the distribution follows the condition preset. */
  distributionIsPreset: boolean;
  ebay: EbaySettings;
  rawSale: SaleSetup;
  gradedSale: SaleSetup;
  /** Shipping cards to the grader, per submission. */
  inboundShippingPerSubmission: number;
  cardsPerSubmission: number;
  /** Card savers / sleeves used to submit each card. */
  submissionSuppliesPerCard: number;
  companies: Record<CompanyId, CompanySettings>;
}
