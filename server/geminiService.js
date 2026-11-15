import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION, PROMPT_VERSION, buildPromptWithExemplars } from './prompts.js';

const VALID_SENTIMENTS = ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'];
const VALID_REQUIREMENTS = ['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE'];

// Schema for Gemini Structured Output
const RESPONSE_JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sentiment: {
      type: Type.STRING,
      enum: VALID_SENTIMENTS,
      description: 'Overall sentiment polarity of the feedback.'
    },
    requirement_category: {
      type: Type.STRING,
      enum: VALID_REQUIREMENTS,
      description: 'Customer requirement classification per the research taxonomy.'
    },
    evidence: {
      type: Type.STRING,
      description: 'Exact verbatim key phrase or substring from the input sentence supporting the classification.'
    },
    explanation: {
      type: Type.STRING,
      description: 'Concise scientific rationale justifying the category assignment per boundary rules.'
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Model-reported confidence score between 0.0 and 1.0.'
    }
  },
  required: ['sentiment', 'requirement_category', 'evidence', 'explanation', 'confidence'],
  propertyOrdering: ['sentiment', 'requirement_category', 'evidence', 'explanation', 'confidence']
};

/**
 * Checks if Gemini API key is validly configured
 */
export function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && !key.includes('MY_GEMINI_API_KEY'));
}

/**
 * Sleeps for ms milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Classifies a single sentence with Google Gemini AI
 * 
 * @param {string} text Feedback sentence
 * @param {object} options Configuration { k?: 0|2|4|8, model?: string }
 */
export async function classifyWithGemini(text, options = {}) {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    throw {
      status: 400,
      code: 'EMPTY_TEXT',
      message: 'Feedback text is empty. A valid sentence is required for classification.'
    };
  }

  if (!isGeminiConfigured()) {
    throw {
      status: 503,
      code: 'MISSING_API_KEY',
      message: 'GEMINI_API_KEY is not configured on the server. Please set a valid Gemini API key in server/.env or server environment variables.'
    };
  }

  const modelName = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const k = options.k !== undefined ? Number(options.k) : 0;

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const promptContents = buildPromptWithExemplars(cleanText, k);

  let attempts = 0;
  const maxAttempts = 3;
  let lastError = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema: RESPONSE_JSON_SCHEMA,
          temperature: 0.1, // Low temperature for academic determinism & consistency
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini returned an empty text payload.');
      }

      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(`Model output could not be parsed as JSON: ${responseText}`);
      }

      // Robust response validation
      const sentiment = String(parsed.sentiment || '').toUpperCase().trim();
      const requirementCategory = String(parsed.requirement_category || '').toUpperCase().trim();
      const evidence = String(parsed.evidence || '').trim() || cleanText.slice(0, 50);
      const explanation = String(parsed.explanation || '').trim() || 'Classified by Gemini AI per prompt specifications.';
      let confidence = Number(parsed.confidence);
      if (isNaN(confidence) || confidence < 0 || confidence > 1) {
        confidence = 0.90; // default model-reported baseline fallback
      }

      if (!VALID_SENTIMENTS.includes(sentiment)) {
        throw new Error(`Unsupported sentiment label '${sentiment}' received from Gemini.`);
      }

      if (!VALID_REQUIREMENTS.includes(requirementCategory)) {
        throw new Error(`Unsupported requirement label '${requirementCategory}' received from Gemini.`);
      }

      return {
        sentiment,
        requirement_category: requirementCategory,
        evidence,
        explanation,
        confidence: Math.round(confidence * 100) / 100,
        model: modelName,
        promptVersion: PROMPT_VERSION,
        k,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || String(err);

      // Handle Rate Limit (429 / RESOURCE_EXHAUSTED) with exponential backoff
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        if (attempts < maxAttempts) {
          const waitMs = attempts * 1500;
          console.warn(`[Gemini API] Rate limit hit. Backing off for ${waitMs}ms before attempt ${attempts + 1}...`);
          await sleep(waitMs);
          continue;
        }
        throw {
          status: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Gemini API rate limit or quota exceeded. Please wait a few seconds and try again.'
        };
      }

      // Handle invalid API Key (400 / 401 / 403)
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('unregistered') || errMsg.includes('403')) {
        throw {
          status: 401,
          code: 'INVALID_API_KEY',
          message: 'The configured GEMINI_API_KEY is invalid or lacks necessary permissions.'
        };
      }

      // Other non-retryable errors
      break;
    }
  }

  // If failed after retries
  throw {
    status: 500,
    code: 'GEMINI_INFERENCE_ERROR',
    message: `Gemini inference failed: ${lastError?.message || 'Unknown error'}`
  };
}
