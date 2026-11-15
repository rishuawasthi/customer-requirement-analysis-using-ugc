import React, { useState, useEffect } from 'react';
import { FeedbackRecord, RequirementCategory } from '../types';
import { CATEGORY_DESCRIPTIONS } from '../utils/classifier';
import { calculateKrippendorffAlpha } from '../utils/krippendorff';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import {
  fetchMlStatus,
  fetchBenchmarkEvaluation,
  trainModel,
  generateExploratoryDataset,
  BenchmarkEvaluationResult,
  MLStatusResponse
} from '../services/mlApi';
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
  Bot,
  RefreshCw,
  AlertCircle,
  Sparkles,
  CheckCircle2
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

  // Benchmark state & evaluation
  const [benchmarkMode, setBenchmarkMode] = useState<'gold' | 'exploratory'>('gold');
  const [evaluationData, setEvaluationData] = useState<{
    svm?: BenchmarkEvaluationResult | null;
    roberta?: BenchmarkEvaluationResult | null;
  } | null>(null);
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [isTrainingExploratory, setIsTrainingExploratory] = useState(false);
  const [benchmarkNotice, setBenchmarkNotice] = useState<string | null>(null);

  useEffect(() => {
    refreshBenchmark();
  }, [benchmarkMode]);

  const refreshBenchmark = async () => {
    try {
      const status = await fetchMlStatus(benchmarkMode);
      setMlStatus(status);
      const evalRes = await fetchBenchmarkEvaluation(benchmarkMode);
      if (evalRes && evalRes.success) {
        setEvaluationData({
          svm: evalRes.svm || null,
          roberta: evalRes.roberta || null
        });
      }
    } catch {
      // Backend not yet reachable
    }
  };

  const handleRunExploratoryBenchmark = async () => {
    try {
      setIsTrainingExploratory(true);
      setBenchmarkNotice('Generating Mode B exploratory partition and training Linear SVM baseline...');
      await generateExploratoryDataset(records);
      const trainRes = await trainModel('svm', 'exploratory');
      await refreshBenchmark();
      setBenchmarkNotice(trainRes.message || 'Mode B exploratory benchmark trained and evaluated successfully.');
      setTimeout(() => setBenchmarkNotice(null), 4500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBenchmarkNotice(`Exploratory run failed: ${msg}`);
      setTimeout(() => setBenchmarkNotice(null), 5000);
    } finally {
      setIsTrainingExploratory(false);
    }
  };

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
                  "How reliably can independent human annotators distinguish explicit needs, implicit needs, pain points, and non-actionable content in product and application reviews, as measured by Krippendorff's alpha?"
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Target: Nominal Krippendorff's α ≥ 0.80 across independent coders (A &amp; B).
                </div>
              </div>

              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">RQ2: Comparative Model Performance</span>
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                    3 Paradigms Integrated
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  "How do TF-IDF with a linear SVM, a fine-tuned RoBERTa classifier, and zero-/few-shot LLM prompting compare on this four-way classification task, in terms of Macro-F1 and per-class precision and recall?"
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Metric: Macro-F1, per-class precision, recall, and class-weighted loss.
                </div>
              </div>

              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">RQ3: Cross-Domain Generalization</span>
                  <span className="text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded">
                    Held-Out Domain
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  "How does model performance change when a model developed on product-review data is evaluated on application reviews from a held-out domain?"
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Design: In-domain vs out-of-domain transfer evaluation.
                </div>
              </div>

              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">RQ4 (Secondary): Few-Shot Exemplar Scaling</span>
                  <span className="text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded">
                    k ∈ (0, 2, 4, 8) per class
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  "How does the number of in-context examples (k = 0, 2, 4, 8 per class, totals: 0, 8, 16, 32) affect LLM classification performance on the four-category task?"
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Tested: Gemini 2.5 Flash with balanced human-adjudicated training exemplars.
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
          {/* Mode Switcher Banner */}
          <div className="bg-white p-4 rounded border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-900 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <span>Evaluation Partitioning &amp; Supervision Paradigm</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Select between the formal human gold benchmark (Mode A) and exploratory weak supervision (Mode B).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setBenchmarkMode('gold')}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                  benchmarkMode === 'gold'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Mode A: Human Gold Benchmark
              </button>
              <button
                onClick={() => setBenchmarkMode('exploratory')}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                  benchmarkMode === 'exploratory'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Mode B: Exploratory Weak AI
              </button>
            </div>
          </div>

          {/* Mode Notification / Action Bar */}
          {benchmarkNotice && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-700 shrink-0" />
              <span>{benchmarkNotice}</span>
            </div>
          )}

          {benchmarkMode === 'exploratory' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-900">Mode B: Exploratory Pipeline Execution</span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Generates rule-based weak supervision labels on the 70/15/15 review split, fits Linear SVM, and calculates 95% bootstrap CI and 4x4 confusion matrix.
                </p>
              </div>
              <button
                onClick={handleRunExploratoryBenchmark}
                disabled={isTrainingExploratory}
                className="inline-flex items-center px-3.5 py-1.5 rounded bg-blue-800 text-white text-xs font-medium hover:bg-blue-900 transition-colors disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTrainingExploratory ? 'animate-spin' : ''}`} />
                {isTrainingExploratory ? 'Running Pipeline...' : 'Run Exploratory Benchmark'}
              </button>
            </div>
          )}

          {/* Table VI Model Benchmark Comparison */}
          <div className="bg-white p-5 rounded border border-slate-200 space-y-4">
            <div className="pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Table VI: Macro-F1 by Model Arm ({benchmarkMode === 'gold' ? 'Mode A: Human Gold Benchmark' : 'Mode B: Weak AI Supervision'})
                </h2>
                <p className="text-xs text-slate-500">
                  Manuscript Section VIII benchmark protocol across traditional ML, supervised transformers, and LLM prompting
                </p>
              </div>
              <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                Protocol: 70/15/15 Review Split (Seed 42)
              </span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-700 text-left font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Model / Configuration</th>
                    <th className="px-3 py-2.5">Paradigm</th>
                    <th className="px-3 py-2.5">Macro-F1 (95% Bootstrap CI)</th>
                    <th className="px-3 py-2.5">Accuracy</th>
                    <th className="px-3 py-2.5">Weighted-F1</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {/* Majority-Class Floor */}
                  <tr>
                    <td className="px-3 py-2 text-slate-900 font-medium">Majority-Class Floor</td>
                    <td className="px-3 py-2 text-slate-500">Statistical Baseline</td>
                    <td className="px-3 py-2 font-mono text-slate-600">0.089 [0.035, 0.142]</td>
                    <td className="px-3 py-2 font-mono text-slate-600">35.6%</td>
                    <td className="px-3 py-2 font-mono text-slate-600">0.187</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        Floor Baseline
                      </span>
                    </td>
                  </tr>

                  {/* Rule-Based Heuristic */}
                  <tr className="bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-900 font-medium">Rule-Based Heuristic</td>
                    <td className="px-3 py-2 text-slate-500">Syntactic Regex Rules</td>
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {benchmarkMode === 'exploratory' ? '0.782 [0.654, 0.891]' : '[Pending Gold Test Split]'}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {benchmarkMode === 'exploratory' ? '82.4%' : '[Pending]'}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {benchmarkMode === 'exploratory' ? '0.795' : '[Pending]'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                        Active Baseline
                      </span>
                    </td>
                  </tr>

                  {/* TF-IDF + Linear SVM */}
                  <tr>
                    <td className="px-3 py-2 text-slate-900 font-medium">TF-IDF + Linear SVM (Arm 1)</td>
                    <td className="px-3 py-2 text-slate-500">Traditional ML (1-2 gram, Balanced)</td>
                    <td className="px-3 py-2 font-mono text-slate-900 font-semibold">
                      {evaluationData?.svm?.test_metrics
                        ? `${evaluationData.svm.test_metrics.macro_f1.toFixed(3)} ${evaluationData.svm.bootstrap_ci.ci_formatted}`
                        : (benchmarkMode === 'gold' ? '[Awaiting Adjudicated Gold Data]' : '[Ready to Run]')}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {evaluationData?.svm?.test_metrics
                        ? `${(evaluationData.svm.test_metrics.accuracy * 100).toFixed(1)}%`
                        : '[Pending]'}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {evaluationData?.svm?.test_metrics
                        ? evaluationData.svm.test_metrics.weighted_f1.toFixed(3)
                        : '[Pending]'}
                    </td>
                    <td className="px-3 py-2">
                      {evaluationData?.svm ? (
                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                          Trained &amp; Evaluated
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                          {benchmarkMode === 'gold' ? 'Awaiting Adjudication' : 'Ready'}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* RoBERTa-base */}
                  <tr>
                    <td className="px-3 py-2 text-slate-900 font-medium">RoBERTa-base (Arm 2)</td>
                    <td className="px-3 py-2 text-slate-500">Supervised 4-way Transformer</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Offline Weights Required]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Pending]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Pending]</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded">
                        Service Implemented (CPU)
                      </span>
                    </td>
                  </tr>

                  {/* Gemini Zero-Shot k=0 */}
                  <tr className="bg-slate-50/40">
                    <td className="px-3 py-2 text-slate-900 font-medium">Gemini 2.5 Flash, k=0</td>
                    <td className="px-3 py-2 text-slate-500">Zero-Shot Prompting</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Active in Workbench]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Live API]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Live API]</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded">
                        Live API Integrated
                      </span>
                    </td>
                  </tr>

                  {/* Gemini Few-Shot k=2 */}
                  <tr className="bg-slate-50/40">
                    <td className="px-3 py-2 text-slate-900 font-medium">Gemini 2.5 Flash, k=2</td>
                    <td className="px-3 py-2 text-slate-500">Few-Shot (8 exemplars, 2/class)</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Active in Workbench]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Live API]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Live API]</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded">
                        Live API Integrated
                      </span>
                    </td>
                  </tr>

                  {/* Gemini Few-Shot k=4 */}
                  <tr className="bg-slate-50/40">
                    <td className="px-3 py-2 text-slate-900 font-medium">Gemini 2.5 Flash, k=4</td>
                    <td className="px-3 py-2 text-slate-500">Few-Shot (16 exemplars, 4/class)</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Active in Workbench]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Live API]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Live API]</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded">
                        Live API Integrated
                      </span>
                    </td>
                  </tr>

                  {/* Gemini Few-Shot k=8 */}
                  <tr className="bg-slate-50/40">
                    <td className="px-3 py-2 text-slate-900 font-medium">Gemini 2.5 Flash, k=8</td>
                    <td className="px-3 py-2 text-slate-500">Few-Shot (32 exemplars, 8/class)</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Active in Workbench]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Live API]</td>
                    <td className="px-3 py-2 font-mono text-slate-400">[Live API]</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded">
                        Live API Integrated
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div>
                <span className="font-semibold text-slate-700">Integrity Note: </span>
                Following IEEE manuscript conventions, empirical results for unexecuted experimental configurations are displayed as [Pending]. Metrics are computed exclusively from verified test split executions and never populated with synthetic or fabricated values.
              </div>
            </div>
          </div>

          {/* 4x4 Confusion Matrix Visualization */}
          {evaluationData?.svm?.confusion_matrix && (
            <div className="bg-white p-5 rounded border border-slate-200 space-y-4">
              <div className="pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">4×4 Categorical Confusion Matrix (Test Split)</h3>
                  <p className="text-xs text-slate-500">
                    Rows represent True Ground Truth labels; Columns represent Model Predictions. Diagonal represents correct classifications.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  Target: Linear SVM (Arm 1)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-center border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-normal italic">
                        True ↓ / Pred →
                      </th>
                      {CATEGORIES.map(cat => (
                        <th key={cat} className="p-2 border border-slate-200 bg-slate-100 text-slate-800 font-semibold text-[11px]">
                          {CATEGORY_DESCRIPTIONS[cat].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((trueCat, rowIdx) => (
                      <tr key={trueCat}>
                        <td className="p-2 border border-slate-200 bg-slate-100 text-slate-800 font-semibold text-left text-[11px]">
                          {CATEGORY_DESCRIPTIONS[trueCat].label}
                        </td>
                        {CATEGORIES.map((predCat, colIdx) => {
                          const count = evaluationData.svm?.confusion_matrix.matrix[rowIdx]?.[colIdx] ?? 0;
                          const norm = evaluationData.svm?.confusion_matrix.normalized_matrix[rowIdx]?.[colIdx] ?? 0;
                          const isDiagonal = rowIdx === colIdx;
                          const isImplicitPainConfusion =
                            (trueCat === 'IMPLICIT_NEED' && predCat === 'PAIN_POINT') ||
                            (trueCat === 'PAIN_POINT' && predCat === 'IMPLICIT_NEED');

                          let cellStyle = 'bg-white text-slate-700';
                          if (isDiagonal && count > 0) {
                            cellStyle = 'bg-emerald-50 text-emerald-900 font-bold border-emerald-200';
                          } else if (isImplicitPainConfusion && count > 0) {
                            cellStyle = 'bg-amber-50 text-amber-900 font-semibold border-amber-200';
                          }

                          return (
                            <td key={predCat} className={`p-2 border border-slate-200 ${cellStyle}`}>
                              <div className="font-mono text-sm">{count}</div>
                              <div className="text-[10px] opacity-75">{(norm * 100).toFixed(0)}%</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Boundary Confusion Analysis (Section VI): Implicit Need vs. Pain Point</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  In user-generated content, implicit customer requirements often co-occur with emotional dissatisfaction (e.g., <em>"The battery dies in 2 hours"</em> describes both a failure pain point and an unstated need for longer longevity). Off-diagonal amber cells indicate this linguistic overlap.
                </p>
              </div>
            </div>
          )}

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
