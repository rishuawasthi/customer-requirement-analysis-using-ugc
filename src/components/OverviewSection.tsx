import React, { useState } from 'react';
import { FeedbackRecord, RequirementCategory } from '../types';
import { CATEGORY_DESCRIPTIONS } from '../utils/classifier';
import { ExportModal } from './ExportModal';
import { Database, AlertCircle, Play, FileText, ArrowRight, Download, Users } from 'lucide-react';

interface OverviewSectionProps {
  records: FeedbackRecord[];
  sourceName: string;
  detectedTextColumn: string;
  uniqueReviewsCount?: number;
  uniqueSentencesCount?: number;
  onGoToAnalysis: () => void;
  onGoToDataset: () => void;
  onGoToAnnotation?: () => void;
  onBatchClassify: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  records,
  sourceName,
  detectedTextColumn,
  uniqueReviewsCount,
  uniqueSentencesCount,
  onGoToAnalysis,
  onGoToDataset,
  onGoToAnnotation,
  onBatchClassify
}) => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const total = records.length;
  const classified = records.filter(r => r.predictedCategory !== undefined);
  const geminiClassified = records.filter(r => r.geminiResult !== undefined);
  const unclassifiedCount = total - classified.length;
  const humanAnnotatedCount = records.filter(
    r => r.humanAnnotations?.annotatorA !== undefined && r.humanAnnotations?.annotatorB !== undefined
  ).length;

  const categoryCounts: Record<RequirementCategory, number> = {
    EXPLICIT_NEED: 0,
    IMPLICIT_NEED: 0,
    PAIN_POINT: 0,
    NON_ACTIONABLE: 0
  };

  classified.forEach(r => {
    if (r.predictedCategory && categoryCounts[r.predictedCategory] !== undefined) {
      categoryCounts[r.predictedCategory]++;
    }
  });

  // Calculate actual dataset statistics
  const wordCounts = records.map(r => r.text.trim().split(/\s+/).filter(Boolean).length);
  const avgWords = wordCounts.length > 0 ? (wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length).toFixed(1) : '0';
  const minWords = wordCounts.length > 0 ? Math.min(...wordCounts) : 0;
  const maxWords = wordCounts.length > 0 ? Math.max(...wordCounts) : 0;

  // Extract original dataset polarity if available from SemEval
  const polarityCounts: Record<string, number> = {};
  records.forEach(r => {
    const pol = r.originalMetadata['polarity'] || r.originalMetadata['sentiment'];
    if (pol) {
      const key = pol.toLowerCase().trim();
      polarityCounts[key] = (polarityCounts[key] || 0) + 1;
    }
  });

  // Extract domain breakdown if available
  const domainCounts: Record<string, number> = {};
  records.forEach(r => {
    const d = r.domain || r.originalMetadata['domain'];
    if (d) {
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
  });

  const categories: RequirementCategory[] = [
    'EXPLICIT_NEED',
    'IMPLICIT_NEED',
    'PAIN_POINT',
    'NON_ACTIONABLE'
  ];

  if (total === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center max-w-2xl mx-auto my-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Feedback Records Loaded</h2>
          <p className="text-sm text-slate-600 mb-6">
            The dataset is currently empty. To analyze customer requirements, load the provided SemEval-2015 dataset or upload an Excel / CSV file.
          </p>
          <button
            onClick={onGoToDataset}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-700 hover:bg-blue-800 focus:outline-none"
          >
            Go to Dataset Switcher to Load Records
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Dataset Status */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">
            Current Dataset Status
          </div>
          <div className="text-lg font-semibold text-slate-900 flex flex-wrap items-center gap-2">
            <span>{sourceName}</span>
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Text column: {detectedTextColumn || 'text'}
            </span>
            {humanAnnotatedCount > 0 && (
              <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {humanAnnotatedCount} Human Double-Annotated
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unclassifiedCount > 0 ? (
            <button
              onClick={onBatchClassify}
              className="inline-flex items-center px-3.5 py-2 border border-blue-700 text-sm font-medium rounded-md text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-2xs"
            >
              <Play className="w-4 h-4 mr-2" />
              Classify Remaining ({unclassifiedCount.toLocaleString()})
            </button>
          ) : (
            <span className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 font-medium">
              All {total.toLocaleString()} records classified (Heuristic)
            </span>
          )}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
            title="Download analyzed results as CSV for academic report"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Export CSV
          </button>
          <button
            onClick={onGoToAnalysis}
            className="inline-flex items-center px-3.5 py-1.5 border border-blue-200 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            Inspect Analysis
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* Primary Quantitative Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Records */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Total Loaded Rows</div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{total.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {uniqueReviewsCount ? `${uniqueReviewsCount.toLocaleString()} reviews | ` : ''}
            {uniqueSentencesCount ? `${uniqueSentencesCount.toLocaleString()} sentences` : 'Current dataset rows'}
          </div>
        </div>

        {/* Heuristic Classified Count */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Heuristic Baseline</div>
          <div className="text-2xl font-bold text-blue-700 font-mono">
            {classified.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {total > 0 ? `${((classified.length / total) * 100).toFixed(0)}% rule-classified` : '0%'}
          </div>
        </div>

        {/* Gemini AI Classified Count */}
        <div className="bg-white p-3.5 rounded-lg border border-purple-200 bg-purple-50/20 shadow-2xs">
          <div className="text-xs font-medium text-purple-900 mb-1">Gemini AI Classified</div>
          <div className="text-2xl font-bold text-purple-700 font-mono">
            {geminiClassified.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-purple-700 mt-1">
            {total > 0 ? `${((geminiClassified.length / total) * 100).toFixed(0)}% AI processed` : '0%'}
          </div>
        </div>

        {/* Actionable Requirements Identified */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Actionable Needs</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {(categoryCounts.EXPLICIT_NEED + categoryCounts.IMPLICIT_NEED + categoryCounts.PAIN_POINT).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Explicit + Implicit + Pain
          </div>
        </div>

        {/* Human Double-Annotated Pairs */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Human Double-Annotated</div>
          <div className="text-2xl font-bold text-slate-700 font-mono">
            {humanAnnotatedCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Paired units for Alpha
          </div>
        </div>
      </div>

      {/* Requirement Categories Distribution */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Heuristic Predictions Distribution (Rule-Based Baseline)
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown across the four manuscript categories produced by the deterministic linguistic heuristic.
            </p>
          </div>
          {classified.length === 0 && (
            <div className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
              Run classification to populate heuristic breakdown
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {categories.map(catKey => {
            const count = categoryCounts[catKey];
            const pct = classified.length > 0 ? ((count / classified.length) * 100).toFixed(1) : '0.0';
            const info = CATEGORY_DESCRIPTIONS[catKey];

            return (
              <div
                key={catKey}
                className={`p-4 rounded-lg border border-slate-200 bg-white ${info.borderClass}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700">{info.label}</span>
                  <span className="text-xs font-mono font-medium text-slate-500">{pct}%</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono mb-2">
                  {count.toLocaleString()}
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className={`h-full ${
                      catKey === 'EXPLICIT_NEED'
                        ? 'bg-blue-600'
                        : catKey === 'IMPLICIT_NEED'
                        ? 'bg-emerald-600'
                        : catKey === 'PAIN_POINT'
                        ? 'bg-amber-600'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {info.summary}
                </p>
              </div>
            );
          })}
        </div>

        {/* Academic Integrity Disclaimer Banner */}
        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">Research Integrity Notice: </span>
            The category counts above represent <em>heuristic baseline predictions</em> generated by deterministic linguistic pattern matching. They are NOT ground-truth human labels. Human ground-truth validation is conducted independently via the{' '}
            <button
              onClick={onGoToAnnotation}
              className="text-blue-700 underline font-medium hover:text-blue-800"
            >
              Human Annotation &amp; Alpha
            </button>{' '}
            tab.
          </div>
        </div>
      </div>

      {/* Dataset Profile Summary Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dataset Profile */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-blue-700" />
            <h4 className="text-sm font-semibold text-slate-900">Dataset Profile &amp; Segmentation</h4>
          </div>
          <table className="w-full text-xs text-left">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500 font-medium">Source Filename</td>
                <td className="py-2 text-slate-800 font-mono text-right">{sourceName}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500 font-medium">Text Field Analyzed</td>
                <td className="py-2 text-slate-800 font-mono text-right">{detectedTextColumn}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500 font-medium">Total Feedback Rows</td>
                <td className="py-2 text-slate-800 font-mono text-right">{total.toLocaleString()}</td>
              </tr>
              {uniqueReviewsCount && (
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500 font-medium">Unique Review IDs</td>
                  <td className="py-2 text-slate-800 font-mono text-right">{uniqueReviewsCount.toLocaleString()}</td>
                </tr>
              )}
              {uniqueSentencesCount && (
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500 font-medium">Unique Sentence Units</td>
                  <td className="py-2 text-slate-800 font-mono text-right">{uniqueSentencesCount.toLocaleString()}</td>
                </tr>
              )}
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500 font-medium">Average Word Count</td>
                <td className="py-2 text-slate-800 font-mono text-right">{avgWords} words/sentence</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500 font-medium">Word Count Range</td>
                <td className="py-2 text-slate-800 font-mono text-right">{minWords} - {maxWords} words</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500 font-medium">Domain Breakdown</td>
                <td className="py-2 text-slate-800 font-mono text-right">
                  {Object.keys(domainCounts).length > 0
                    ? Object.entries(domainCounts).map(([k, v]) => `${k} (${v.toLocaleString()})`).join(', ')
                    : 'Curated Multi-Domain'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Original SemEval Metadata Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-100">
            <Database className="w-4 h-4 text-blue-700" />
            <h4 className="text-sm font-semibold text-slate-900">Original Benchmark Polarity (SemEval ABSA)</h4>
          </div>

          {Object.keys(polarityCounts).length > 0 ? (
            <div>
              <p className="text-xs text-slate-500 mb-3">
                Distribution of original aspect sentiment polarity in the loaded benchmark. These tags represent emotional tone and are kept strictly distinct from requirement categories.
              </p>
              <div className="space-y-2.5">
                {Object.entries(polarityCounts).map(([polarity, count]) => {
                  const pct = ((count / total) * 100).toFixed(1);
                  return (
                    <div key={polarity}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 uppercase tracking-wide">
                          {polarity}
                        </span>
                        <span className="font-mono text-slate-600">
                          {count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            polarity === 'positive'
                              ? 'bg-emerald-500'
                              : polarity === 'negative'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4">
              No original sentiment polarity column detected in the uploaded dataset.
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Academic distinction: </span>
            A "negative" sentiment polarity does NOT necessarily constitute an "explicit need". It can be an uninferable pain point, an implicit preference, or non-actionable venting.
          </div>
        </div>
      </div>

      {/* Academic Project Deliverables & CSV Export Card */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm mb-1">
            <Download className="w-4 h-4 text-blue-700" />
            <span>Academic Project Report Deliverable</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            Export the complete active dataset with evaluated requirement categories, linguistic pattern rationales,
            manual verification flags, and original SemEval benchmark tags into an RFC-compliant CSV file.
          </p>
        </div>
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-md shadow-xs text-white bg-blue-700 hover:bg-blue-800 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Dataset as CSV
        </button>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={records}
        sourceName={sourceName}
      />
    </div>
  );
};
