import assert from 'assert';
import { calculateKrippendorffAlpha } from '../src/utils/krippendorff';
import { FeedbackRecord } from '../src/types';

console.log('=== RUNNING KRIPPENDORFF ALPHA VALIDATION TESTS ===\n');

// 1. Perfect Agreement Test
const perfectAgreementRecords: FeedbackRecord[] = [
  { id: '1', text: 't1', originalMetadata: {}, humanAnnotations: { annotatorA: 'EXPLICIT_NEED', annotatorB: 'EXPLICIT_NEED' } },
  { id: '2', text: 't2', originalMetadata: {}, humanAnnotations: { annotatorA: 'IMPLICIT_NEED', annotatorB: 'IMPLICIT_NEED' } },
  { id: '3', text: 't3', originalMetadata: {}, humanAnnotations: { annotatorA: 'PAIN_POINT', annotatorB: 'PAIN_POINT' } },
  { id: '4', text: 't4', originalMetadata: {}, humanAnnotations: { annotatorA: 'NON_ACTIONABLE', annotatorB: 'NON_ACTIONABLE' } }
];

const resPerfect = calculateKrippendorffAlpha(perfectAgreementRecords);
assert.strictEqual(resPerfect.bothAnnotatedUnits, 4, 'Must have 4 paired units');
assert.strictEqual(resPerfect.agreedUnits, 4, 'All 4 units must agree');
assert.strictEqual(resPerfect.disagreedUnits, 0, '0 units disagreed');
assert.strictEqual(resPerfect.percentObservedAgreement, 100, 'Observed agreement must be 100%');
assert.strictEqual(resPerfect.krippendorffAlpha, 1.0, 'Alpha must be exactly 1.0 for perfect agreement');
console.log(`✔ Check 1: Perfect Agreement yields α = ${resPerfect.krippendorffAlpha?.toFixed(3)} (100% agreement)`);

// 2. Systematic Disagreement Test
const systematicDisagreementRecords: FeedbackRecord[] = [
  { id: '1', text: 't1', originalMetadata: {}, humanAnnotations: { annotatorA: 'EXPLICIT_NEED', annotatorB: 'PAIN_POINT' } },
  { id: '2', text: 't2', originalMetadata: {}, humanAnnotations: { annotatorA: 'PAIN_POINT', annotatorB: 'EXPLICIT_NEED' } },
  { id: '3', text: 't3', originalMetadata: {}, humanAnnotations: { annotatorA: 'IMPLICIT_NEED', annotatorB: 'NON_ACTIONABLE' } },
  { id: '4', text: 't4', originalMetadata: {}, humanAnnotations: { annotatorA: 'NON_ACTIONABLE', annotatorB: 'IMPLICIT_NEED' } }
];

const resDisagreement = calculateKrippendorffAlpha(systematicDisagreementRecords);
assert.strictEqual(resDisagreement.bothAnnotatedUnits, 4, 'Must have 4 paired units');
assert.strictEqual(resDisagreement.agreedUnits, 0, '0 units agreed');
assert.strictEqual(resDisagreement.disagreedUnits, 4, 'All 4 units disagreed');
assert.strictEqual(resDisagreement.percentObservedAgreement, 0, 'Observed agreement must be 0%');
assert(resDisagreement.krippendorffAlpha! < 0, 'Alpha must be negative for systematic disagreement');
console.log(`✔ Check 2: Systematic Disagreement yields negative α = ${resDisagreement.krippendorffAlpha?.toFixed(3)}`);

// 3. Missing Data Test (< 2 paired annotations)
const missingDataRecords: FeedbackRecord[] = [
  { id: '1', text: 't1', originalMetadata: {}, humanAnnotations: { annotatorA: 'EXPLICIT_NEED' } }, // Missing B
  { id: '2', text: 't2', originalMetadata: {}, humanAnnotations: { annotatorB: 'PAIN_POINT' } },     // Missing A
  { id: '3', text: 't3', originalMetadata: {}, humanAnnotations: {} },                               // Missing both
  { id: '4', text: 't4', originalMetadata: {} }                                                      // Unannotated
];

const resMissing = calculateKrippendorffAlpha(missingDataRecords);
assert.strictEqual(resMissing.bothAnnotatedUnits, 0, 'Should find 0 paired units');
assert.strictEqual(resMissing.krippendorffAlpha, null, 'Alpha must be null when insufficient data');
assert(resMissing.interpretation.includes('Insufficient'), 'Must return an insufficient data notice');
console.log(`✔ Check 3: Missing data correctly handled with α = null and clear interpretation message`);

// 4. Single Paired Unit Test (<2 threshold)
const singlePairRecords: FeedbackRecord[] = [
  { id: '1', text: 't1', originalMetadata: {}, humanAnnotations: { annotatorA: 'EXPLICIT_NEED', annotatorB: 'EXPLICIT_NEED' } },
  { id: '2', text: 't2', originalMetadata: {}, humanAnnotations: { annotatorA: 'PAIN_POINT' } } // only A
];

const resSingle = calculateKrippendorffAlpha(singlePairRecords);
assert.strictEqual(resSingle.bothAnnotatedUnits, 1, 'Only 1 paired unit');
assert.strictEqual(resSingle.krippendorffAlpha, null, 'Alpha must be null when only 1 unit exists');
console.log(`✔ Check 4: Single paired unit (<2) correctly handled with α = null`);

console.log('\nALL KRIPPENDORFF ALPHA VALIDATION CHECKS PASSED!\n');
