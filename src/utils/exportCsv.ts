import { FeedbackRecord } from '../types';
import { CATEGORY_DESCRIPTIONS } from './classifier';

export interface ExportOptions {
  fileName?: string;
  filterCategory?: string; // 'ALL' or specific category
  includeMetadataColumns?: boolean;
  actionableOnly?: boolean;
}

/**
 * Escapes a single CSV value following RFC 4180 standards:
 * - Wraps in double quotes if it contains commas, double quotes, or newlines
 * - Escapes existing double quotes by doubling them ("" -> "")
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates and triggers download of a CSV file from analyzed feedback records.
 * Incorporates UTF-8 BOM so Microsoft Excel and Google Sheets render characters correctly.
 */
export function exportAnalyzedRecordsToCSV(
  records: FeedbackRecord[],
  options: ExportOptions = {}
): { count: number; filename: string } {
  if (!records || records.length === 0) {
    throw new Error('No records available to export.');
  }

  let exportSet = [...records];

  // Optional filtering: Actionable only
  if (options.actionableOnly) {
    exportSet = exportSet.filter(
      r =>
        r.predictedCategory === 'EXPLICIT_NEED' ||
        r.predictedCategory === 'IMPLICIT_NEED' ||
        r.predictedCategory === 'PAIN_POINT' ||
        r.geminiResult?.requirement_category === 'EXPLICIT_NEED' ||
        r.geminiResult?.requirement_category === 'IMPLICIT_NEED' ||
        r.geminiResult?.requirement_category === 'PAIN_POINT'
    );
  } else if (options.filterCategory && options.filterCategory !== 'ALL') {
    if (options.filterCategory === 'UNCLASSIFIED') {
      exportSet = exportSet.filter(r => !r.predictedCategory && !r.geminiResult);
    } else {
      exportSet = exportSet.filter(
        r =>
          r.predictedCategory === options.filterCategory ||
          r.geminiResult?.requirement_category === options.filterCategory
      );
    }
  }

  // Collect all unique original metadata keys across records
  const metadataKeysSet = new Set<string>();
  records.forEach(r => {
    Object.keys(r.originalMetadata || {}).forEach(k => metadataKeysSet.add(k));
  });
  const metadataKeys = Array.from(metadataKeysSet);

  // Define headers with complete model separation
  const baseHeaders = [
    'id',
    'review_id',
    'sentence_id',
    'domain',
    'feedback_text',
    // 1. Rule-Based Baseline Heuristic
    'heuristic_category_prediction',
    'heuristic_readable_label',
    'matched_linguistic_cues',
    'heuristic_explanation',
    // 2. Gemini AI Classifier
    'gemini_sentiment_polarity',
    'gemini_requirement_category',
    'gemini_evidence_span',
    'gemini_explanation',
    'gemini_confidence_reported',
    'gemini_model_name',
    'gemini_few_shot_k',
    // 3. Human Annotations
    'annotator_a_label',
    'annotator_b_label',
    'inter_annotator_agreement',
    'adjudicated_label',
    'adjudicator_notes',
    'is_manually_verified'
  ];

  const headers = options.includeMetadataColumns !== false
    ? [...baseHeaders, ...metadataKeys.map(k => `original_${k}`)]
    : baseHeaders;

  const rows = exportSet.map(record => {
    const cat = record.predictedCategory || 'UNCLASSIFIED';
    const label = record.predictedCategory
      ? CATEGORY_DESCRIPTIONS[record.predictedCategory].label
      : 'Unclassified';
    const cues = (record.matchedCues || []).join('; ');
    const explanation = record.explanation || '';

    // Gemini results
    const gSentiment = record.geminiResult?.sentiment || '';
    const gCategory = record.geminiResult?.requirement_category || '';
    const gEvidence = record.geminiResult?.evidence || '';
    const gExplanation = record.geminiResult?.explanation || '';
    const gConfidence = record.geminiResult?.confidence !== undefined ? String(record.geminiResult.confidence) : '';
    const gModel = record.geminiResult?.model || '';
    const gK = record.geminiResult?.k !== undefined ? String(record.geminiResult.k) : '';

    // Human annotations
    const annA = record.humanAnnotations?.annotatorA || '';
    const annB = record.humanAnnotations?.annotatorB || '';
    let agreement = 'INCOMPLETE';
    if (annA && annB) {
      agreement = annA === annB ? 'AGREED' : 'DISAGREED';
    }
    const adjudicated = record.humanAnnotations?.adjudicated || '';
    const notes = record.humanAnnotations?.adjudicatorNotes || '';
    const isAnnotated = record.isUserAnnotated ? 'TRUE' : 'FALSE';

    const rowData: string[] = [
      escapeCSVValue(record.id),
      escapeCSVValue(record.reviewId || ''),
      escapeCSVValue(record.sentenceId || record.id),
      escapeCSVValue(record.domain || ''),
      escapeCSVValue(record.text),
      // Heuristic
      escapeCSVValue(cat),
      escapeCSVValue(label),
      escapeCSVValue(cues),
      escapeCSVValue(explanation),
      // Gemini
      escapeCSVValue(gSentiment),
      escapeCSVValue(gCategory),
      escapeCSVValue(gEvidence),
      escapeCSVValue(gExplanation),
      escapeCSVValue(gConfidence),
      escapeCSVValue(gModel),
      escapeCSVValue(gK),
      // Human Annotations
      escapeCSVValue(annA),
      escapeCSVValue(annB),
      escapeCSVValue(agreement),
      escapeCSVValue(adjudicated),
      escapeCSVValue(notes),
      escapeCSVValue(isAnnotated)
    ];

    if (options.includeMetadataColumns !== false) {
      metadataKeys.forEach(key => {
        const val = record.originalMetadata ? record.originalMetadata[key] : '';
        rowData.push(escapeCSVValue(val ?? ''));
      });
    }

    return rowData.join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(h => escapeCSVValue(h)).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = options.fileName || `customer_requirements_analysis_${Date.now()}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    count: exportSet.length,
    filename
  };
}
