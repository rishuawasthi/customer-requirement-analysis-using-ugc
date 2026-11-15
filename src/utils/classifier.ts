import { ClassificationResult, RequirementCategory } from '../types';

interface PatternRule {
  category: RequirementCategory;
  pattern: RegExp;
  cueLabel: string;
  rationale: string;
}

// Transparent linguistic pattern rules ordered by precedence
const EXPLICIT_RULES: PatternRule[] = [
  {
    category: 'EXPLICIT_NEED',
    pattern: /\b(please\s+(?:add|provide|include|offer|consider|release|make|fix|implement|allow))\b/i,
    cueLabel: 'Explicit polite directive ("please + action verb")',
    rationale: 'Customer explicitly requests a concrete feature or action using an imperative polite construct.'
  },
  {
    category: 'EXPLICIT_NEED',
    pattern: /\b(?:we|i)\s+(?:urgently\s+)?(?:need|require|want)\b/i,
    cueLabel: 'Direct requirement assertion ("need / require / want")',
    rationale: 'Customer directly states an explicit requirement or feature need.'
  },
  {
    category: 'EXPLICIT_NEED',
    pattern: /\b(?:you\s+should\s+(?:provide|add|include|have|offer|make|fix))\b/i,
    cueLabel: 'Prescriptive modal suggestion ("you should provide/add")',
    rationale: 'Customer directly instructs the provider on what feature or service must be offered.'
  },
  {
    category: 'EXPLICIT_NEED',
    pattern: /\b(?:could\s+you\s+(?:please\s+)?(?:add|provide|include|offer|make))\b/i,
    cueLabel: 'Direct request interrogative ("could you add/provide")',
    rationale: 'Customer poses a direct request for a specific capability or modification.'
  },
  {
    category: 'EXPLICIT_NEED',
    pattern: /\b(?:kindly\s+(?:make|provide|add|fix|include|release))\b/i,
    cueLabel: 'Formal direct request ("kindly make/provide")',
    rationale: 'Customer explicitly requests a service or product modification.'
  },
  {
    category: 'EXPLICIT_NEED',
    pattern: /\b(?:feature\s+request|option\s+to\s+(?:turn\s+off|disable|enable|configure|customize|sort|filter))\b/i,
    cueLabel: 'Explicit feature customization phrase',
    rationale: 'Direct specification of a requested functional option or toggle.'
  }
];

const IMPLICIT_RULES: PatternRule[] = [
  {
    category: 'IMPLICIT_NEED',
    pattern: /\b(?:i\s+wish\s+(?:they|it|the|there)\s+(?:had|lasted|were|was|offered))\b/i,
    cueLabel: 'Counterfactual wish ("I wish it had/lasted")',
    rationale: 'Customer expresses a gap in satisfaction via a wish construct, signaling an unmet need indirectly.'
  },
  {
    category: 'IMPLICIT_NEED',
    pattern: /\b(?:it\s+would\s+be\s+(?:much\s+)?(?:better|nice|nicer|more\s+convenient|great|helpful)\s+if)\b/i,
    cueLabel: 'Hypothetical preference marker ("it would be better/nice if")',
    rationale: 'Customer indirectly proposes an enhancement through a hypothetical preference statement.'
  },
  {
    category: 'IMPLICIT_NEED',
    pattern: /\b(?:i\s+would\s+prefer\s+if)\b/i,
    cueLabel: 'Indirect preference formulation ("I would prefer if")',
    rationale: 'Customer signals an indirect desire for a change in current behavior or offerings.'
  },
  {
    category: 'IMPLICIT_NEED',
    pattern: /\b(?:could\s+really\s+use|would\s+appreciate)\b/i,
    cueLabel: 'Need expression ("could really use / would appreciate")',
    rationale: 'Customer expresses utility that would be gained if a missing feature were present.'
  },
  {
    category: 'IMPLICIT_NEED',
    pattern: /\b(?:very\s+difficult\s+to|hard\s+to\s+(?:view|read|find|use|reach|navigate)|too\s+difficult|cumbersome\s+to)\b/i,
    cueLabel: 'Usability friction marker ("difficult / hard to")',
    rationale: 'Customer notes friction or cognitive load, indirectly implying an ergonomic or interface requirement.'
  },
  {
    category: 'IMPLICIT_NEED',
    pattern: /\b(?:other\s+(?:competing\s+)?(?:laptops|apps|tools|places|brands)\s+(?:offer|have|provide))\b/i,
    cueLabel: 'Competitive comparison gap ("other competitors offer")',
    rationale: 'Customer compares against alternatives, indirectly implying a parity requirement.'
  },
  {
    category: 'IMPLICIT_NEED',
    pattern: /\b(?:too\s+noisy\s+to|too\s+dark\s+to|too\s+slow\s+to)\b/i,
    cueLabel: 'Environmental threshold friction ("too X to Y")',
    rationale: 'Customer describes a condition that prevents intended use, implicitly demanding remediation.'
  }
];

const PAIN_POINT_RULES: PatternRule[] = [
  {
    category: 'PAIN_POINT',
    pattern: /\b(?:froze\s+completely|crashes|crashed|crashing|hangs|glitch|buggy|dead\s+pixels|unusable)\b/i,
    cueLabel: 'Technical failure / crash descriptor',
    rationale: 'Customer reports an acute system malfunction, crash, or stability failure.'
  },
  {
    category: 'PAIN_POINT',
    pattern: /\b(?:completely\s+broken|broken|damaged|erratic|jumps\s+uncontrollably|snapped|unresponsive)\b/i,
    cueLabel: 'Hardware or component failure',
    rationale: 'Customer describes a physical or behavioral malfunction in a product component.'
  },
  {
    category: 'PAIN_POINT',
    pattern: /\b(?:overheats\s+drastically|burns\s+my\s+lap|unbearable\s+.*noise|crackle\s+heavily|terribly\s+quiet)\b/i,
    cueLabel: 'Severe physical/acoustic performance defect',
    rationale: 'Customer identifies a disruptive thermal, acoustic, or audio defect.'
  },
  {
    category: 'PAIN_POINT',
    pattern: /\b(?:foul|food\s+poisoning|cold\s+and\s+soggy|erroneous\s+surcharge|refused\s+to\s+(?:correct|remove))\b/i,
    cueLabel: 'Critical service failure or health/safety defect',
    rationale: 'Customer describes a severe negative event or refusal of service causing intense dissatisfaction.'
  },
  {
    category: 'PAIN_POINT',
    pattern: /\b(?:took\s+over\s+\d+\s+minutes|suffocatingly\s+hot|unbearable)\b/i,
    cueLabel: 'Extreme operational delay or discomfort',
    rationale: 'Customer expresses a severe operational shortfall resulting in friction.'
  }
];

export function classifyFeedback(text: string): ClassificationResult {
  const cleanText = text.trim();
  if (!cleanText) {
    return {
      category: 'NON_ACTIONABLE',
      explanation: 'Empty or blank text provided; no actionable requirement can be analyzed.',
      matchedCues: ['Empty input'],
      method: 'Rule-Based Linguistic Baseline'
    };
  }

  const matchedCues: string[] = [];

  // 1. Check EXPLICIT_NEED rules first
  for (const rule of EXPLICIT_RULES) {
    const match = cleanText.match(rule.pattern);
    if (match) {
      matchedCues.push(`${rule.cueLabel}: "${match[0]}"`);
      return {
        category: 'EXPLICIT_NEED',
        explanation: `${rule.rationale} Matched cue: "${match[0]}".`,
        matchedCues,
        method: 'Rule-Based Linguistic Pattern Heuristic'
      };
    }
  }

  // 2. Check IMPLICIT_NEED rules
  for (const rule of IMPLICIT_RULES) {
    const match = cleanText.match(rule.pattern);
    if (match) {
      matchedCues.push(`${rule.cueLabel}: "${match[0]}"`);
      return {
        category: 'IMPLICIT_NEED',
        explanation: `${rule.rationale} Matched cue: "${match[0]}".`,
        matchedCues,
        method: 'Rule-Based Linguistic Pattern Heuristic'
      };
    }
  }

  // 3. Check PAIN_POINT rules
  for (const rule of PAIN_POINT_RULES) {
    const match = cleanText.match(rule.pattern);
    if (match) {
      matchedCues.push(`${rule.cueLabel}: "${match[0]}"`);
      return {
        category: 'PAIN_POINT',
        explanation: `${rule.rationale} Matched cue: "${match[0]}".`,
        matchedCues,
        method: 'Rule-Based Linguistic Pattern Heuristic'
      };
    }
  }

  // 4. Default: NON_ACTIONABLE
  return {
    category: 'NON_ACTIONABLE',
    explanation: 'No explicit directive verbs, counterfactual wishes, or acute failure descriptors detected. The feedback represents general sentiment, praise, subjective opinion, or commentary without a concrete actionable requirement.',
    matchedCues: ['No actionable directive, wish, or defect pattern identified'],
    method: 'Rule-Based Linguistic Pattern Heuristic'
  };
}

export const CATEGORY_DESCRIPTIONS: Record<RequirementCategory, { label: string; badgeClass: string; borderClass: string; summary: string }> = {
  EXPLICIT_NEED: {
    label: 'Explicit Need',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    borderClass: 'border-l-4 border-l-blue-600',
    summary: 'The customer directly and explicitly asks for a feature, service, or specific capability.'
  },
  IMPLICIT_NEED: {
    label: 'Implicit Need',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-l-4 border-l-emerald-600',
    summary: 'The customer indirectly signals an unmet requirement through wishes, difficulty, or friction.'
  },
  PAIN_POINT: {
    label: 'Pain Point',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    borderClass: 'border-l-4 border-l-amber-600',
    summary: 'The customer describes a severe problem, crash, defect, or operational difficulty.'
  },
  NON_ACTIONABLE: {
    label: 'Non-Actionable',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    borderClass: 'border-l-4 border-l-slate-400',
    summary: 'The feedback expresses general sentiment, praise, or commentary without an actionable requirement.'
  }
};
