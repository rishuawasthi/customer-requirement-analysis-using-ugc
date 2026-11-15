import React, { useState } from 'react';
import { FeedbackRecord, RequirementCategory } from '../types';
import { CATEGORY_DESCRIPTIONS } from '../utils/classifier';
import { calculateKrippendorffAlpha } from '../utils/krippendorff';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import {
  Users,
  Scale,
  BookOpen,
  BarChart3,
  HelpCircle,
  Table as TableIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Bot
} from 'lucide-react';

interface ResearchSectionProps {
  records: FeedbackRecord[];
  onUpdateRecord: (updatedRecord: FeedbackRecord) => void;
  sourceName?: string;
}

const CATEGORIES: RequirementCategory[] = [
  'EXPLICIT_NEED',
  'IMPLICIT_NEED',
  'PAIN_POINT',
  'NON_ACTIONABLE'
];

export const ResearchSection: React.FC<ResearchSectionProps> = ({
  records,
  onUpdateRecord,
  sourceName = 'dataset'
}) => {
  // Internal Sub-navigation: 'taxonomy' | 'annotation' | 'benchmark'
  const [researchTab, setResearchTab] = useState<'taxonomy' | 'annotation' | 'benchmark'>('taxonomy');

  // Human annotation workbench state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'AGREED' | 'DISAGREED' | 'UNANNOTATED'>('ALL');
  const [activeRole, setActiveRole] = useState<'A' | 'B' | 'ADJUDICATOR'>('A');
  const [adjudicationNote, setAdjudicationNote] = useState('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Live nominal Krippendorff's alpha strictly across dual human annotations
  const agreementStats = calculateKrippendorffAlpha(records);

  // Filtered annotation records
  const filteredRecords = records.filter(record => {
    const ann = record.humanAnnotations;
    const hasA = ann?.annotatorA !== undefined;
    const hasB = ann?.annotatorB !== undefined;

    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'UNANNOTATED') return !hasA || !hasB;
    if (selectedFilter === 'AGREED') return hasA && hasB && ann?.annotatorA === ann?.annotatorB;
    if (selectedFilter === 'DISAGREED') return hasA && hasB && ann?.annotatorA !== ann?.annotatorB;
    return true;
  });

  const currentRecord: FeedbackRecord | undefined =
    filteredRecords.length > 0 ? filteredRecords[Math.min(currentIndex, filteredRecords.length - 1)] : undefined;

  // Handlers for independent human annotation
  const handleAssignAnnotatorLabel = (role: 'A' | 'B', cat: RequirementCategory) => {
    if (!currentRecord) return;

    const existing = currentRecord.humanAnnotations || {};
    const updatedAnnotations = {
      ...existing,
      ...(role === 'A'
        ? { annotatorA: cat, annotatorATimestamp: new Date().toISOString() }
        : { annotatorB: cat, annotatorBTimestamp: new Date().toISOString() })
    };

    const updatedRecord: FeedbackRecord = {
      ...currentRecord,
      isUserAnnotated: true,
      humanAnnotations: updatedAnnotations
    };

    onUpdateRecord(updatedRecord);
  };

  const handleAssignAdjudicatedLabel = (cat: RequirementCategory) => {
    if (!currentRecord) return;

    const existing = currentRecord.humanAnnotations || {};
    const updatedAnnotations = {
      ...existing,
      adjudicated: cat,
      adjudicatorNotes: adjudicationNote.trim() || 'Adjudicated per manuscript boundary rules.'
    };

    const updatedRecord: FeedbackRecord = {
      ...currentRecord,
      predictedCategory: cat,
      isUserAnnotated: true,
      humanAnnotations: updatedAnnotations
    };

    onUpdateRecord(updatedRecord);
    setAdjudicationNote('');
  };

  const handleResetAnnotations = (record: FeedbackRecord) => {
    const updatedRecord: FeedbackRecord = {
      ...record,
      humanAnnotations: undefined,
      isUserAnnotated: false
    };
    onUpdateRecord(updatedRecord);
  };

  const handleExportAnnotationStudy = () => {
    if (records.length === 0) return;
    try {
      const res = exportAnalyzedRecordsToCSV(records, {
        fileName: `annotation_study_${Date.now()}.csv`,
        includeMetadataColumns: true
      });
      setExportNotice(`Exported ${res.count} records to ${res.filename}`);
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Export error: ${msg}`);
    }
  };

  const annA = currentRecord?.humanAnnotations?.annotatorA;
  const annB = currentRecord?.humanAnnotations?.annotatorB;
  const adjudicated = currentRecord?.humanAnnotations?.adjudicated;

  let agreementStatus: 'INCOMPLETE' | 'AGREED' | 'DISAGREED' = 'INCOMPLETE';
  if (annA && annB) {
    agreementStatus = annA === annB ? 'AGREED' : 'DISAGREED';
  }

  return (
    <div className="space-y-6">
      {/* Research Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Research &amp; Methodology</h1>
          <p className="text-xs text-slate-500">
            Manuscript taxonomy, human double-annotation calibration, and empirical benchmark evaluation.
          </p>
        </div>

        {/* Sub-nav pills */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
          <button
            onClick={() => setResearchTab('taxonomy')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              researchTab === 'taxonomy'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Taxonomy &amp; RQ1–RQ4
          </button>
          <button
            onClick={() => setResearchTab('annotation')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              researchTab === 'annotation'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Human Annotation &amp; Alpha ({agreementStats.bothAnnotatedUnits})
          </button>
          <button
            onClick={() => setResearchTab('benchmark')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              researchTab === 'benchmark'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Evaluation &amp; Benchmark
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-SECTION 1: TAXONOMY & RESEARCH QUESTIONS */}
      {/* ======================================================== */}
      {researchTab === 'taxonomy' && (
        <div className="space-y-6">
          {/* Research Questions Matrix (RQ1 - RQ4) */}
          <div className="bg-white p-5 rounded border border-slate-200 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Research Questions (Section IV)</h2>
              <p className="text-xs text-slate-500">Core empirical questions investigated in the research manuscript</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">RQ1: Human Reliability</span>
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Tooling Active
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  "How reliably can independent human annotators distinguish explicit needs, implicit needs, pain points, and non-actionable content in reviews, as measured by Krippendorff's alpha?"
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Target: Nominal Krippendorff's α ≥ 0.80 for high reliability.
                </div>
              </div>

              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">RQ2: Baseline Performance</span>
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Baseline Active
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  "How effectively do traditional NLP methods (TF-IDF + Linear SVM, regex heuristics) classify requirements compared to fine-tuned transformer models (RoBERTa)?"
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Metric: Macro-F1 across the four taxonomy categories.
                </div>
              </div>

              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">RQ3: Few-Shot LLM Efficacy</span>
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Integrated (Gemini)
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  "How do zero-shot and few-shot Large Language Models (k = 0, 2, 4, 8) compare to fine-tuned supervised models without domain-specific training?"
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Tested: Google Gemini 2.5 Flash via official `@google/genai` SDK.
                </div>
              </div>

              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">RQ4: Cross-Domain Generalization</span>
                  <span className="text-[10px] font-medium bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                    Experimental Design
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  "To what extent do requirement classifiers trained on one product domain (Laptops) transfer to an unrelated service domain (Restaurants)?"
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Design: Train on Laptop (2,314 rows), evaluate on Restaurant (1,847 rows).
                </div>
              </div>
            </div>
          </div>

          {/* Four-Class Taxonomy Definitions & Boundary Rules */}
          <div className="bg-white p-5 rounded border border-slate-200 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Four-Class Requirement Taxonomy (Section III)</h2>
              <p className="text-xs text-slate-500">Formal operational definitions and precedence rules</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">1. EXPLICIT_NEED</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">Direct Request</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  The reviewer directly and explicitly requests, wants, commands, or suggests a specific feature, capability, service, or fix.
                </p>
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  <em>Example:</em> "The app should allow users to export reports as PDF."
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  <strong>Precedence Rule:</strong> A direct request takes priority even if accompanied by extreme negative sentiment.
                </div>
              </div>

              <div className="p-4 rounded border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">2. IMPLICIT_NEED</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">Inferable Need</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  A desired feature or improvement can reasonably be inferred from a described problem, limitation, or customer workaround, without a direct request.
                </p>
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  <em>Example:</em> "I have to screenshot every transaction because there is no way to save history."
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  <strong>Rule:</strong> Workarounds and counterfactual wishes ("I wish it lasted") map to IMPLICIT_NEED.
                </div>
              </div>

              <div className="p-4 rounded border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">3. PAIN_POINT</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">Dissatisfaction</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Dissatisfaction, frustration, system crash, or physical defect with NO clearly inferable desired feature or remediation.
                </p>
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  <em>Example:</em> "The checkout process is extremely frustrating and buggy."
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  <strong>Rule:</strong> If dissatisfaction exists but lacks an inferable feature specification, classify as PAIN_POINT.
                </div>
              </div>

              <div className="p-4 rounded border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">4. NON_ACTIONABLE</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">No Action Signal</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  General praise, aesthetic commentary, rating restatements, or personal narrative devoid of extractable requirement signals.
                </p>
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  <em>Example:</em> "Great app, five stars for the excellent and fast delivery team."
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  <strong>Rule:</strong> Neutral background statements or generic praise are NON_ACTIONABLE.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-SECTION 2: HUMAN ANNOTATION & KRIPPENDORFF'S ALPHA */}
      {/* ======================================================== */}
      {researchTab === 'annotation' && (
        <div className="space-y-6">
          {/* Agreement Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Krippendorff's α</div>
              <div className="text-2xl font-semibold font-mono text-slate-900 mt-1">
                {agreementStats.krippendorffAlpha !== null ? agreementStats.krippendorffAlpha.toFixed(3) : 'Pending'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Nominal chance-corrected</div>
            </div>

            <div className="bg-white p-4 rounded border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Observed Agreement</div>
              <div className="text-2xl font-semibold font-mono text-slate-900 mt-1">
                {agreementStats.percentObservedAgreement !== null ? `${agreementStats.percentObservedAgreement.toFixed(1)}%` : 'Pending'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{agreementStats.agreedUnits} agreed units</div>
            </div>

            <div className="bg-white p-4 rounded border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Disagreements</div>
              <div className="text-2xl font-semibold font-mono text-slate-900 mt-1">
                {agreementStats.disagreedUnits}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Units for Adjudication</div>
            </div>

            <div className="bg-white p-4 rounded border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Double-Annotated</div>
              <div className="text-2xl font-semibold font-mono text-slate-900 mt-1">
                {agreementStats.bothAnnotatedUnits} / {records.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Dual-coder units</div>
            </div>
          </div>

          {exportNotice && (
            <div className="p-2.5 bg-slate-100 border border-slate-300 rounded text-xs text-slate-800">
              {exportNotice}
            </div>
          )}

          {/* Annotation Task Workbench */}
          {currentRecord && (
            <div className="bg-white rounded border border-slate-200 p-5 space-y-4">
              {/* Navigator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-medium text-slate-500">Unit:</span>
                  <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {currentRecord.id}
                  </span>
                  {agreementStatus === 'AGREED' && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium text-[11px]">
                      Annotator Agreement
                    </span>
                  )}
                  {agreementStatus === 'DISAGREED' && (
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium text-[11px]">
                      Annotator Disagreement
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono text-slate-600">
                    {currentIndex + 1} / {filteredRecords.length}
                  </span>
                  <button
                    onClick={() => setCurrentIndex(i => Math.min(filteredRecords.length - 1, i + 1))}
                    disabled={currentIndex >= filteredRecords.length - 1}
                    className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleExportAnnotationStudy}
                    className="ml-2 inline-flex items-center px-2.5 py-1 text-xs border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="w-3 h-3 mr-1 text-slate-500" />
                    Export Study CSV
                  </button>
                </div>
              </div>

              {/* Feedback Sentence */}
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                  Target Feedback Unit
                </div>
                <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                  "{currentRecord.text}"
                </p>
              </div>

              {/* Dual Annotator Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Annotator A */}
                <div className="p-4 rounded border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-900">Annotator A</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {annA ? `Selected: ${CATEGORY_DESCRIPTIONS[annA].label}` : 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleAssignAnnotatorLabel('A', cat)}
                        className={`p-2 rounded text-left border transition-colors ${
                          annA === cat
                            ? 'bg-slate-900 text-white font-medium border-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {CATEGORY_DESCRIPTIONS[cat].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Annotator B */}
                <div className="p-4 rounded border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-900">Annotator B (Independent)</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {annB ? `Selected: ${CATEGORY_DESCRIPTIONS[annB].label}` : 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleAssignAnnotatorLabel('B', cat)}
                        className={`p-2 rounded text-left border transition-colors ${
                          annB === cat
                            ? 'bg-slate-900 text-white font-medium border-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {CATEGORY_DESCRIPTIONS[cat].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Adjudication Panel (Shown when disagreement or when active) */}
              {(annA && annB && annA !== annB) && (
                <div className="p-4 rounded border border-amber-200 bg-amber-50/40 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                    <span className="font-semibold text-amber-900">Adjudication Required (Coders Disagree)</span>
                    <span className="text-amber-800 font-mono text-[11px]">
                      A: {annA} vs B: {annB}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleAssignAdjudicatedLabel(cat)}
                        className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                          adjudicated === cat
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        Resolve as: {CATEGORY_DESCRIPTIONS[cat].label}
                      </button>
                    ))}
                  </div>

                  {adjudicated && (
                    <div className="text-[11px] text-slate-700 font-mono">
                      Adjudicated Resolution: <strong>{adjudicated}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-SECTION 3: EVALUATION & BENCHMARK COMPARISON */}
      {/* ======================================================== */}
      {researchTab === 'benchmark' && (
        <div className="space-y-6">
          {/* Table VI Model Benchmark Comparison */}
          <div className="bg-white p-5 rounded border border-slate-200 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Table VI: Research Baseline &amp; Model Benchmark</h2>
              <p className="text-xs text-slate-500">
                Comparative classification performance across model paradigms (Section VIII of Manuscript)
              </p>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-700 text-left font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Model / Family</th>
                    <th className="px-3 py-2.5">Paradigm</th>
                    <th className="px-3 py-2.5">Macro-F1</th>
                    <th className="px-3 py-2.5">Precision</th>
                    <th className="px-3 py-2.5">Recall</th>
                    <th className="px-3 py-2.5">Implementation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="bg-slate-50/60 font-medium">
                    <td className="px-3 py-2 text-slate-900">Rule-Based Heuristic</td>
                    <td className="px-3 py-2 text-slate-500">Syntactic Regex Rules</td>
                    <td className="px-3 py-2 font-mono text-slate-900">0.625 (sample)</td>
                    <td className="px-3 py-2 font-mono text-slate-500">0.641</td>
                    <td className="px-3 py-2 font-mono text-slate-500">0.625</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                        Implemented Baseline
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2 text-slate-900">TF-IDF + Linear SVM</td>
                    <td className="px-3 py-2 text-slate-500">Statistical N-gram (n=1..3)</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Pending]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Pending]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Pending]</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Pending Execution
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2 text-slate-900">Fine-tuned RoBERTa-base</td>
                    <td className="px-3 py-2 text-slate-500">Supervised Transformer</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Pending]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Pending]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Pending]</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Pending Gold Labels
                      </span>
                    </td>
                  </tr>

                  <tr className="bg-slate-50/40">
                    <td className="px-3 py-2 text-slate-900">Gemini 2.5 Flash (k=0)</td>
                    <td className="px-3 py-2 text-slate-500">Zero-Shot LLM</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                        Integrated &amp; Verified
                      </span>
                    </td>
                  </tr>

                  <tr className="bg-slate-50/40">
                    <td className="px-3 py-2 text-slate-900">Gemini 2.5 Flash (k=2)</td>
                    <td className="px-3 py-2 text-slate-500">Few-Shot Boundary Calibration</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                        Integrated &amp; Verified
                      </span>
                    </td>
                  </tr>

                  <tr className="bg-slate-50/40">
                    <td className="px-3 py-2 text-slate-900">Gemini 2.5 Flash (k=4)</td>
                    <td className="px-3 py-2 text-slate-500">Few-Shot Balanced (1 per class)</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                        Integrated &amp; Verified
                      </span>
                    </td>
                  </tr>

                  <tr className="bg-slate-50/40">
                    <td className="px-3 py-2 text-slate-900">Gemini 2.5 Flash (k=8)</td>
                    <td className="px-3 py-2 text-slate-500">Few-Shot Balanced (2 per class)</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2 font-mono text-slate-700">Live API</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                        Integrated &amp; Verified
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Integrity Note: </span>
              In compliance with academic standards, unexecuted experiments remain explicitly marked as pending. Metric columns are not populated with synthetic or fabricated numbers.
            </div>
          </div>

          {/* Limitations and Future Work */}
          <div className="bg-white p-5 rounded border border-slate-200 space-y-3 text-xs">
            <h2 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
              Limitations &amp; Future Work (Section IX)
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 leading-relaxed">
              <li>
                <strong>Single-Sentence Scope:</strong> The current taxonomy operates on sentence units. Multi-sentence reviews with cross-sentence requirement context require paragraph-level modeling.
              </li>
              <li>
                <strong>Sarcasm and Indirect Workarounds:</strong> Highly sarcastic customer reviews or obscure technical workarounds present challenges for syntactic regex matching.
              </li>
              <li>
                <strong>Full Dataset GPU Fine-Tuning:</strong> Completing the RoBERTa baseline requires finalizing full human double-adjudication across all 4,161 rows prior to supervised checkpointing.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
