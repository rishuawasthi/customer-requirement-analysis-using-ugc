/**
 * ML Subsystem Client API
 * Connects frontend to Express ML proxy endpoints for:
 * 1. Status and dataset statistics (Mode A: Gold vs Mode B: Exploratory)
 * 2. Annotation synchronization
 * 3. SVM and RoBERTa training and inference
 * 4. Multi-model unified benchmark classification
 * 5. Full Evaluation Metrics & Bootstrap CI retrieval
 */

import { MLClassificationResult, FeedbackRecord, GeminiClassificationResult } from '../types';

export interface MLStatusResponse {
  status: string;
  mode?: 'gold' | 'exploratory';
  svm_arm: {
    model_name: string;
    status: 'trained' | 'awaiting_data';
    is_trained: boolean;
    artifact_path: string | null;
    training_metadata: Record<string, unknown> | null;
    evaluation?: BenchmarkEvaluationResult | null;
  };
  roberta_arm: {
    model_name: string;
    status: 'trained' | 'awaiting_data';
    is_trained: boolean;
    artifact_path: string | null;
    training_metadata: Record<string, unknown> | null;
    evaluation?: BenchmarkEvaluationResult | null;
  };
  dataset_statistics: {
    gold?: DatasetSplitStats;
    exploratory?: DatasetSplitStats;
    total_records?: number;
    dual_annotated_count?: number;
    adjudicated_count?: number;
    splits?: {
      train: { total: number; unique_reviews: number; class_distribution: Record<string, number> };
      val: { total: number; unique_reviews: number; class_distribution: Record<string, number> };
      test: { total: number; unique_reviews: number; class_distribution: Record<string, number> };
    };
    training_eligibility?: TrainingEligibility;
  };
}

export interface DatasetSplitStats {
  mode: string;
  total_records: number;
  dual_annotated_count: number;
  labelled_count: number;
  splits: {
    train: { total: number; unique_reviews: number; class_distribution: Record<string, number> };
    val: { total: number; unique_reviews: number; class_distribution: Record<string, number> };
    test: { total: number; unique_reviews: number; class_distribution: Record<string, number> };
  };
  training_eligibility: TrainingEligibility;
}

export interface TrainingEligibility {
  is_eligible: boolean;
  min_records_per_class: number;
  min_total_train: number;
  current_train_total: number;
  per_class_status: Record<string, { train_count: number; required: number; missing: number }>;
}

export interface BenchmarkEvaluationResult {
  model: string;
  mode: 'gold' | 'exploratory';
  test_metrics: {
    accuracy: number;
    macro_f1: number;
    weighted_f1: number;
    sample_count: number;
    per_class: Record<string, { precision: number; recall: number; f1_score: number; support: number }>;
  };
  bootstrap_ci: {
    ci_lower: number;
    ci_upper: number;
    ci_formatted: string;
    iterations: number;
    confidence: number;
  };
  confusion_matrix: {
    labels: string[];
    matrix: number[][];
    normalized_matrix: number[][];
  };
  val_metrics?: Record<string, unknown>;
}

export interface MultiModelClassificationResponse {
  success: boolean;
  text: string;
  results: {
    svm: MLClassificationResult;
    roberta: MLClassificationResult;
    gemini: GeminiClassificationResult | { status: 'error'; errorMessage: string };
  };
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  try {
    const res = await fetch(endpoint, { ...options, headers });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
  } catch (err: unknown) {
    if (endpoint.startsWith('/api/')) {
      try {
        const directRes = await fetch(`http://localhost:5000${endpoint}`, { ...options, headers });
        if (directRes.ok) {
          return await directRes.json();
        }
        const errData = await directRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `HTTP ${directRes.status}`);
      } catch {
        // Fall back to original error
      }
    }
    throw err;
  }
}

export async function fetchMlStatus(mode: 'gold' | 'exploratory' = 'gold'): Promise<MLStatusResponse> {
  return await apiFetch<MLStatusResponse>(`/api/ml/status?mode=${mode}`);
}

export async function syncAnnotationsToBackend(
  records: FeedbackRecord[],
  mode: 'gold' | 'exploratory' = 'gold'
): Promise<{ success: boolean; persisted_records: number }> {
  return await apiFetch<{ success: boolean; persisted_records: number }>('/api/annotations/sync', {
    method: 'POST',
    body: JSON.stringify({ records, mode })
  });
}

export async function generateExploratoryDataset(
  records: FeedbackRecord[]
): Promise<{ success: boolean; message: string; splits?: Record<string, unknown> }> {
  return await apiFetch('/api/ml/exploratory/generate', {
    method: 'POST',
    body: JSON.stringify({ records })
  });
}

export async function fetchServerAnnotations(): Promise<FeedbackRecord[]> {
  const res = await apiFetch<{ success: boolean; records: FeedbackRecord[] }>('/api/annotations');
  return res.records || [];
}

export async function fetchBenchmarkEvaluation(
  mode: 'gold' | 'exploratory' = 'gold'
): Promise<{ success: boolean; mode: string; test_sample_count: number; svm?: BenchmarkEvaluationResult; roberta?: BenchmarkEvaluationResult }> {
  return await apiFetch(`/api/ml/evaluation?mode=${mode}`);
}

export async function trainModel(
  model: 'svm' | 'roberta',
  mode: 'gold' | 'exploratory' = 'gold'
): Promise<{ success: boolean; status: string; message: string; metadata?: Record<string, unknown>; details?: Record<string, unknown>; evaluation?: BenchmarkEvaluationResult }> {
  return await apiFetch('/api/ml/train', {
    method: 'POST',
    body: JSON.stringify({ model, mode })
  });
}

export async function classifyAllModels(text: string, k: number = 0): Promise<MultiModelClassificationResponse> {
  return await apiFetch<MultiModelClassificationResponse>('/api/ml/classify-all', {
    method: 'POST',
    body: JSON.stringify({ text, k })
  });
}
