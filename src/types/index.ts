export type RequirementCategory =
  | 'EXPLICIT_NEED'
  | 'IMPLICIT_NEED'
  | 'PAIN_POINT'
  | 'NON_ACTIONABLE';

export interface ClassificationResult {
  category: RequirementCategory;
  explanation: string;
  matchedCues: string[];
  method: string;
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
  predictedCategory?: RequirementCategory;
  explanation?: string;
  matchedCues?: string[];
  isUserAnnotated?: boolean;
  // Specific academic benchmark tracking fields
  reviewId?: string;
  sentenceId?: string;
  domain?: string;
  humanAnnotations?: HumanAnnotations;
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
