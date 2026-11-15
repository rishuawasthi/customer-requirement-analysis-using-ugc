/**
 * Python ML Service Bridge for Express Backend
 * Supports dual-transport communication:
 * 1. HTTP transport via FastAPI (http://localhost:8000)
 * 2. On-demand Subprocess CLI fallback using Python virtual environment
 */

import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ML_HTTP_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Locate Python executable
function getPythonExecutable() {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  const venvPythonWin = path.resolve(__dirname, '..', '..', 'nlp-service', 'venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvPythonWin)) {
    return venvPythonWin;
  }
  const venvPythonUnix = path.resolve(__dirname, '..', '..', 'nlp-service', 'venv', 'bin', 'python');
  if (fs.existsSync(venvPythonUnix)) {
    return venvPythonUnix;
  }
  return 'python';
}

/**
 * Executes Python ML CLI directly via child process
 */
function runPythonCli(action, extraArgs = [], stdinData = null) {
  return new Promise((resolve, reject) => {
    const pythonExe = getPythonExecutable();
    const repoRoot = path.resolve(__dirname, '..');
    const args = ['-m', 'server.ml.cli', '--action', action, ...extraArgs];

    const child = execFile(pythonExe, args, { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`[ML Bridge] CLI Error (${action}):`, stderr || err.message);
        return reject(err);
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseErr) {
        console.error(`[ML Bridge] JSON Parse Error (${action}):`, stdout);
        reject(new Error(`Failed to parse ML output as JSON: ${stdout.slice(0, 150)}`));
      }
    });

    if (stdinData && child.stdin) {
      child.stdin.write(typeof stdinData === 'string' ? stdinData : JSON.stringify(stdinData));
      child.stdin.end();
    }
  });
}

/**
 * Tries HTTP request to FastAPI; if unavailable, falls back to Python CLI
 */
async function callMlEndpoint(endpoint, method = 'GET', body = null, cliAction = null, cliArgs = []) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 200);

    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(`${ML_HTTP_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // HTTP service unreachable or timed out, fall through to CLI execution
  }

  // Fallback to CLI bridge
  if (cliAction) {
    return await runPythonCli(cliAction, cliArgs, body);
  }

  throw new Error(`ML service unavailable for endpoint ${endpoint}`);
}

export async function getMlStatus(mode = 'gold') {
  return await callMlEndpoint(`/ml/status?mode=${mode}`, 'GET', null, 'status', ['--mode', mode]);
}

export async function syncDatasetWithMl(records, mode = 'gold') {
  const dataFilePath = path.join(__dirname, 'data', 'adjudicated_dataset.json');
  fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
  fs.writeFileSync(dataFilePath, JSON.stringify(records, null, 2), 'utf-8');

  return await callMlEndpoint(
    '/ml/sync-dataset',
    'POST',
    { records, mode },
    'sync',
    ['--data-file', dataFilePath, '--mode', mode]
  );
}

export async function generateSplits(records = null) {
  const dataFilePath = path.join(__dirname, 'data', 'adjudicated_dataset.json');
  if (records) {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
    fs.writeFileSync(dataFilePath, JSON.stringify(records, null, 2), 'utf-8');
  }
  return await callMlEndpoint('/ml/splits', 'POST', { records }, 'split', ['--data-file', dataFilePath]);
}

export async function classifyWithSvm(text) {
  return await callMlEndpoint(
    '/ml/svm/classify',
    'POST',
    { text },
    'classify-svm',
    ['--text', text]
  );
}

export async function trainSvm(mode = 'gold') {
  const dataFilePath = mode === 'exploratory'
    ? path.join(__dirname, 'ml', 'data', 'ai_exploratory_dataset.json')
    : path.join(__dirname, 'data', 'adjudicated_dataset.json');
  return await callMlEndpoint(
    `/ml/svm/train?mode=${mode}`,
    'POST',
    { mode },
    'train-svm',
    ['--data-file', dataFilePath, '--mode', mode]
  );
}

export async function classifyWithRoberta(text) {
  return await callMlEndpoint(
    '/ml/roberta/classify',
    'POST',
    { text },
    'classify-roberta',
    ['--text', text]
  );
}

export async function trainRoberta(mode = 'gold') {
  const dataFilePath = mode === 'exploratory'
    ? path.join(__dirname, 'ml', 'data', 'ai_exploratory_dataset.json')
    : path.join(__dirname, 'data', 'adjudicated_dataset.json');
  return await callMlEndpoint(
    `/ml/roberta/train?mode=${mode}`,
    'POST',
    { mode },
    'train-roberta',
    ['--data-file', dataFilePath, '--mode', mode]
  );
}

export async function classifyAllModels(text) {
  return await callMlEndpoint(
    '/ml/classify-all',
    'POST',
    { text },
    'classify-all',
    ['--text', text]
  );
}

export async function getMlEvaluation(mode = 'gold') {
  return await callMlEndpoint(
    `/ml/evaluation?mode=${mode}`,
    'GET',
    null,
    'evaluate',
    ['--mode', mode]
  );
}
