import { GeminiClassificationResult } from '../types';

export interface BackendHealth {
  status: string;
  geminiConfigured: boolean;
  model: string;
  promptVersion: string;
}

// In-memory client cache to prevent redundant API calls
const clientInferenceCache = new Map<string, GeminiClassificationResult>();

/**
 * Checks connectivity and configuration of the Node.js backend
 */
export async function checkBackendHealth(): Promise<BackendHealth | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // If running Vite without proxy or backend down
    try {
      const directRes = await fetch('http://localhost:5000/api/health');
      if (directRes.ok) return await directRes.json();
    } catch {
      // not reachable
    }
    return null;
  }
}

/**
 * Calls backend API to classify a single feedback sentence using Gemini AI
 */
export async function classifyWithGemini(
  text: string,
  config: { k?: number; model?: string } = {}
): Promise<{ success: boolean; result?: GeminiClassificationResult; error?: string }> {
  const clean = text.trim();
  if (!clean) {
    return { success: false, error: 'Cannot classify empty text.' };
  }

  const cacheKey = `${clean}|k=${config.k || 0}|model=${config.model || 'default'}`;
  if (clientInferenceCache.has(cacheKey)) {
    return { success: true, result: clientInferenceCache.get(cacheKey) };
  }

  try {
    let response: Response;
    try {
      response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, config })
      });
    } catch {
      // Fallback direct port 5000 call
      response = await fetch('http://localhost:5000/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, config })
      });
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status} error during classification`
      };
    }

    const result: GeminiClassificationResult = data.result;
    clientInferenceCache.set(cacheKey, result);
    return { success: true, result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return {
        success: false,
        error: 'Backend API is not running. Please start the backend in a terminal using: npm run server'
      };
    }
    return { success: false, error: msg };
  }
}

/**
 * Batch classification with controlled client concurrency and cancellation
 */
export async function batchClassifyWithGemini(
  items: Array<{ id: string; text: string }>,
  config: { k?: number; concurrency?: number } = {},
  onProgress?: (processed: number, total: number, latestResult?: { id: string; result?: GeminiClassificationResult; error?: string }) => void,
  shouldCancel?: () => boolean
): Promise<{
  processed: number;
  total: number;
  results: Map<string, GeminiClassificationResult>;
  errors: Map<string, string>;
}> {
  const total = items.length;
  const results = new Map<string, GeminiClassificationResult>();
  const errors = new Map<string, string>();

  const queue = [...items];
  let processedCount = 0;
  const concurrency = Math.min(4, Math.max(1, config.concurrency || 2));

  async function worker() {
    while (queue.length > 0) {
      if (shouldCancel && shouldCancel()) {
        break;
      }

      const item = queue.shift();
      if (!item) break;

      const res = await classifyWithGemini(item.text, config);
      processedCount++;

      if (res.success && res.result) {
        results.set(item.id, res.result);
        if (onProgress) onProgress(processedCount, total, { id: item.id, result: res.result });
      } else {
        const errMsg = res.error || 'Failed to classify item';
        errors.set(item.id, errMsg);
        if (onProgress) onProgress(processedCount, total, { id: item.id, error: errMsg });
      }

      // Small delay between calls to preserve quota
      await new Promise(r => setTimeout(r, 120));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return {
    processed: processedCount,
    total,
    results,
    errors
  };
}
