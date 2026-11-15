import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyWithGemini, isGeminiConfigured } from './geminiService.js';
import { PROMPT_VERSION } from './prompts.js';

// Resolve directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env or root .env
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // fallback to root .env if present

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '5mb' }));

// Resilient CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Health Check & Status Endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: isGeminiConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    promptVersion: PROMPT_VERSION,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

/**
 * Single Sentence Classification Endpoint
 * POST /api/classify
 * Body: { text: string, config?: { k?: number, model?: string } }
 */
app.post('/api/classify', async (req, res) => {
  try {
    const { text, config = {} } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_INPUT',
        error: 'A non-empty string "text" parameter is required in the JSON body.'
      });
    }

    const result = await classifyWithGemini(text, config);
    return res.json({
      success: true,
      result
    });
  } catch (err) {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected server error occurred during classification.';
    return res.status(status).json({
      success: false,
      code,
      error: message
    });
  }
});

/**
 * Batch Sentence Classification Endpoint with Controlled Concurrency
 * POST /api/batch-classify
 * Body: { items: Array<{ id: string, text: string }>, config?: { k?: number, concurrency?: number } }
 */
app.post('/api/batch-classify', async (req, res) => {
  try {
    const { items, config = {} } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_BATCH',
        error: 'An array of "items" with id and text is required.'
      });
    }

    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'MISSING_API_KEY',
        error: 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY to run AI batch classification.'
      });
    }

    // Controlled concurrency to prevent rate limit starvation
    const concurrency = Math.min(5, Math.max(1, config.concurrency || 3));
    const results = [];
    const queue = [...items];

    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        try {
          const result = await classifyWithGemini(item.text, config);
          results.push({
            id: item.id,
            success: true,
            result
          });
        } catch (err) {
          results.push({
            id: item.id,
            success: false,
            error: err.message || 'Inference error on this item',
            code: err.code || 'ITEM_ERROR'
          });
        }

        // Brief 150ms throttle between calls
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // Launch worker pool
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);

    return res.json({
      success: true,
      total: items.length,
      processed: results.length,
      results
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'BATCH_ERROR',
      error: err.message || 'Batch classification failed'
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Customer Requirement Analysis API] Backend server running on port ${PORT}`);
  console.log(`[Status] Gemini API Key configured: ${isGeminiConfigured() ? 'YES' : 'NO (Missing or Placeholder)'}`);
  console.log(`[Status] Default Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
});
