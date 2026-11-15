export type RequirementCategory =
  | 'EXPLICIT_NEED'
  | 'IMPLICIT_NEED'
  | 'PAIN_POINT'
  | 'NON_ACTIONABLE';

export type SentimentCategory =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'NEUTRAL'
  | 'MIXED';

export interface ClassificationResult {
  category: RequirementCategory;
  explanation: string;
  matchedCues: string[];
  method: string;
}

export interface GeminiClassificationResult {
  sentiment: SentimentCategory;
  requirement_category: RequirementCategory;
  evidence: string;
  explanation: string;
  confidence: number;
  model: string;
  promptVersion: string;
  k: number;
  timestamp: string;
  status: 'success' | 'error';
  errorMessage?: string;
}

export interface HumanAnnotations {
  annotatorA?: RequirementCategory;
  annotatorB?: RequirementCategory;
  annotatorATimestamp?: string;
  annotatorBTimestamp?: string;
  adjudicated?: RequirementCategory;
  adjudicatorNotes?: string;
}

export interface FeedbackRecord {
  id: string;
  text: string;
  originalMetadata: Record<string, string>;
  
  // 1. Rule-Based Heuristic Baseline
  predictedCategory?: RequirementCategory;
  explanation?: string;
  matchedCues?: string[];
  
  // 2. Gemini AI Classifier (Independent dimensions)
  geminiResult?: GeminiClassificationResult;
  
  // 3. Human Annotations (Strictly independent)
  isUserAnnotated?: boolean;
  humanAnnotations?: HumanAnnotations;

  // 4. Academic Dataset Metadata
  reviewId?: string;
  sentenceId?: string;
  domain?: string;
}

export interface DatasetSummary {
  fileName: string;
  totalRecords: number;
  uniqueReviewsCount: number;
  uniqueSentencesCount: number;
  classifiedCount: number;
  unclassifiedCount: number;
  categoryCounts: Record<RequirementCategory, number>;
  originalMetadataKeys: string[];
  originalPolarityCounts?: Record<string, number>;
  domainCounts?: Record<string, number>;
  averageWordCount: number;
}

export interface AgreementStats {
  totalUnits: number;
  bothAnnotatedUnits: number;
  agreedUnits: number;
  disagreedUnits: number;
  percentObservedAgreement: number | null;
  krippendorffAlpha: number | null;
  interpretation: string;
  categoryCounts: Record<RequirementCategory, { annotatorA: number; annotatorB: number; total: number }>;
}

export type DatasetOptionId = 'curated_45' | 'full_4161' | 'custom';

export interface DatasetOption {
  id: DatasetOptionId;
  name: string;
  fileName: string;
  totalRows: number;
  uniqueReviews: number;
  uniqueSentences: number;
  domains: string[];
  description: string;
  isDefault?: boolean;
}

export interface GeminiBenchmarkConfig {
  k: 0 | 2 | 4 | 8;
  model: string;
  promptVersion: string;
}
