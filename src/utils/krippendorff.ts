import { FeedbackRecord, RequirementCategory, AgreementStats } from '../types';

const CATEGORIES: RequirementCategory[] = [
  'EXPLICIT_NEED',
  'IMPLICIT_NEED',
  'PAIN_POINT',
  'NON_ACTIONABLE'
];

/**
 * Calculates nominal Krippendorff's alpha strictly between independent human annotators
 * (Annotator A vs Annotator B) across units where both annotators have submitted a judgment.
 * 
 * Rules:
 * - Does NOT use rule-based classifier outputs.
 * - Does NOT use adjudicated labels.
 * - Requires at least 2 units with independent ratings from both Annotator A and B.
 */
export function calculateKrippendorffAlpha(records: FeedbackRecord[]): AgreementStats {
  const emptyCategoryCounts = (): Record<RequirementCategory, { annotatorA: number; annotatorB: number; total: number }> => ({
    EXPLICIT_NEED: { annotatorA: 0, annotatorB: 0, total: 0 },
    IMPLICIT_NEED: { annotatorA: 0, annotatorB: 0, total: 0 },
    PAIN_POINT: { annotatorA: 0, annotatorB: 0, total: 0 },
    NON_ACTIONABLE: { annotatorA: 0, annotatorB: 0, total: 0 }
  });

  const categoryCounts = emptyCategoryCounts();

  // Extract units where BOTH human annotators have provided a label
  const pairedUnits = records.filter(r => {
    const a = r.humanAnnotations?.annotatorA;
    const b = r.humanAnnotations?.annotatorB;
    return a !== undefined && b !== undefined;
  });

  const totalUnits = records.length;
  const bothAnnotatedUnits = pairedUnits.length;

  if (bothAnnotatedUnits < 2) {
    return {
      totalUnits,
      bothAnnotatedUnits,
      agreedUnits: 0,
      disagreedUnits: 0,
      percentObservedAgreement: null,
      krippendorffAlpha: null,
      interpretation: 'Insufficient independent double-annotations. At least 2 sentences must be independently labeled by both Annotator A and Annotator B.',
      categoryCounts
    };
  }

  let agreedCount = 0;
  let disagreedCount = 0;

  pairedUnits.forEach(unit => {
    const a = unit.humanAnnotations!.annotatorA!;
    const b = unit.humanAnnotations!.annotatorB!;

    categoryCounts[a].annotatorA++;
    categoryCounts[a].total++;

    categoryCounts[b].annotatorB++;
    categoryCounts[b].total++;

    if (a === b) {
      agreedCount++;
    } else {
      disagreedCount++;
    }
  });

  const N = bothAnnotatedUnits;
  const observedDisagreement = disagreedCount / N; // D_o

  // Total pair annotations n = 2 * N
  const n = 2 * N;
  let sumNkProduct = 0;

  for (const cat of CATEGORIES) {
    const nk = categoryCounts[cat].total;
    if (nk > 1) {
      sumNkProduct += nk * (nk - 1);
    }
  }

  // Expected disagreement D_e = 1 - (sum n_k (n_k - 1)) / (n (n - 1))
  const expectedDisagreement = 1 - sumNkProduct / (n * (n - 1));

  let alpha: number | null = null;
  let interpretation = '';

  if (expectedDisagreement <= 0.0000001) {
    // Zero expected disagreement occurs when all ratings belong to a single category
    alpha = observedDisagreement === 0 ? 1.0 : 0.0;
    interpretation = 'Monolithic sample: All annotations fall into a single category, preventing chance-correction variance calculation.';
  } else {
    alpha = 1 - observedDisagreement / expectedDisagreement;
    // Bound alpha between -1 and 1
    alpha = Math.max(-1, Math.min(1, alpha));

    if (alpha >= 0.80) {
      interpretation = `High agreement (α = ${alpha.toFixed(3)} ≥ 0.80): Satisfies formal threshold for reliable scientific conclusions.`;
    } else if (alpha >= 0.67) {
      interpretation = `Tentative agreement (0.67 ≤ α = ${alpha.toFixed(3)} < 0.80): Supports preliminary or exploratory conclusions.`;
    } else if (alpha >= 0) {
      interpretation = `Low agreement (α = ${alpha.toFixed(3)} < 0.67): Category boundaries or guidelines require calibration.`;
    } else {
      interpretation = `Systematic disagreement (α = ${alpha.toFixed(3)} < 0): Annotators disagree more than expected by chance.`;
    }
  }

  const percentObservedAgreement = (agreedCount / N) * 100;

  return {
    totalUnits,
    bothAnnotatedUnits,
    agreedUnits: agreedCount,
    disagreedUnits: disagreedCount,
    percentObservedAgreement,
    krippendorffAlpha: alpha,
    interpretation,
    categoryCounts
  };
}
