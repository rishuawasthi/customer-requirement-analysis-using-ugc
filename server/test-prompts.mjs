import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PROMPT_VERSION,
  SYSTEM_INSTRUCTION,
  FEW_SHOT_EXEMPLARS,
  buildPromptWithExemplars
} from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== RUNNING FEW-SHOT CONFIGURATION TESTS ===\n');

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

// 3. Test k=0
const promptK0 = buildPromptWithExemplars('Test feedback sentence', 0);
const exK0 = extractExamples(promptK0);
assert.strictEqual(exK0.length, 0, 'k=0 must contain exactly 0 examples');
assert(!promptK0.includes('Here are illustrative reference examples'), 'k=0 must not include exemplar section');
console.log('✔ Check 3: k=0 contains 0 exemplars (zero-shot)');

// 4. Test k=2
const promptK2 = buildPromptWithExemplars('Test feedback sentence', 2);
const exK2 = extractExamples(promptK2);
assert.strictEqual(exK2.length, 2, 'k=2 must contain exactly 2 examples');
assert.strictEqual(exK2[0].category, 'EXPLICIT_NEED', 'k=2 exemplar 1 must be EXPLICIT_NEED');
assert.strictEqual(exK2[1].category, 'PAIN_POINT', 'k=2 exemplar 2 must be PAIN_POINT');
assert.notStrictEqual(exK2[0].text, exK2[1].text, 'k=2 exemplars must be distinct');
console.log('✔ Check 4: k=2 contains exactly 2 exemplars (EXPLICIT_NEED vs PAIN_POINT contrast)');

// 5. Test k=4
const promptK4 = buildPromptWithExemplars('Test feedback sentence', 4);
const exK4 = extractExamples(promptK4);
assert.strictEqual(exK4.length, 4, 'k=4 must contain exactly 4 examples');
const catsK4 = exK4.map(e => e.category);
['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE'].forEach(cat => {
  assert.strictEqual(catsK4.filter(c => c === cat).length, 1, `k=4 must have exactly 1 exemplar for ${cat}`);
});
console.log('✔ Check 5: k=4 contains exactly 4 exemplars (1 balanced per category)');

// 6. Test k=8
const promptK8 = buildPromptWithExemplars('Test feedback sentence', 8);
const exK8 = extractExamples(promptK8);
assert.strictEqual(exK8.length, 8, 'k=8 must contain exactly 8 examples');
const catsK8 = exK8.map(e => e.category);
['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE'].forEach(cat => {
  assert.strictEqual(catsK8.filter(c => c === cat).length, 2, `k=8 must have exactly 2 exemplars for ${cat}`);
});
console.log('✔ Check 6: k=8 contains exactly 8 exemplars (2 balanced per category)');

// 7. Verify no duplicate texts in any configuration
[exK2, exK4, exK8].forEach((list, idx) => {
  const texts = list.map(e => e.text);
  const uniqueTexts = new Set(texts);
  assert.strictEqual(texts.length, uniqueTexts.size, `Configuration idx ${idx} must not contain duplicate example texts`);
});
console.log('✔ Check 7: No duplicate examples occur within any configuration');

// 8. Verify prompt actually changes across k values
assert.notStrictEqual(promptK0, promptK2, 'Prompt must differ between k=0 and k=2');
assert.notStrictEqual(promptK2, promptK4, 'Prompt must differ between k=2 and k=4');
assert.notStrictEqual(promptK4, promptK8, 'Prompt must differ between k=4 and k=8');
console.log('✔ Check 8: Prompts differ monotonically as k changes');

// 9. Verify unsupported k values are handled safely
const promptNeg = buildPromptWithExemplars('Test sentence', -1);
assert.strictEqual(extractExamples(promptNeg).length, 0, 'Negative k must safely default to 0');

const promptInvalid = buildPromptWithExemplars('Test sentence', 'invalid_k');
assert.strictEqual(extractExamples(promptInvalid).length, 0, 'Invalid string k must safely default to 0');

const promptNull = buildPromptWithExemplars('Test sentence', null);
assert.strictEqual(extractExamples(promptNull).length, 0, 'Null k must safely default to 0');

const promptK1 = buildPromptWithExemplars('Test sentence', 1);
assert.strictEqual(extractExamples(promptK1).length, 0, 'k=1 below benchmark minimum must safely default to 0');

const promptK3 = buildPromptWithExemplars('Test sentence', 3);
assert.strictEqual(extractExamples(promptK3).length, 2, 'k=3 must clamp safely to 2');

const promptK5 = buildPromptWithExemplars('Test sentence', 5);
assert.strictEqual(extractExamples(promptK5).length, 4, 'k=5 must clamp safely to 4');

const promptK99 = buildPromptWithExemplars('Test sentence', 99);
assert.strictEqual(extractExamples(promptK99).length, 8, 'k=99 must clamp safely to max benchmark k=8');
console.log('✔ Check 9: Unsupported and edge-case k values are handled safely');

// 10. Verify Training / Evaluation partition separation (No Test-Set Contamination)
const csv45Path = path.join(__dirname, '../public/semeval2015_research_ready.csv');
const csvFullPath = path.join(__dirname, '../public/semeval2015_research_ready_full.csv');

const csv45Content = fs.readFileSync(csv45Path, 'utf-8').toLowerCase();
const csvFullContent = fs.readFileSync(csvFullPath, 'utf-8').toLowerCase();

const allExemplars = [];
Object.values(FEW_SHOT_EXEMPLARS).forEach(list => {
  list.forEach(ex => allExemplars.push(ex.text.toLowerCase().trim()));
});

const leaks45 = allExemplars.filter(text => csv45Content.includes(text));
const leaksFull = allExemplars.filter(text => csvFullContent.includes(text));

assert.strictEqual(leaks45.length, 0, 'No exemplar text must appear in presentation dataset (semeval2015_research_ready.csv)');
assert.strictEqual(leaksFull.length, 0, 'No exemplar text must appear in full dataset (semeval2015_research_ready_full.csv)');
console.log('✔ Check 10: Zero test-set contamination across both SemEval dataset files');

console.log('\nALL 10 FEW-SHOT AUDIT & REGRESSION CHECKS PASSED SUCCESSFULLY!');
