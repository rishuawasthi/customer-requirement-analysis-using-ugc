import assert from 'assert';
import {
  PROMPT_VERSION,
  SYSTEM_INSTRUCTION,
  TAXONOMY_CATEGORIES,
  FEW_SHOT_EXEMPLARS,
  getFewShotExemplarStatus,
  buildPromptWithExemplars
} from './prompts.js';

console.log('=== RUNNING MANUSCRIPT-ALIGNED FEW-SHOT CONFIGURATION TESTS ===\n');

// 1. Prompt Version check
assert.strictEqual(PROMPT_VERSION, 'v1.0-research', 'Prompt version must be v1.0-research');
console.log('✔ Check 1: Prompt version is v1.0-research');

// 2. System Instructions intact
assert(SYSTEM_INSTRUCTION.includes('SENTIMENT POLARITY'), 'System instructions must cover sentiment polarity');
assert(SYSTEM_INSTRUCTION.includes('CUSTOMER REQUIREMENT TAXONOMY'), 'System instructions must cover requirement taxonomy');
assert(SYSTEM_INSTRUCTION.includes('EXPLICIT_NEED'), 'System instructions must define EXPLICIT_NEED');
assert(SYSTEM_INSTRUCTION.includes('IMPLICIT_NEED'), 'System instructions must define IMPLICIT_NEED');
assert(SYSTEM_INSTRUCTION.includes('PAIN_POINT'), 'System instructions must define PAIN_POINT');
assert(SYSTEM_INSTRUCTION.includes('NON_ACTIONABLE'), 'System instructions must define NON_ACTIONABLE');
assert(SYSTEM_INSTRUCTION.includes('CRITICAL INDEPENDENCE RULE'), 'System instructions must enforce dimension independence');
console.log('✔ Check 2: System instruction taxonomy and boundary rules are intact');

// Helper to count and extract examples from prompt
function extractExamples(prompt) {
  const matches = [...prompt.matchAll(/\[Example ([A-Z_]+) #(\d+)\]\s*Input: "([^"]+)"/g)];
  return matches.map(m => ({
    category: m[1],
    num: parseInt(m[2], 10),
    text: m[3]
  }));
}

// 3. Test k=0 (Zero-shot)
const promptK0 = buildPromptWithExemplars('Test feedback sentence', 0);
const exK0 = extractExamples(promptK0);
const statusK0 = getFewShotExemplarStatus(0);
assert.strictEqual(exK0.length, 0, 'k=0 must contain exactly 0 examples');
assert.strictEqual(statusK0.total_requested, 0, 'k=0 total_requested must be 0');
assert.strictEqual(statusK0.missing_count, 0, 'k=0 missing_count must be 0');
assert(!promptK0.includes('Here are illustrative reference examples'), 'k=0 must not include exemplar section');
console.log('✔ Check 3: k=0 contains 0 exemplars (zero-shot, 0 requested, 0 missing)');

// 4. Test k=2 (2 per class = 8 total)
const promptK2 = buildPromptWithExemplars('Test feedback sentence', 2);
const exK2 = extractExamples(promptK2);
const statusK2 = getFewShotExemplarStatus(2);
assert.strictEqual(statusK2.total_requested, 8, 'k=2 must request exactly 8 exemplars (2 per class * 4 classes)');
assert.strictEqual(exK2.length, 8, 'k=2 must contain exactly 8 examples');
assert.strictEqual(statusK2.missing_count, 0, 'k=2 missing_count must be 0 when 2 per class are available');
TAXONOMY_CATEGORIES.forEach(cat => {
  const count = exK2.filter(e => e.category === cat).length;
  assert.strictEqual(count, 2, `k=2 must have exactly 2 exemplars for ${cat}`);
});
console.log('✔ Check 4: k=2 contains exactly 8 exemplars (2 per class across all 4 categories, 0 missing)');

// 5. Test k=4 (4 per class = 16 total)
const promptK4 = buildPromptWithExemplars('Test feedback sentence', 4);
const exK4 = extractExamples(promptK4);
const statusK4 = getFewShotExemplarStatus(4);
assert.strictEqual(statusK4.total_requested, 16, 'k=4 must request exactly 16 exemplars (4 per class * 4 classes)');
assert.strictEqual(exK4.length, 16, 'k=4 must contain exactly 16 examples');
assert.strictEqual(statusK4.missing_count, 0, 'k=4 missing_count must be 0 when 4 per class are available');
TAXONOMY_CATEGORIES.forEach(cat => {
  const count = exK4.filter(e => e.category === cat).length;
  assert.strictEqual(count, 4, `k=4 must have exactly 4 exemplars for ${cat}`);
});
console.log('✔ Check 5: k=4 contains exactly 16 exemplars (4 per class across all 4 categories, 0 missing)');

// 6. Test k=8 with default pool (8 per class requested = 32 total, 16 available in default pool)
const promptK8 = buildPromptWithExemplars('Test feedback sentence', 8);
const exK8 = extractExamples(promptK8);
const statusK8 = getFewShotExemplarStatus(8);
assert.strictEqual(statusK8.total_requested, 32, 'k=8 must request exactly 32 exemplars (8 per class * 4 classes)');
assert.strictEqual(statusK8.total_available, 16, 'k=8 default pool provides 16 available exemplars');
assert.strictEqual(statusK8.missing_count, 16, 'k=8 default pool reports exactly 16 missing exemplars');
assert.strictEqual(statusK8.is_sufficient, false, 'k=8 is_sufficient must be false with 16 available');
assert.strictEqual(exK8.length, 16, 'k=8 includes all 16 available non-fabricated exemplars');
assert(promptK8.includes('16/32 eligible exemplars'), 'k=8 prompt must state available/requested ratio transparently');
assert(promptK8.includes('No synthetic examples have been fabricated'), 'k=8 prompt must declare no synthetic fabrication');
console.log('✔ Check 6: k=8 with 16 available correctly requests 32, includes 16, and transparently reports 16 missing without fabrication');

// 7. Test k=8 with full 32-exemplar pool (8 per class = 32 total)
const mockFullPool = {};
TAXONOMY_CATEGORIES.forEach(cat => {
  mockFullPool[cat] = [];
  for (let i = 1; i <= 8; i++) {
    mockFullPool[cat].push({
      text: `Adjudicated training sentence ${cat} number ${i}.`,
      output: {
        sentiment: 'NEUTRAL',
        requirement_category: cat,
        evidence: `evidence ${i}`,
        explanation: `Explanation for ${cat} ${i}`,
        confidence: 0.95
      }
    });
  }
});
const promptK8Full = buildPromptWithExemplars('Target sentence', 8, { customPool: mockFullPool });
const exK8Full = extractExamples(promptK8Full);
const statusK8Full = getFewShotExemplarStatus(8, mockFullPool);
assert.strictEqual(statusK8Full.total_requested, 32, 'Full pool k=8 requests 32');
assert.strictEqual(statusK8Full.total_available, 32, 'Full pool k=8 provides 32');
assert.strictEqual(statusK8Full.missing_count, 0, 'Full pool k=8 has 0 missing');
assert.strictEqual(statusK8Full.is_sufficient, true, 'Full pool k=8 is_sufficient must be true');
assert.strictEqual(exK8Full.length, 32, 'k=8 with full pool must contain exactly 32 examples');
TAXONOMY_CATEGORIES.forEach(cat => {
  const count = exK8Full.filter(e => e.category === cat).length;
  assert.strictEqual(count, 8, `k=8 with full pool must have exactly 8 exemplars for ${cat}`);
});
console.log('✔ Check 7: k=8 with complete 32-exemplar pool yields exactly 32 exemplars (8 per category, 0 missing)');

// 8. Zero Leakage Check: Target sentence itself is excluded from exemplars
const targetSentence = FEW_SHOT_EXEMPLARS.EXPLICIT_NEED[0].text;
const promptLeakCheck = buildPromptWithExemplars(targetSentence, 4);
const exLeakCheck = extractExamples(promptLeakCheck);
assert(!exLeakCheck.some(e => e.text.trim().toLowerCase() === targetSentence.trim().toLowerCase()), 'Target sentence must never be included as demonstration');
console.log('✔ Check 8: Self-leakage prevention verified: target sentence is never included as exemplar');

// 9. Verify duplicate prevention
[exK2, exK4, exK8, exK8Full].forEach((list, idx) => {
  const texts = list.map(e => e.text);
  const uniqueTexts = new Set(texts);
  assert.strictEqual(texts.length, uniqueTexts.size, `Configuration ${idx} must not contain duplicate example texts`);
});
console.log('✔ Check 9: No duplicate examples occur within any configuration');

// 10. Verify prompt actually changes monotonically across k values
assert.notStrictEqual(promptK0, promptK2, 'Prompt must differ between k=0 and k=2');
assert.notStrictEqual(promptK2, promptK4, 'Prompt must differ between k=2 and k=4');
assert.notStrictEqual(promptK4, promptK8, 'Prompt must differ between k=4 and k=8');
assert.notStrictEqual(promptK8, promptK8Full, 'Prompt must differ between partial and full k=8 pool');
console.log('✔ Check 10: Prompts differ monotonically as k changes');

// 11. Verify unsupported k values are handled safely
assert.strictEqual(extractExamples(buildPromptWithExemplars('Test', -1)).length, 0, 'Negative k defaults to 0');
assert.strictEqual(extractExamples(buildPromptWithExemplars('Test', 'invalid')).length, 0, 'Invalid k defaults to 0');
assert.strictEqual(extractExamples(buildPromptWithExemplars('Test', null)).length, 0, 'Null k defaults to 0');
console.log('✔ Check 11: Unsupported k values safely default to zero-shot (k=0)');

console.log('\nAll 11 Few-Shot Configuration & Integrity Tests Passed Successfully!\n');
