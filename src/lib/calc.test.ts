import { describe, expect, it } from 'vitest';
import { analyze, ebayFees, gradedSalePrice, materialsCost, normalizeDistribution, rawPrice, saleResult, selectTier } from './calc';
import { EXAMPLES, applyExample } from './examples';
import { COMPANY_BY_ID, DEFAULT_EBAY, GRADES, defaultInputs } from './data';
import type { Grade, GradeMap, Inputs } from './types';

function onlyGrade(grade: Grade): GradeMap<number> {
  return Object.fromEntries(GRADES.map((g) => [g, g === grade ? 100 : 0])) as GradeMap<number>;
}

describe('ebayFees', () => {
  it('charges final value fee on the tax-inclusive total plus the per-order fee', () => {
    const fees = ebayFees(100, 0, DEFAULT_EBAY);
    expect(fees.feeBase).toBeCloseTo(107);
    expect(fees.finalValueFee).toBeCloseTo(107 * 0.1325);
    expect(fees.perOrderFee).toBe(0.4);
    expect(fees.total).toBeCloseTo(107 * 0.1325 + 0.4);
  });

  it('uses the lower per-order fee for small orders', () => {
    const fees = ebayFees(5, 0, { ...DEFAULT_EBAY, salesTaxRate: 0 });
    expect(fees.perOrderFee).toBe(0.3);
  });

  it('applies the reduced rate above the threshold', () => {
    const fees = ebayFees(10000, 0, { ...DEFAULT_EBAY, salesTaxRate: 0 });
    expect(fees.finalValueFee).toBeCloseTo(7500 * 0.1325 + 2500 * 0.0235);
  });

  it('includes shipping charged and promoted listing rate', () => {
    const fees = ebayFees(50, 5, { ...DEFAULT_EBAY, salesTaxRate: 0, promotedRate: 0.05 });
    expect(fees.feeBase).toBe(55);
    expect(fees.promotedFee).toBeCloseTo(2.75);
  });

  it('charges nothing for a zero sale', () => {
    expect(ebayFees(0, 0, DEFAULT_EBAY).total).toBe(0);
  });
});

describe('saleResult', () => {
  it('subtracts fees, postage and materials', () => {
    const r = saleResult(
      100,
      { shippingMethodId: 'ground', shippingCharged: 0, materials: [{ id: 'm', name: 'm', unitCost: 0.5, qty: 2 }] },
      { ...DEFAULT_EBAY, salesTaxRate: 0 },
      false,
    );
    expect(r.net).toBeCloseTo(100 - (13.25 + 0.4) - 4.95 - 1);
  });

  it('warns when a slab ships by envelope or the envelope value cap is exceeded', () => {
    const setup = { shippingMethodId: 'ese', shippingCharged: 0, materials: [] };
    expect(saleResult(15, setup, DEFAULT_EBAY, true).warnings.length).toBe(1);
    expect(saleResult(50, setup, DEFAULT_EBAY, false).warnings.length).toBe(1);
    expect(saleResult(15, setup, DEFAULT_EBAY, false).warnings.length).toBe(0);
  });
});

describe('rawPrice', () => {
  it('scales the NM price by condition', () => {
    expect(rawPrice({ nmPrice: 100, condition: 'NM', rawPriceOverride: null })).toBe(100);
    expect(rawPrice({ nmPrice: 100, condition: 'LP', rawPriceOverride: null })).toBe(80);
    expect(rawPrice({ nmPrice: 100, condition: 'DMG', rawPriceOverride: null })).toBe(25);
  });

  it('respects an override', () => {
    expect(rawPrice({ nmPrice: 100, condition: 'MP', rawPriceOverride: 72 })).toBe(72);
  });
});

describe('helpers', () => {
  it('normalises distributions that do not sum to 100', () => {
    const n = normalizeDistribution({ ...onlyGrade(10), 9: 100 });
    expect(n[10]).toBe(0.5);
    expect(n[9]).toBe(0.5);
  });

  it('sums material costs', () => {
    expect(materialsCost([{ id: 'a', name: 'a', unitCost: 0.1, qty: 3 }])).toBeCloseTo(0.3);
  });

  it('picks the cheapest tier that covers the declared value and submission size', () => {
    const psa = COMPANY_BY_ID.PSA.tiers;
    expect(selectTier(psa, 200, 10).id).toBe('value');
    expect(selectTier(psa, 200, 25).id).toBe('value-bulk');
    expect(selectTier(psa, 1200, 10).id).toBe('regular');
    expect(selectTier(psa, 50000, 10).id).toBe('walk-through');
  });
});

describe('analyze', () => {
  function inputs(overrides: Partial<Inputs> = {}): Inputs {
    return { ...defaultInputs(), ...overrides };
  }

  it('recommends grading when a gem is certain and the premium is large', () => {
    const a = analyze(inputs({ nmPrice: 100, gradeDistribution: onlyGrade(10) }));
    expect(a.recommendation).toBe('grade');
    expect(a.bestCompanyId).toBe('PSA');
    const psa = a.companies.find((c) => c.companyId === 'PSA')!;
    expect(psa.probabilityBeatsRaw).toBe(1);
    expect(psa.expectedGainVsRaw).toBeGreaterThan(0);
  });

  it('recommends selling raw for a cheap card', () => {
    const a = analyze(inputs({ nmPrice: 5 }));
    expect(a.recommendation).toBe('sell-raw');
    for (const c of a.companies) expect(c.expectedGainVsRaw).toBeLessThan(0);
  });

  it('computes gain versus raw consistently', () => {
    const a = analyze(inputs({ nmPrice: 200, gradeDistribution: onlyGrade(9) }));
    const cgc = a.companies.find((c) => c.companyId === 'CGC')!;
    expect(cgc.expectedGainVsRaw).toBeCloseTo(cgc.expectedNetSale - cgc.costs.total - a.raw.sale.net);
    expect(cgc.roiOnGradingCost).toBeCloseTo(cgc.expectedGainVsRaw / cgc.costs.total);
  });

  it('uses sold comps over multipliers', () => {
    const base = defaultInputs();
    base.gradeDistribution = onlyGrade(10);
    base.companies.TAG.compOverrides = { 10: 1000 };
    const tag = analyze(base).companies.find((c) => c.companyId === 'TAG')!;
    expect(tag.expectedSalePrice).toBe(1000);
    expect(tag.outcomes[0].fromComp).toBe(true);
  });

  it('splits submission shipping across cards', () => {
    const base = defaultInputs();
    base.cardsPerSubmission = 5;
    base.inboundShippingPerSubmission = 20;
    base.companies.SGC.returnShippingPerSubmission = 10;
    const sgc = analyze(base).companies.find((c) => c.companyId === 'SGC')!;
    expect(sgc.costs.inboundShipping).toBe(4);
    expect(sgc.costs.returnShipping).toBe(2);
  });

  it('excludes disabled companies and reports break-even grade', () => {
    const base = defaultInputs();
    base.companies.BGS.enabled = false;
    const a = analyze(base);
    expect(a.companies.map((c) => c.companyId)).not.toContain('BGS');
    const psa = a.companies.find((c) => c.companyId === 'PSA')!;
    expect(psa.breakEvenGrade).toBe(10);
  });

  it('reports profit against cost basis when given', () => {
    const a = analyze(inputs({ costBasis: 40 }));
    expect(a.raw.profitVsCostBasis).toBeCloseTo(a.raw.sale.net - 40);
  });
});

describe('estimates without comps', () => {
  it('anchors other companies to the PSA comp for the same grade', () => {
    const base = defaultInputs();
    base.companies.PSA.compOverrides = { 9: 360 };
    const ratio = base.companies.TAG.multipliers[9] / base.companies.PSA.multipliers[9];
    expect(gradedSalePrice(base, 'TAG', 9)).toEqual({ price: 360 * ratio, fromComp: false });
    // Grades without a PSA comp still use NM × multiplier.
    expect(gradedSalePrice(base, 'TAG', 8).price).toBeCloseTo(base.nmPrice * base.companies.TAG.multipliers[8]);
  });
});

describe('Charizard ex 199/165 example', () => {
  it('loads comps and recommends PSA, with only a 10 beating raw', () => {
    const base = defaultInputs();
    base.companies.PSA.addOnPerCard = 5; // user settings outside the card survive
    applyExample(base, EXAMPLES[0]);
    expect(base.companies.PSA.addOnPerCard).toBe(5);
    base.companies.PSA.addOnPerCard = 0;
    const a = analyze(base);
    expect(a.raw.price).toBe(353);
    expect(a.recommendation).toBe('grade');
    expect(a.bestCompanyId).toBe('PSA');
    for (const c of a.companies) expect(c.breakEvenGrade).toBe(10);
  });
});
