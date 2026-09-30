import type {
  CompanyId,
  CompanySettings,
  Condition,
  ConditionId,
  EbaySettings,
  Grade,
  GradeMap,
  GradingCompany,
  Inputs,
  MaterialItem,
  ShippingMethod,
} from './types';

// All prices are editable estimates. Grading companies and eBay change their
// pricing often, so every figure here can be overridden in the UI.

export const GRADES: Grade[] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export const CONDITIONS: Condition[] = [
  {
    id: 'NM',
    label: 'Near Mint',
    rawMultiplier: 1,
    description: 'Minimal to no wear. Sharp corners, clean edges, no scratches visible at arm’s length.',
  },
  {
    id: 'LP',
    label: 'Lightly Played',
    rawMultiplier: 0.8,
    description: 'Minor edge or corner wear, light scuffs. No major creases or bends.',
  },
  {
    id: 'MP',
    label: 'Moderately Played',
    rawMultiplier: 0.6,
    description: 'Noticeable whitening, corner wear, scratching or minor creasing.',
  },
  {
    id: 'HP',
    label: 'Heavily Played',
    rawMultiplier: 0.4,
    description: 'Heavy wear, creases, whitening or scratches across the card. Structurally intact.',
  },
  {
    id: 'DMG',
    label: 'Damaged',
    rawMultiplier: 0.25,
    description: 'Tears, water damage, heavy creases, writing or other structural damage.',
  },
];

export const CONDITION_BY_ID = Object.fromEntries(CONDITIONS.map((c) => [c.id, c])) as Record<
  ConditionId,
  Condition
>;

function gradeMap(values: Partial<GradeMap<number>>): GradeMap<number> {
  return Object.fromEntries(GRADES.map((g) => [g, values[g] ?? 0])) as GradeMap<number>;
}

/** Likely grade outcomes (in %) for a card in each raw condition. */
export const GRADE_DISTRIBUTION_PRESETS: Record<ConditionId, GradeMap<number>> = {
  NM: gradeMap({ 10: 20, 9: 45, 8: 22, 7: 8, 6: 3, 5: 2 }),
  LP: gradeMap({ 8: 10, 7: 30, 6: 35, 5: 15, 4: 10 }),
  MP: gradeMap({ 6: 10, 5: 30, 4: 35, 3: 20, 2: 5 }),
  HP: gradeMap({ 4: 10, 3: 30, 2: 40, 1: 20 }),
  DMG: gradeMap({ 2: 30, 1: 70 }),
};

const STANDARD_LABELS: GradeMap<string> = {
  10: 'Gem Mint 10',
  9: 'Mint 9',
  8: 'NM-Mint 8',
  7: 'Near Mint 7',
  6: 'EX-NM 6',
  5: 'Excellent 5',
  4: 'VG-EX 4',
  3: 'Very Good 3',
  2: 'Good 2',
  1: 'Poor 1',
};

// Graded value as a multiple of the raw NM price. These are broad averages for
// modern TCG cards; real premiums vary enormously by card, so the UI lets you
// enter actual sold comps per grade instead.
const PSA_MULTIPLIERS = gradeMap({ 10: 3.5, 9: 1.4, 8: 1.0, 7: 0.8, 6: 0.65, 5: 0.55, 4: 0.45, 3: 0.38, 2: 0.32, 1: 0.28 });

function relativeTo(base: GradeMap<number>, top: number, rest: number): GradeMap<number> {
  return gradeMap(
    Object.fromEntries(GRADES.map((g) => [g, +(base[g] * (g === 10 ? top : rest)).toFixed(2)])),
  );
}

export const COMPANIES: GradingCompany[] = [
  {
    id: 'PSA',
    name: 'PSA',
    fullName: 'Professional Sports Authenticator',
    color: '#d7263d',
    gradeLabels: {
      10: 'GEM MT 10',
      9: 'MINT 9',
      8: 'NM-MT 8',
      7: 'NM 7',
      6: 'EX-MT 6',
      5: 'EX 5',
      4: 'VG-EX 4',
      3: 'VG 3',
      2: 'GOOD 2',
      1: 'PR 1',
    },
    returnShippingPerSubmission: 22,
    valueMultipliers: PSA_MULTIPLIERS,
    tiers: [
      { id: 'value-bulk', name: 'Value Bulk', price: 24.99, maxDeclaredValue: 500, turnaroundDays: 95, minCards: 20, note: 'Requires Collectors Club membership' },
      { id: 'value', name: 'Value', price: 32.99, maxDeclaredValue: 500, turnaroundDays: 75 },
      { id: 'value-plus', name: 'Value Plus', price: 49.99, maxDeclaredValue: 500, turnaroundDays: 45 },
      { id: 'regular', name: 'Regular', price: 74.99, maxDeclaredValue: 1500, turnaroundDays: 25 },
      { id: 'express', name: 'Express', price: 149, maxDeclaredValue: 2500, turnaroundDays: 15 },
      { id: 'super-express', name: 'Super Express', price: 299, maxDeclaredValue: 5000, turnaroundDays: 7 },
      { id: 'walk-through', name: 'Walk-Through', price: 499, maxDeclaredValue: 10000, turnaroundDays: 3 },
    ],
  },
  {
    id: 'CGC',
    name: 'CGC',
    fullName: 'Certified Guaranty Company',
    color: '#1f6feb',
    gradeLabels: { ...STANDARD_LABELS, 8: 'NM/Mint 8', 7: 'NM 7', 6: 'Ex/NM 6', 4: 'VG/Ex 4' },
    returnShippingPerSubmission: 20,
    valueMultipliers: relativeTo(PSA_MULTIPLIERS, 0.7, 0.8),
    tiers: [
      { id: 'bulk', name: 'Bulk', price: 15, maxDeclaredValue: 500, turnaroundDays: 60, minCards: 25 },
      { id: 'economy', name: 'Economy', price: 18, maxDeclaredValue: 1000, turnaroundDays: 40 },
      { id: 'standard', name: 'Standard', price: 35, maxDeclaredValue: 3000, turnaroundDays: 20 },
      { id: 'express', name: 'Express', price: 75, maxDeclaredValue: 10000, turnaroundDays: 5 },
      { id: 'walk-through', name: 'Walk-Through', price: 150, maxDeclaredValue: null, turnaroundDays: 2 },
    ],
  },
  {
    id: 'SGC',
    name: 'SGC',
    fullName: 'Sportscard Guaranty',
    color: '#2d2d2d',
    gradeLabels: { ...STANDARD_LABELS, 8: 'NM/MT 8', 7: 'NM 7', 6: 'EX/NM 6', 4: 'VG/EX 4' },
    returnShippingPerSubmission: 18,
    valueMultipliers: relativeTo(PSA_MULTIPLIERS, 0.75, 0.85),
    tiers: [
      { id: 'standard', name: 'Standard', price: 15, maxDeclaredValue: 1500, turnaroundDays: 20 },
      { id: 'express', name: 'Express', price: 50, maxDeclaredValue: 5000, turnaroundDays: 5 },
      { id: 'priority', name: 'Priority', price: 100, maxDeclaredValue: 10000, turnaroundDays: 2 },
    ],
  },
  {
    id: 'BGS',
    name: 'BGS',
    fullName: 'Beckett Grading Services',
    color: '#b8860b',
    gradeLabels: { ...STANDARD_LABELS, 10: 'Pristine 10 / Gem 9.5', 8: 'NM-Mint 8', 6: 'EX-Mt 6' },
    returnShippingPerSubmission: 20,
    valueMultipliers: relativeTo(PSA_MULTIPLIERS, 0.9, 0.75),
    tiers: [
      { id: 'base', name: 'Base', price: 14.95, maxDeclaredValue: 500, turnaroundDays: 60, note: 'No subgrades' },
      { id: 'standard', name: 'Standard', price: 34.95, maxDeclaredValue: 1500, turnaroundDays: 30 },
      { id: 'express', name: 'Express', price: 79.95, maxDeclaredValue: 2500, turnaroundDays: 10 },
      { id: 'priority', name: 'Priority', price: 149.95, maxDeclaredValue: 10000, turnaroundDays: 5 },
    ],
  },
  {
    id: 'TAG',
    name: 'TAG',
    fullName: 'Technical Authentication & Grading',
    color: '#0e9f6e',
    gradeLabels: { ...STANDARD_LABELS, 6: 'EX-NM 6' },
    returnShippingPerSubmission: 18,
    valueMultipliers: relativeTo(PSA_MULTIPLIERS, 0.75, 0.8),
    tiers: [
      { id: 'basic', name: 'Basic', price: 19.99, maxDeclaredValue: 1000, turnaroundDays: 45 },
      { id: 'standard', name: 'Standard', price: 39, maxDeclaredValue: 2500, turnaroundDays: 15 },
      { id: 'express', name: 'Express', price: 79, maxDeclaredValue: 10000, turnaroundDays: 5 },
    ],
  },
];

export const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map((c) => [c.id, c])) as Record<
  CompanyId,
  GradingCompany
>;

export const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'ese', name: 'eBay Standard Envelope (PWE)', postage: 1.32, maxSaleValue: 20, allowsSlabs: false, tracked: true },
  { id: 'ground', name: 'USPS Ground Advantage', postage: 4.95, maxSaleValue: null, allowsSlabs: true, tracked: true },
  { id: 'priority', name: 'USPS Priority Mail', postage: 9.85, maxSaleValue: null, allowsSlabs: true, tracked: true },
  { id: 'priority-insured', name: 'USPS Priority + insurance', postage: 14.5, maxSaleValue: null, allowsSlabs: true, tracked: true },
];

export const SHIPPING_BY_ID = Object.fromEntries(SHIPPING_METHODS.map((m) => [m.id, m])) as Record<
  string,
  ShippingMethod
>;

export const DEFAULT_RAW_MATERIALS: MaterialItem[] = [
  { id: 'penny-sleeve', name: 'Penny sleeve', unitCost: 0.02, qty: 1 },
  { id: 'toploader', name: 'Toploader', unitCost: 0.12, qty: 1 },
  { id: 'team-bag', name: 'Team bag', unitCost: 0.03, qty: 1 },
  { id: 'bubble-mailer', name: 'Bubble mailer (4×8)', unitCost: 0.3, qty: 1 },
  { id: 'label', name: 'Shipping label / tape', unitCost: 0.05, qty: 1 },
];

export const DEFAULT_GRADED_MATERIALS: MaterialItem[] = [
  { id: 'slab-sleeve', name: 'Slab sleeve / bag', unitCost: 0.1, qty: 1 },
  { id: 'bubble-wrap', name: 'Bubble wrap', unitCost: 0.1, qty: 1 },
  { id: 'cardboard', name: 'Cardboard stiffener', unitCost: 0.08, qty: 2 },
  { id: 'bubble-mailer', name: 'Bubble mailer (6×10)', unitCost: 0.45, qty: 1 },
  { id: 'label', name: 'Shipping label / tape', unitCost: 0.05, qty: 1 },
];

export const DEFAULT_EBAY: EbaySettings = {
  fvfRate: 0.1325,
  fvfRateAbove: 0.0235,
  fvfThreshold: 7500,
  perOrderFeeLow: 0.3,
  perOrderFeeHigh: 0.4,
  perOrderFeeCutoff: 10,
  promotedRate: 0,
  salesTaxRate: 0.07,
};

function defaultCompanySettings(company: GradingCompany): CompanySettings {
  return {
    enabled: true,
    tierId: 'auto',
    addOnPerCard: 0,
    returnShippingPerSubmission: company.returnShippingPerSubmission,
    compOverrides: {},
    multipliers: { ...company.valueMultipliers },
  };
}

export function defaultInputs(): Inputs {
  return {
    cardName: '',
    nmPrice: 100,
    condition: 'NM',
    rawPriceOverride: null,
    costBasis: null,
    gradeDistribution: { ...GRADE_DISTRIBUTION_PRESETS.NM },
    distributionIsPreset: true,
    ebay: { ...DEFAULT_EBAY },
    rawSale: {
      shippingMethodId: 'ground',
      shippingCharged: 0,
      materials: DEFAULT_RAW_MATERIALS.map((m) => ({ ...m })),
    },
    gradedSale: {
      shippingMethodId: 'ground',
      shippingCharged: 0,
      materials: DEFAULT_GRADED_MATERIALS.map((m) => ({ ...m })),
    },
    inboundShippingPerSubmission: 15,
    cardsPerSubmission: 10,
    submissionSuppliesPerCard: 0.25,
    companies: Object.fromEntries(
      COMPANIES.map((c) => [c.id, defaultCompanySettings(c)]),
    ) as Record<CompanyId, CompanySettings>,
  };
}
