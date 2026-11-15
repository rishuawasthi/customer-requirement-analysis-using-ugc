/**
 * Academic Classification Prompts for Gemini AI
 * Project: Customer Requirement Analysis Using User Generated Content
 * 
 * Prompt Version: v1.0-research
 * Methodology: Two-dimensional classification (Sentiment & Requirement Category)
 */

export const PROMPT_VERSION = 'v1.0-research';

export const SYSTEM_INSTRUCTION = `You are an expert NLP researcher and requirements engineering analyst specializing in classifying customer requirements from User-Generated Content (UGC) such as product reviews and app feedback.

You must classify each input feedback sentence along TWO INDEPENDENT DIMENSIONS in a single analysis:

DIMENSION 1: SENTIMENT POLARITY
- POSITIVE: Expresses approval, satisfaction, praise, or delight.
- NEGATIVE: Expresses dissatisfaction, frustration, complaint, criticism, or distress.
- NEUTRAL: Expresses objective facts, descriptions, or observations without noticeable emotional polarity.
- MIXED: Contains distinct positive and negative expressions within the same statement.

DIMENSION 2: CUSTOMER REQUIREMENT TAXONOMY
Classify into exactly one of four operational categories following these mandatory boundary rules:

1. EXPLICIT_NEED:
   The reviewer directly and explicitly requests, wants, commands, or suggests a specific feature, change, service, capability, or fix.
   Linguistic cues: "please add", "we need", "you should provide", "I want an option to", "could you make".
   BOUNDARY RULE: A direct request takes precedence and MUST be classified as EXPLICIT_NEED, even if strong negative sentiment or severe dissatisfaction is also expressed.

2. IMPLICIT_NEED:
   A desired feature, improvement, or capability can reasonably be inferred from a described limitation, friction, counterfactual wish, or customer workaround, WITHOUT a direct command or request.
   Linguistic cues: "I wish it had", "it would be much better if", "I have to do [workaround] because there is no way to", "too difficult to use under sunlight".
   BOUNDARY RULE: If dissatisfaction describes a problem and clearly implies a specific actionable remediation, classify as IMPLICIT_NEED.

3. PAIN_POINT:
   The reviewer expresses dissatisfaction, frustration, or describes an acute system breakdown, crash, hardware failure, or operational defect, but NO specific desired feature or remediation can reasonably be inferred.
   Linguistic cues: "the app froze completely", "crashes continuously", "the checkout is terribly frustrating", "damaged during transit".
   BOUNDARY RULE: If dissatisfaction exists but lacks sufficient evidence to infer a specific actionable feature, classify as PAIN_POINT.

4. NON_ACTIONABLE:
   General praise, aesthetic commentary, rating restatements, or subjective commentary devoid of any extractable requirement, wish, or failure signal.
   Linguistic cues: "Great laptop, 5 stars", "The package arrived in a box", "I like the color".

CRITICAL INDEPENDENCE RULE:
Sentiment polarity and requirement category are independent. For example, negative sentiment does NOT automatically mean PAIN_POINT. A negative statement can be an EXPLICIT_NEED ("This app is awful, please add offline mode") or an IMPLICIT_NEED ("Battery dies after 1 hour").

OUTPUT SPECIFICATION:
Extract verbatim short evidence from the input sentence. Provide a concise scientific explanation for the classification. Report your model confidence between 0.0 and 1.0.`;

// Approved Few-Shot Exemplars drawn strictly from the training partition
// (Zero exemplars are taken from test partitions to preserve experimental validity)
export const TAXONOMY_CATEGORIES = ['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE'];

export const FEW_SHOT_EXEMPLARS = {
  EXPLICIT_NEED: [
    {
      text: "Please add an option to adjust the screen backlight timeout in the BIOS.",
      output: {
        sentiment: "NEUTRAL",
        requirement_category: "EXPLICIT_NEED",
        evidence: "Please add an option to adjust the screen backlight timeout",
        explanation: "Customer issues an imperative polite directive requesting a concrete configuration toggle.",
        confidence: 0.98
      }
    },
    {
      text: "You should provide Linux compatible wireless network drivers on your download page.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "EXPLICIT_NEED",
        evidence: "You should provide Linux compatible wireless network drivers",
        explanation: "Prescriptive suggestion directly instructing the vendor to provide Linux driver support.",
        confidence: 0.96
      }
    },
    {
      text: "Could you please enable dark mode for nighttime order tracking? It is blindingly bright.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "EXPLICIT_NEED",
        evidence: "Could you please enable dark mode",
        explanation: "Direct polite request for dark mode feature; takes priority over dissatisfaction.",
        confidence: 0.97
      }
    },
    {
      text: "We urgently require export capabilities to CSV and PDF formats.",
      output: {
        sentiment: "NEUTRAL",
        requirement_category: "EXPLICIT_NEED",
        evidence: "urgently require export capabilities to CSV and PDF",
        explanation: "Direct statement of requirement specifying export formats.",
        confidence: 0.98
      }
    }
  ],
  IMPLICIT_NEED: [
    {
      text: "I wish the battery lasted at least 7 hours during cross-country flights.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "IMPLICIT_NEED",
        evidence: "I wish the battery lasted at least 7 hours",
        explanation: "Counterfactual wish construct indirectly signaling an unmet battery life requirement.",
        confidence: 0.94
      }
    },
    {
      text: "The laptop gets so hot on my lap that I have to place a thick magazine underneath it.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "IMPLICIT_NEED",
        evidence: "have to place a thick magazine underneath it",
        explanation: "Describes an explicit workaround due to thermal friction, inferring thermal management needs.",
        confidence: 0.93
      }
    },
    {
      text: "It would be much more convenient if there was a dedicated HDMI output port.",
      output: {
        sentiment: "NEUTRAL",
        requirement_category: "IMPLICIT_NEED",
        evidence: "would be much more convenient if there was a dedicated HDMI",
        explanation: "Hypothetical preference signaling a missing hardware port without an imperative command.",
        confidence: 0.95
      }
    },
    {
      text: "The display is very difficult to read when working outside under direct sunlight.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "IMPLICIT_NEED",
        evidence: "very difficult to read when working outside under direct sunlight",
        explanation: "Usability threshold friction implying an anti-glare or higher nits display requirement.",
        confidence: 0.92
      }
    }
  ],
  PAIN_POINT: [
    {
      text: "The operating system froze completely three times this morning and refused to reboot.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "PAIN_POINT",
        evidence: "froze completely three times this morning and refused to reboot",
        explanation: "Describes an acute system failure and total disruption; no specific desired feature inferable.",
        confidence: 0.98
      }
    },
    {
      text: "The headphone jack crackles heavily with unbearable static noise whenever plugged in.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "PAIN_POINT",
        evidence: "crackles heavily with unbearable static noise",
        explanation: "Severe acoustic defect with no inferable new feature specification.",
        confidence: 0.96
      }
    },
    {
      text: "Customer service chat disconnected after 40 minutes of waiting without resolving anything.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "PAIN_POINT",
        evidence: "disconnected after 40 minutes of waiting without resolving",
        explanation: "Operational service failure causing customer frustration with no feature requested.",
        confidence: 0.95
      }
    },
    {
      text: "Food arrived completely cold, spilled in the bag, and soaked through the box.",
      output: {
        sentiment: "NEGATIVE",
        requirement_category: "PAIN_POINT",
        evidence: "arrived completely cold, spilled in the bag",
        explanation: "Physical delivery failure and acute dissatisfaction without extractable engineering feature.",
        confidence: 0.97
      }
    }
  ],
  NON_ACTIONABLE: [
    {
      text: "Great build quality, five stars for the excellent and courteous delivery team.",
      output: {
        sentiment: "POSITIVE",
        requirement_category: "NON_ACTIONABLE",
        evidence: "Great build quality, five stars",
        explanation: "General praise and rating restatement; contains no actionable requirement signal.",
        confidence: 0.99
      }
    },
    {
      text: "The machine arrived inside a brown cardboard shipping container with basic warranty paperwork.",
      output: {
        sentiment: "NEUTRAL",
        requirement_category: "NON_ACTIONABLE",
        evidence: "arrived inside a brown cardboard shipping container",
        explanation: "Neutral factual description of packaging with no need, wish, or defect mentioned.",
        confidence: 0.96
      }
    },
    {
      text: "I purchased this unit on a Tuesday afternoon during the summer holiday.",
      output: {
        sentiment: "NEUTRAL",
        requirement_category: "NON_ACTIONABLE",
        evidence: "purchased this unit on a Tuesday afternoon",
        explanation: "Personal narrative context without sentiment or requirement information.",
        confidence: 0.98
      }
    },
    {
      text: "The restaurant has nice wooden chairs and ambient yellow ceiling lamps.",
      output: {
        sentiment: "POSITIVE",
        requirement_category: "NON_ACTIONABLE",
        evidence: "nice wooden chairs and ambient yellow ceiling lamps",
        explanation: "Subjective aesthetic observation without an actionable change request.",
        confidence: 0.97
      }
    }
  ]
};

/**
 * Calculates exemplar availability across taxonomy categories for a target k (per class).
 * Per manuscript: k in {0, 2, 4, 8} per class (totals: 0, 8, 16, 32).
 */
export function getFewShotExemplarStatus(k = 0, customPool = null) {
  const numericK = Number(k);
  const targetK = isNaN(numericK) || numericK <= 0 ? 0 : [2, 4, 8].find(v => v === numericK) || 0;
  const pool = customPool || FEW_SHOT_EXEMPLARS;

  const totalRequested = targetK * 4;
  let totalAvailable = 0;
  const perCategory = {};

  TAXONOMY_CATEGORIES.forEach(cat => {
    const list = pool[cat] || [];
    const availableCount = list.length;
    const includedCount = Math.min(targetK, availableCount);
    totalAvailable += includedCount;
    perCategory[cat] = {
      requested: targetK,
      available: availableCount,
      included: includedCount,
      missing: Math.max(0, targetK - availableCount)
    };
  });

  const missingCount = Math.max(0, totalRequested - totalAvailable);

  return {
    k: targetK,
    total_requested: totalRequested,
    total_available: totalAvailable,
    missing_count: missingCount,
    is_sufficient: missingCount === 0,
    per_category: perCategory
  };
}

/**
 * Builds the full context prompt for Gemini given sentence and few-shot k parameter.
 * Methodology per manuscript Section IV-B:
 * k is the number of exemplars per category across the 4-class taxonomy:
 * - k=0: Zero-shot classification (0 total exemplars)
 * - k=2: 2 exemplars per class (8 total exemplars)
 * - k=4: 4 exemplars per class (16 total exemplars)
 * - k=8: 8 exemplars per class (32 total exemplars)
 *
 * Training split integrity:
 * - Only authentic adjudicated training split examples are used.
 * - If the training pool contains fewer than k exemplars for any class, all available
 *   adjudicated examples are provided and the shortfall is clearly reported in metadata.
 * - Test/validation examples and the target input sentence are never used as demonstrations.
 */
export function buildPromptWithExemplars(text, k = 0, options = {}) {
  const cleanTarget = (text || '').trim();
  let promptText = `Analyze the following customer feedback sentence:\n\n"${cleanTarget}"\n\n`;

  const numericK = Number(k);
  if (isNaN(numericK) || numericK <= 0) {
    promptText += `Classify the sentence under the four-class taxonomy and sentiment dimensions.\n`;
    return promptText;
  }

  // Resolve target k to supported benchmark arms {2, 4, 8}
  let benchmarkK = 0;
  if (numericK >= 8) {
    benchmarkK = 8;
  } else if (numericK >= 4) {
    benchmarkK = 4;
  } else if (numericK >= 2) {
    benchmarkK = 2;
  } else {
    promptText += `Classify the sentence under the four-class taxonomy and sentiment dimensions.\n`;
    return promptText;
  }

  const pool = options.customPool || FEW_SHOT_EXEMPLARS;
  const status = getFewShotExemplarStatus(benchmarkK, pool);

  promptText += `Here are illustrative reference examples drawn strictly from our human-adjudicated training benchmark (${benchmarkK} per class requested, total requested: ${status.total_requested}):\n\n`;

  if (!status.is_sufficient) {
    promptText += `[Notice: Training partition currently provides ${status.total_available}/${status.total_requested} eligible exemplars. ${status.missing_count} exemplars are pending further human adjudication across categories. No synthetic examples have been fabricated.]\n\n`;
  }

  const selectedExamples = [];

  TAXONOMY_CATEGORIES.forEach(cat => {
    const list = (pool[cat] || []).filter(ex => ex.text.trim().toLowerCase() !== cleanTarget.toLowerCase());
    const countToTake = Math.min(benchmarkK, list.length);
    for (let i = 0; i < countToTake; i++) {
      selectedExamples.push({ cat, ex: list[i], num: i + 1 });
    }
  });

  selectedExamples.forEach(({ cat, ex, num }) => {
    promptText += `[Example ${cat} #${num}]\n`;
    promptText += `Input: "${ex.text}"\n`;
    promptText += `Classification: ${JSON.stringify(ex.output)}\n\n`;
  });

  promptText += `Now classify the target sentence accurately following the exact same schema.\n`;
  return promptText;
}
