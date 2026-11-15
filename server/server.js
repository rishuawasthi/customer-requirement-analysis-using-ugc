import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { classifyWithGemini, isGeminiConfigured } from './geminiService.js';
import { PROMPT_VERSION, getFewShotExemplarStatus } from './prompts.js';
import {
  getMlStatus,
  syncDatasetWithMl,
  generateSplits,
  classifyWithSvm,
  trainSvm,
  classifyWithRoberta,
  trainRoberta,
  classifyAllModels,
  getMlEvaluation
} from './mlBridge.js';

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
app.get('/api/health', async (req, res) => {
  let mlStatus = null;
  try {
    mlStatus = await getMlStatus();
  } catch (err) {
    mlStatus = { status: 'offline', error: err.message };
  }

  res.json({
    status: 'ok',
    geminiConfigured: isGeminiConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    promptVersion: PROMPT_VERSION,
    mlService: mlStatus,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

/**
 * Machine Learning Subsystem Status
 * GET /api/ml/status?mode=gold|exploratory
 */
app.get('/api/ml/status', async (req, res) => {
  try {
    const mode = req.query.mode === 'exploratory' ? 'exploratory' : 'gold';
    const status = await getMlStatus(mode);
    return res.json({ success: true, ...status });
  } catch (err) {
    return res.status(503).json({
      success: false,
      code: 'ML_SERVICE_UNAVAILABLE',
      error: err.message || 'Failed to retrieve Python ML service status'
    });
  }
});

/**
 * Split Manifests & Zero-Leakage Verification
 * GET /api/ml/splits
 */
app.get('/api/ml/splits', async (req, res) => {
  try {
    const mode = req.query.mode === 'exploratory' ? 'exploratory' : 'gold';
    const result = await generateSplits(null, mode);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Benchmark Evaluation Results Table VI
 * GET /api/ml/evaluation?mode=gold|exploratory
 */
app.get('/api/ml/evaluation', async (req, res) => {
  try {
    const mode = req.query.mode === 'exploratory' ? 'exploratory' : 'gold';
    const result = await getMlEvaluation(mode);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Human Annotation Synchronization Endpoint
 * POST /api/annotations/sync
 * Body: { records: Array<FeedbackRecord>, mode?: 'gold' | 'exploratory' }
 */
app.post('/api/annotations/sync', async (req, res) => {
  try {
    const { records = [], mode = 'gold' } = req.body || {};
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Expected records array' });
    }

    const annotationsPath = path.join(__dirname, 'data', 'human_annotations.json');
    fs.mkdirSync(path.dirname(annotationsPath), { recursive: true });
    fs.writeFileSync(annotationsPath, JSON.stringify(records, null, 2), 'utf-8');

    // Forward to Python ML engine for review_id partitioning and stats update
    const mlSync = await syncDatasetWithMl(records, mode);

    return res.json({
      success: true,
      persisted_records: records.length,
      mlSync
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'ANNOTATION_SYNC_ERROR',
      error: err.message
    });
  }
});

/**
 * Generate Weak AI Exploratory Dataset for Mode B
 * POST /api/ml/exploratory/generate
 * Body: { records: Array<FeedbackRecord> }
 */
app.post('/api/ml/exploratory/generate', async (req, res) => {
  try {
    const { records = [] } = req.body || {};
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Expected records array' });
    }

    // Exploratory labels must be explicit weak predictions; never silently
    // convert missing labels into NON_ACTIONABLE or reuse gold labels.
    const exploratoryRecords = records
      .filter(r => ['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE']
        .includes(r.exploratoryLabel || r.predictedCategory))
      .map(r => ({
        ...r,
        exploratoryLabel: r.exploratoryLabel || r.predictedCategory
      }));

    if (exploratoryRecords.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'NO_EXPLORATORY_LABELS',
        error: 'No valid weak labels found. Run the rule-based classifier first, then retry.'
      });
    }

    const exploratoryPath = path.join(__dirname, 'ml', 'data', 'ai_exploratory_dataset.json');
    fs.mkdirSync(path.dirname(exploratoryPath), { recursive: true });
    fs.writeFileSync(exploratoryPath, JSON.stringify(exploratoryRecords, null, 2), 'utf-8');

    const splitRes = await generateSplits(exploratoryRecords, 'exploratory');

    return res.json({
      success: true,
      message: `Generated Mode B exploratory dataset with ${exploratoryRecords.length} records.`,
      splits: splitRes
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Retrieve Server-Persisted Annotations
 * GET /api/annotations
 */
app.get('/api/annotations', (req, res) => {
  try {
    const annotationsPath = path.join(__dirname, 'data', 'human_annotations.json');
    if (fs.existsSync(annotationsPath)) {
      const data = JSON.parse(fs.readFileSync(annotationsPath, 'utf-8'));
      return res.json({ success: true, records: data });
    }
    return res.json({ success: true, records: [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Supervised Training Endpoints
 * POST /api/ml/train
 * Body: { model: 'svm' | 'roberta', mode?: 'gold' | 'exploratory' }
 */
app.post('/api/ml/train', async (req, res) => {
  try {
    const { model = 'svm', mode = 'gold' } = req.body || {};
    let trainResult;
    if (model === 'svm') {
      trainResult = await trainSvm(mode);
    } else if (model === 'roberta') {
      trainResult = await trainRoberta(mode);
    } else {
      return res.status(400).json({ success: false, error: "Invalid model arm. Must be 'svm' or 'roberta'." });
    }
    return res.json(trainResult);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Unified Multi-Model Classification Endpoint
 * POST /api/ml/classify-all
 * Body: { text: string, k?: number }
 * Runs all active formal arms (SVM, RoBERTa, Gemini) for side-by-side benchmarking.
 */
app.post('/api/ml/classify-all', async (req, res) => {
  try {
    const { text, k = 0 } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Feedback text is required' });
    }

    const cleanText = text.trim();

    // 1. Arm 1 (SVM) & Arm 2 (RoBERTa) via Python ML
    let mlResults = { svm: null, roberta: null };
    try {
      mlResults = await classifyAllModels(cleanText);
    } catch (mlErr) {
      mlResults = {
        svm: { status: 'error', errorMessage: mlErr.message },
        roberta: { status: 'error', errorMessage: mlErr.message }
      };
    }

    // 2. Arm 3: Gemini AI (if configured)
    let geminiResult = null;
    if (isGeminiConfigured()) {
      try {
        geminiResult = await classifyWithGemini(cleanText, { k: Number(k) });
      } catch (gemErr) {
        geminiResult = {
          status: 'error',
          errorMessage: gemErr.message || 'Gemini inference failed'
        };
      }
    } else {
      geminiResult = {
        status: 'error',
        errorMessage: 'Gemini API key is not configured on the server.'
      };
    }

    return res.json({
      success: true,
      text: cleanText,
      results: {
        svm: mlResults.svm,
        roberta: mlResults.roberta,
        gemini: geminiResult
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
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
