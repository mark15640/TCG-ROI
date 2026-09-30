import { COMPANIES, COMPANY_BY_ID, CONDITION_BY_ID, GRADES, SHIPPING_BY_ID } from './data';
import type {
  CompanyId,
  ConditionId,
  EbaySettings,
  Grade,
  GradingTier,
  Inputs,
  MaterialItem,
  SaleSetup,
} from './types';

export interface EbayFeeBreakdown {
  /** Order total eBay charges fees on (price + shipping + sales tax). */
  feeBase: number;
  finalValueFee: number;
  perOrderFee: number;
  promotedFee: number;
  total: number;
}

export interface SaleResult {
  salePrice: number;
  shippingCharged: number;
  fees: EbayFeeBreakdown;
  postage: number;
  materials: number;
  /** What lands in your pocket after fees, postage and supplies. */
  net: number;
  warnings: string[];
}

export interface GradeOutcome {
  grade: Grade;
  label: string;
  probability: number;
  salePrice: number;
  fromComp: boolean;
  sale: SaleResult;
  /** Net sale minus grading costs minus what selling raw would have netted. */
  gainVsRaw: number;
}

export interface GradingCostBreakdown {
  tier: GradingTier;
  tierAutoSelected: boolean;
  gradingFee: number;
  addOn: number;
  inboundShipping: number;
  returnShipping: number;
  supplies: number;
  total: number;
}

export interface CompanyResult {
  companyId: CompanyId;
  name: string;
  color: string;
  outcomes: GradeOutcome[];
  /** Probability-weighted graded sale price (used as declared value). */
  expectedSalePrice: number;
  expectedNetSale: number;
  costs: GradingCostBreakdown;
  /** Expected net from grading, after grading costs. */
  expectedNetAfterGrading: number;
  /** Expected extra money versus selling raw. */
  expectedGainVsRaw: number;
  /** Expected gain as a fraction of the grading spend. */
  roiOnGradingCost: number;
  /** Profit versus cost basis, if a cost basis was entered. */
  profitVsCostBasis: number | null;
  probabilityBeatsRaw: number;
  /** Lowest grade that still beats selling raw, or null if none do. */
  breakEvenGrade: Grade | null;
  turnaroundDays: number;
  warnings: string[];
}

export interface RawResult {
  condition: ConditionId;
  price: number;
  sale: SaleResult;
  profitVsCostBasis: number | null;
}

export interface Analysis {
  raw: RawResult;
  companies: CompanyResult[];
  /** Enabled company with the highest expected gain, if any. */
  bestCompanyId: CompanyId | null;
  recommendation: 'grade' | 'sell-raw';
  distributionTotal: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function materialsCost(items: MaterialItem[]): number {
  return items.reduce((sum, m) => sum + Math.max(0, m.unitCost) * Math.max(0, m.qty), 0);
}

export function ebayFees(salePrice: number, shippingCharged: number, s: EbaySettings): EbayFeeBreakdown {
  if (salePrice <= 0) {
    return { feeBase: 0, finalValueFee: 0, perOrderFee: 0, promotedFee: 0, total: 0 };
  }
  const feeBase = (salePrice + shippingCharged) * (1 + s.salesTaxRate);
  const finalValueFee =
    Math.min(feeBase, s.fvfThreshold) * s.fvfRate + Math.max(0, feeBase - s.fvfThreshold) * s.fvfRateAbove;
  const perOrderFee = feeBase > s.perOrderFeeCutoff ? s.perOrderFeeHigh : s.perOrderFeeLow;
  const promotedFee = feeBase * s.promotedRate;
  return {
    feeBase,
    finalValueFee,
    perOrderFee,
    promotedFee,
    total: finalValueFee + perOrderFee + promotedFee,
  };
}

export function saleResult(salePrice: number, setup: SaleSetup, ebay: EbaySettings, isSlab: boolean): SaleResult {
  const method = SHIPPING_BY_ID[setup.shippingMethodId] ?? SHIPPING_BY_ID.ground;
  const warnings: string[] = [];
  if (isSlab && !method.allowsSlabs) {
    warnings.push(`${method.name} can't carry graded slabs.`);
  }
  if (method.maxSaleValue !== null && salePrice > method.maxSaleValue) {
    warnings.push(`${method.name} is only allowed for sales up to $${method.maxSaleValue}.`);
  }
  const fees = ebayFees(salePrice, setup.shippingCharged, ebay);
  const materials = materialsCost(setup.materials);
  const net = salePrice + setup.shippingCharged - fees.total - method.postage - materials;
  return {
    salePrice,
    shippingCharged: setup.shippingCharged,
    fees,
    postage: method.postage,
    materials,
    net,
    warnings,
  };
}

export function rawPrice(inputs: Pick<Inputs, 'nmPrice' | 'condition' | 'rawPriceOverride'>): number {
  if (inputs.rawPriceOverride !== null && inputs.rawPriceOverride >= 0) return inputs.rawPriceOverride;
  return inputs.nmPrice * CONDITION_BY_ID[inputs.condition].rawMultiplier;
}

/** Normalises a percentage distribution so it sums to 1. */
export function normalizeDistribution(dist: Record<Grade, number>): Record<Grade, number> {
  const total = GRADES.reduce((s, g) => s + Math.max(0, dist[g] || 0), 0);
  return Object.fromEntries(
    GRADES.map((g) => [g, total > 0 ? Math.max(0, dist[g] || 0) / total : 0]),
  ) as Record<Grade, number>;
}

export function selectTier(
  tiers: GradingTier[],
  declaredValue: number,
  cardsPerSubmission: number,
): GradingTier {
  const eligible = tiers
    .filter((t) => (t.maxDeclaredValue === null || t.maxDeclaredValue >= declaredValue))
    .filter((t) => !t.minCards || cardsPerSubmission >= t.minCards)
    .sort((a, b) => a.price - b.price);
  if (eligible.length > 0) return eligible[0];
  // Nothing covers the value: fall back to the highest tier.
  return [...tiers].sort((a, b) => b.price - a.price)[0];
}

function compFor(inputs: Inputs, companyId: CompanyId, grade: Grade): number | null {
  const comp = inputs.companies[companyId].compOverrides[grade];
  return comp !== undefined && comp !== null && comp >= 0 ? comp : null;
}

/**
 * Estimated sale price when there's no sold comp for this company and grade. PSA is the most
 * liquid market, so a real PSA comp for the same grade anchors the estimate (scaled by the
 * company's premium relative to PSA). Otherwise it falls back to NM price × multiplier.
 */
export function estimatedSalePrice(inputs: Inputs, companyId: CompanyId, grade: Grade): number {
  const own = inputs.companies[companyId].multipliers[grade];
  const psaComp = companyId === 'PSA' ? null : compFor(inputs, 'PSA', grade);
  const psaMultiplier = inputs.companies.PSA.multipliers[grade];
  if (psaComp !== null && psaMultiplier > 0) return psaComp * (own / psaMultiplier);
  return inputs.nmPrice * own;
}

export function gradedSalePrice(inputs: Inputs, companyId: CompanyId, grade: Grade): { price: number; fromComp: boolean } {
  const comp = compFor(inputs, companyId, grade);
  if (comp !== null) return { price: comp, fromComp: true };
  return { price: estimatedSalePrice(inputs, companyId, grade), fromComp: false };
}

export function analyzeCompany(inputs: Inputs, companyId: CompanyId, raw: RawResult): CompanyResult {
  const company = COMPANY_BY_ID[companyId];
  const settings = inputs.companies[companyId];
  const probs = normalizeDistribution(inputs.gradeDistribution);
  const cards = Math.max(1, Math.round(inputs.cardsPerSubmission));
  const warnings: string[] = [];

  const priced = GRADES.map((grade) => {
    const { price, fromComp } = gradedSalePrice(inputs, companyId, grade);
    return { grade, price, fromComp, sale: saleResult(price, inputs.gradedSale, inputs.ebay, true) };
  });

  const expectedSalePrice = priced.reduce((s, p) => s + probs[p.grade] * p.price, 0);
  const expectedNetSale = priced.reduce((s, p) => s + probs[p.grade] * p.sale.net, 0);

  const autoTier = selectTier(company.tiers, expectedSalePrice, cards);
  const manualTier = settings.tierId === 'auto' ? undefined : company.tiers.find((t) => t.id === settings.tierId);
  const tier = manualTier ?? autoTier;
  if (tier.maxDeclaredValue !== null && expectedSalePrice > tier.maxDeclaredValue) {
    warnings.push(
      `Expected value $${expectedSalePrice.toFixed(0)} exceeds the ${tier.name} cap of $${tier.maxDeclaredValue}; expect an upcharge.`,
    );
  }
  if (tier.minCards && cards < tier.minCards) {
    warnings.push(`${tier.name} needs at least ${tier.minCards} cards per submission.`);
  }

  const costs: GradingCostBreakdown = {
    tier,
    tierAutoSelected: !manualTier,
    gradingFee: tier.price,
    addOn: settings.addOnPerCard,
    inboundShipping: inputs.inboundShippingPerSubmission / cards,
    returnShipping: settings.returnShippingPerSubmission / cards,
    supplies: inputs.submissionSuppliesPerCard,
    total: 0,
  };
  costs.total = costs.gradingFee + costs.addOn + costs.inboundShipping + costs.returnShipping + costs.supplies;

  const outcomes: GradeOutcome[] = priced.map((p) => ({
    grade: p.grade,
    label: company.gradeLabels[p.grade],
    probability: probs[p.grade],
    salePrice: p.price,
    fromComp: p.fromComp,
    sale: p.sale,
    gainVsRaw: p.sale.net - costs.total - raw.sale.net,
  }));

  const slabWarnings = new Set(outcomes.filter((o) => o.probability > 0).flatMap((o) => o.sale.warnings));
  warnings.push(...slabWarnings);

  const expectedNetAfterGrading = expectedNetSale - costs.total;
  const expectedGainVsRaw = expectedNetAfterGrading - raw.sale.net;
  const probabilityBeatsRaw = outcomes.filter((o) => o.gainVsRaw > 0).reduce((s, o) => s + o.probability, 0);
  const winning = outcomes.filter((o) => o.gainVsRaw > 0).map((o) => o.grade);
  const breakEvenGrade = winning.length ? (Math.min(...winning) as Grade) : null;

  return {
    companyId,
    name: company.name,
    color: company.color,
    outcomes,
    expectedSalePrice,
    expectedNetSale,
    costs,
    expectedNetAfterGrading,
    expectedGainVsRaw,
    roiOnGradingCost: costs.total > 0 ? expectedGainVsRaw / costs.total : 0,
    profitVsCostBasis: inputs.costBasis === null ? null : expectedNetAfterGrading - inputs.costBasis,
    probabilityBeatsRaw,
    breakEvenGrade,
    turnaroundDays: tier.turnaroundDays,
    warnings,
  };
}

export function analyze(inputs: Inputs): Analysis {
  const price = rawPrice(inputs);
  const rawSale = saleResult(price, inputs.rawSale, inputs.ebay, false);
  const raw: RawResult = {
    condition: inputs.condition,
    price,
    sale: rawSale,
    profitVsCostBasis: inputs.costBasis === null ? null : rawSale.net - inputs.costBasis,
  };

  const companies = COMPANIES.filter((c) => inputs.companies[c.id].enabled).map((c) =>
    analyzeCompany(inputs, c.id, raw),
  );

  const best = companies.reduce<CompanyResult | null>(
    (b, c) => (b === null || c.expectedGainVsRaw > b.expectedGainVsRaw ? c : b),
    null,
  );

  return {
    raw,
    companies,
    bestCompanyId: best?.companyId ?? null,
    recommendation: best && best.expectedGainVsRaw > 0 ? 'grade' : 'sell-raw',
    distributionTotal: round2(GRADES.reduce((s, g) => s + (inputs.gradeDistribution[g] || 0), 0)),
  };
}
