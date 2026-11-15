import React, { useState } from 'react';
import { FeedbackRecord, RequirementCategory, SentimentCategory } from '../types';
import { classifyFeedback, CATEGORY_DESCRIPTIONS } from '../utils/classifier';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import { classifyWithGemini, batchClassifyWithGemini } from '../services/geminiApi';
import { ExportModal } from './ExportModal';
import {
  Search,
  CheckCircle,
  Play,
  Sparkles,
  Download,
  Info,
  Check,
  Cpu,
  Bot,
  AlertTriangle,
  RotateCcw,
  Layers,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface FeedbackAnalysisSectionProps {
  records: FeedbackRecord[];
  onUpdateRecord: (updatedRecord: FeedbackRecord) => void;
  onBatchClassifyAll: () => void;
  sourceName?: string;
}

const SENTIMENT_BADGES: Record<SentimentCategory, { label: string; badgeClass: string }> = {
  POSITIVE: { label: 'Positive', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NEGATIVE: { label: 'Negative', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  NEUTRAL: { label: 'Neutral', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  MIXED: { label: 'Mixed', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' }
};

export const FeedbackAnalysisSection: React.FC<FeedbackAnalysisSectionProps> = ({
  records,
  onUpdateRecord,
  onBatchClassifyAll,
  sourceName = 'dataset'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    records.length > 0 ? records[0].id : null
  );

  // Gemini state for selected record
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [selectedK, setSelectedK] = useState<0 | 2 | 4 | 8>(0);

  // Modal and toast state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Custom sentence tester state
  const [customText, setCustomText] = useState('');
  const [customHeuristicResult, setCustomHeuristicResult] = useState<ReturnType<typeof classifyFeedback> | null>(null);
  const [customGeminiResult, setCustomGeminiResult] = useState<import('../types').GeminiClassificationResult | null>(null);
  const [isCustomGeminiLoading, setIsCustomGeminiLoading] = useState(false);
  const [customGeminiError, setCustomGeminiError] = useState<string | null>(null);

  // Gemini Batch Classification Modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    active: boolean;
    processed: number;
    total: number;
    cancelled: boolean;
    statusText: string;
  }>({
    active: false,
    processed: 0,
    total: 0,
    cancelled: false,
    statusText: ''
  });

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected record
  const selectedRecord = records.find(r => r.id === selectedRecordId) || records[0];

  // Filtering
  const filteredRecords = records.filter(record => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      record.text.toLowerCase().includes(term) ||
      record.id.toLowerCase().includes(term) ||
      (record.domain && record.domain.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'UNCLASSIFIED') return !record.predictedCategory && !record.geminiResult;
    if (categoryFilter === 'GEMINI_CLASSIFIED') return !!record.geminiResult;
    return record.predictedCategory === categoryFilter || record.geminiResult?.requirement_category === categoryFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handler to analyze single record with Rule-Based Baseline
  const handleAnalyzeRecordHeuristic = (record: FeedbackRecord) => {
    const result = classifyFeedback(record.text);
    const updated: FeedbackRecord = {
      ...record,
      predictedCategory: result.category,
      explanation: result.explanation,
      matchedCues: result.matchedCues
    };
    onUpdateRecord(updated);
  };

  // Handler to analyze single record with Gemini AI
  const handleAnalyzeRecordGemini = async (record: FeedbackRecord) => {
    setIsGeminiLoading(true);
    setGeminiError(null);

    const res = await classifyWithGemini(record.text, { k: selectedK });
    setIsGeminiLoading(false);

    if (res.success && res.result) {
      const updated: FeedbackRecord = {
        ...record,
        geminiResult: res.result
      };
      onUpdateRecord(updated);
    } else {
      setGeminiError(res.error || 'Gemini inference failed. Check server status.');
    }
  };

  // Handler for custom interactive sentence testing
  const handleTestCustomSentenceBoth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customText.trim()) return;

    // 1. Run Baseline Heuristic
    const hRes = classifyFeedback(customText);
    setCustomHeuristicResult(hRes);

    // 2. Run Gemini AI
    setIsCustomGeminiLoading(true);
    setCustomGeminiError(null);
    const gRes = await classifyWithGemini(customText, { k: selectedK });
    setIsCustomGeminiLoading(false);

    if (gRes.success && gRes.result) {
      setCustomGeminiResult(gRes.result);
    } else {
      setCustomGeminiError(gRes.error || 'Gemini classification failed');
    }
  };

  // Handler for Gemini Batch Classification
  const handleStartGeminiBatch = async () => {
    const unclassified = records.filter(r => !r.geminiResult);
    const targetItems = unclassified.length > 0 ? unclassified : records;

    if (targetItems.length === 0) return;

    setBatchProgress({
      active: true,
      processed: 0,
      total: targetItems.length,
      cancelled: false,
      statusText: `Starting batch inference for ${targetItems.length} records...`
    });

    let isCancelled = false;

    const itemsPayload = targetItems.map(r => ({ id: r.id, text: r.text }));

    await batchClassifyWithGemini(
      itemsPayload,
      { k: selectedK, concurrency: 3 },
      (processed, total, latest) => {
        setBatchProgress(prev => ({
          ...prev,
          processed,
          statusText: `Processed ${processed} / ${total} records...`
        }));

        if (latest && latest.result) {
          const rec = records.find(r => r.id === latest.id);
          if (rec) {
            onUpdateRecord({
              ...rec,
              geminiResult: latest.result
            });
          }
        }
      },
      () => isCancelled
    );

    setBatchProgress(prev => ({
      ...prev,
      active: false,
      statusText: `Batch classification complete.`
    }));
  };

  const handleCancelBatch = () => {
    setBatchProgress(prev => ({
      ...prev,
      cancelled: true,
      active: false,
      statusText: 'Batch classification cancelled by user.'
    }));
  };

  // Quick export all records
  const handleQuickExportCSV = () => {
    if (records.length === 0) return;
    try {
      const res = exportAnalyzedRecordsToCSV(records, {
        fileName: `customer_requirement_analysis_all_${Date.now()}.csv`,
        includeMetadataColumns: true
      });
      setExportNotice(`Exported ${res.count} records to ${res.filename} successfully.`);
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Export error: ${msg}`);
    }
  };

  if (records.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center my-8">
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Records Available to Analyze</h3>
        <p className="text-sm text-slate-500 mb-4">
          Please navigate to the Dataset Switcher tab and load the SemEval dataset.
        </p>
      </div>
    );
  }

  const geminiCount = records.filter(r => r.geminiResult !== undefined).length;

  return (
    <div className="space-y-6">
      {/* Comparative Methodology Notice */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 text-xs text-blue-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-blue-900">
            Multi-Model Evaluation Framework: Rule-Based Heuristic Baseline vs Gemini AI Classifier
          </div>
          <p className="text-blue-800 leading-relaxed">
            The project offers a direct side-by-side comparison between the transparent{' '}
            <strong>Rule-Based Heuristic Baseline</strong> (syntactic regex rules) and the{' '}
            <strong>Gemini AI Classifier</strong> (official <code>@google/genai</code> SDK with structured JSON output). Both dimensions—sentiment polarity and customer requirement category—are classified independently. Human annotations remain strictly isolated.
          </p>
        </div>
      </div>

      {/* Selected Sentence Inspection & Model Comparison Panel */}
      {selectedRecord && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Selected Record:
              </span>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                {selectedRecord.id}
              </span>
              {selectedRecord.domain && (
                <span className="text-xs font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                  {selectedRecord.domain}
                </span>
              )}
              {selectedRecord.isUserAnnotated && (
                <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-medium">
                  Human Annotated
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Exemplar k selector for Gemini */}
              <div className="flex items-center space-x-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                <span>Few-Shot k:</span>
                <select
                  value={selectedK}
                  onChange={e => setSelectedK(Number(e.target.value) as any)}
                  className="bg-white border border-slate-200 rounded text-xs px-1 py-0.5 text-slate-800"
                >
                  <option value={0}>k=0 (Zero-Shot)</option>
                  <option value={2}>k=2 (Few-Shot)</option>
                  <option value={4}>k=4 (Few-Shot)</option>
                  <option value={8}>k=8 (Few-Shot)</option>
                </select>
              </div>

              {/* Heuristic Run Button */}
              <button
                onClick={() => handleAnalyzeRecordHeuristic(selectedRecord)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
              >
                <Cpu className="w-3.5 h-3.5 mr-1 text-slate-600" />
                {selectedRecord.predictedCategory ? 'Re-Run Heuristic' : 'Run Heuristic'}
              </button>

              {/* Gemini Run Button */}
              <button
                onClick={() => handleAnalyzeRecordGemini(selectedRecord)}
                disabled={isGeminiLoading}
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shadow-2xs transition-colors"
              >
                <Bot className="w-3.5 h-3.5 mr-1" />
                {isGeminiLoading ? 'Calling Gemini...' : (selectedRecord.geminiResult ? 'Re-Classify with Gemini' : 'Classify with Gemini AI')}
              </button>
            </div>
          </div>

          {/* Feedback sentence text */}
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-4">
            <div className="text-xs font-medium text-slate-500 mb-1">Feedback Text:</div>
            <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
              "{selectedRecord.text}"
            </p>

            {/* Original Dataset Metadata if present */}
            {Object.keys(selectedRecord.originalMetadata || {}).length > 0 && (
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">SemEval Benchmark Tags:</span>
                {Object.entries(selectedRecord.originalMetadata).map(([k, v]) => (
                  <span key={k} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                    {k}: <strong className="text-slate-800">{v}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          {geminiError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Gemini Error: </span>
                {geminiError}
                <div className="mt-1 text-slate-600">
                  Tip: Ensure the backend is running with <code>npm run server</code> and <code>GEMINI_API_KEY</code> is set in <code>.env</code>.
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Model Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Card: Rule-Based Heuristic Baseline */}
            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <Cpu className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-xs text-slate-800">Rule-Based Heuristic Baseline</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  Deterministic
                </span>
              </div>

              {selectedRecord.predictedCategory ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">Requirement Category:</div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${
                      CATEGORY_DESCRIPTIONS[selectedRecord.predictedCategory].badgeClass
                    }`}>
                      {CATEGORY_DESCRIPTIONS[selectedRecord.predictedCategory].label}
                    </span>
                  </div>

                  <div className="text-xs">
                    <div className="text-[11px] text-slate-500 mb-1">Linguistic Explanation:</div>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed text-xs">
                      {selectedRecord.explanation}
                    </p>
                  </div>

                  {selectedRecord.matchedCues && selectedRecord.matchedCues.length > 0 && (
                    <div className="text-xs">
                      <div className="text-[11px] text-slate-500 mb-1">Matched Cues:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedRecord.matchedCues.map((cue, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200">
                            {cue}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50/50 rounded border border-dashed border-slate-200">
                  Heuristic baseline has not been run for this sentence. Click "Run Heuristic" above.
                </div>
              )}
            </div>

            {/* Right Card: Gemini AI Classifier */}
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/20 shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-blue-100">
                <div className="flex items-center space-x-1.5">
                  <Bot className="w-4 h-4 text-blue-700" />
                  <span className="font-semibold text-xs text-blue-900">Gemini AI Classifier</span>
                </div>
                {selectedRecord.geminiResult && (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                    {selectedRecord.geminiResult.model} (k={selectedRecord.geminiResult.k})
                  </span>
                )}
              </div>

              {selectedRecord.geminiResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Sentiment Polarity:</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                        SENTIMENT_BADGES[selectedRecord.geminiResult.sentiment]?.badgeClass || 'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedRecord.geminiResult.sentiment}
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Requirement Category:</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                        CATEGORY_DESCRIPTIONS[selectedRecord.geminiResult.requirement_category]?.badgeClass || 'bg-slate-100 text-slate-700'
                      }`}>
                        {CATEGORY_DESCRIPTIONS[selectedRecord.geminiResult.requirement_category]?.label}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <div className="text-[11px] text-slate-500 mb-1">Verbatim Evidence:</div>
                    <div className="bg-white p-2 rounded border border-blue-200 font-mono text-[11px] text-blue-900 italic">
                      "{selectedRecord.geminiResult.evidence}"
                    </div>
                  </div>

                  <div className="text-xs">
                    <div className="text-[11px] text-slate-500 mb-1">Model Explanation:</div>
                    <p className="text-slate-700 bg-white p-2.5 rounded border border-blue-200 leading-relaxed text-xs">
                      {selectedRecord.geminiResult.explanation}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-blue-100 text-[11px] text-slate-500">
                    <span>
                      Reported Confidence: <strong className="font-mono text-slate-800">{selectedRecord.geminiResult.confidence.toFixed(2)}</strong>
                    </span>
                    <span className="italic text-[10px] text-slate-400">Model-reported, uncalibrated</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 bg-white/70 rounded border border-dashed border-blue-200">
                  {isGeminiLoading ? (
                    <div className="flex items-center justify-center space-x-2 text-blue-700">
                      <div className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                      <span>Classifying with Gemini AI...</span>
                    </div>
                  ) : (
                    <span>Gemini AI has not analyzed this sentence yet. Click "Classify with Gemini AI" above.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Custom Feedback Tester */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-100">
          <Sparkles className="w-4 h-4 text-blue-700" />
          <h3 className="text-sm font-semibold text-slate-900">
            Interactive Multi-Model Tester (Try Any Sentence)
          </h3>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Type or paste any customer review to test both the <strong>Rule-Based Heuristic Baseline</strong> and <strong>Gemini AI Classifier</strong> in parallel.
        </p>

        <form onSubmit={handleTestCustomSentenceBoth} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g., Please add dark mode support, or: I have to carry two chargers because the battery doesn't last"
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customText.trim() || isCustomGeminiLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shrink-0 shadow-2xs transition-colors flex items-center justify-center space-x-1"
            >
              {isCustomGeminiLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 mr-1" />
                  <span>Analyze with Both Models</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Sample phrases:</span>
            <button
              type="button"
              onClick={() => {
                const text = "Please add an option to export reports as PDF.";
                setCustomText(text);
                setCustomHeuristicResult(classifyFeedback(text));
              }}
              className="text-blue-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-xs"
            >
              "Please add export to PDF..." (Explicit)
            </button>
            <button
              type="button"
              onClick={() => {
                const text = "The screen is blindingly bright in the dark with no way to dim it.";
                setCustomText(text);
                setCustomHeuristicResult(classifyFeedback(text));
              }}
              className="text-emerald-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-xs"
            >
              "Screen is blindingly bright..." (Implicit)
            </button>
            <button
              type="button"
              onClick={() => {
                const text = "The application crashes continuously on the checkout screen.";
                setCustomText(text);
                setCustomHeuristicResult(classifyFeedback(text));
              }}
              className="text-amber-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-xs"
            >
              "App crashes continuously..." (Pain Point)
            </button>
            <button
              type="button"
              onClick={() => {
                const text = "Great service and fast delivery, five stars!";
                setCustomText(text);
                setCustomHeuristicResult(classifyFeedback(text));
              }}
              className="text-slate-600 hover:underline bg-slate-100 px-2 py-0.5 rounded text-xs"
            >
              "Great service, five stars" (Non-Actionable)
            </button>
          </div>
        </form>

        {customGeminiError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
            {customGeminiError}
          </div>
        )}

        {/* Custom Test Comparison Result Display */}
        {(customHeuristicResult || customGeminiResult) && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Heuristic Output */}
            {customHeuristicResult && (
              <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800 flex items-center">
                    <Cpu className="w-3.5 h-3.5 mr-1 text-slate-600" /> Baseline Heuristic
                  </span>
                  <span className={`px-2 py-0.5 rounded font-semibold border ${
                    CATEGORY_DESCRIPTIONS[customHeuristicResult.category].badgeClass
                  }`}>
                    {CATEGORY_DESCRIPTIONS[customHeuristicResult.category].label}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px] mb-2">
                  {customHeuristicResult.explanation}
                </p>
                {customHeuristicResult.matchedCues.length > 0 && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Cues: {customHeuristicResult.matchedCues.join('; ')}
                  </div>
                )}
              </div>
            )}

            {/* Gemini Output */}
            {customGeminiResult && (
              <div className="bg-blue-50/30 p-3.5 rounded border border-blue-200 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-blue-900 flex items-center">
                    <Bot className="w-3.5 h-3.5 mr-1 text-blue-700" /> Gemini AI Output
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                      SENTIMENT_BADGES[customGeminiResult.sentiment as SentimentCategory]?.badgeClass || 'bg-slate-100 text-slate-700'
                    }`}>
                      {customGeminiResult.sentiment}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-semibold border ${
                      CATEGORY_DESCRIPTIONS[customGeminiResult.requirement_category as RequirementCategory]?.badgeClass || 'bg-slate-100 text-slate-700'
                    }`}>
                      {CATEGORY_DESCRIPTIONS[customGeminiResult.requirement_category as RequirementCategory]?.label || customGeminiResult.requirement_category}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-blue-950 font-mono italic mb-1.5">
                  Evidence: "{customGeminiResult.evidence}"
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px] mb-2">
                  {customGeminiResult.explanation}
                </p>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-blue-100">
                  <span>Confidence: <strong className="font-mono">{customGeminiResult.confidence}</strong></span>
                  <span>Model: {customGeminiResult.model}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dataset Records Table & Batch Controls */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Loaded Dataset Sentences ({filteredRecords.length.toLocaleString()})
            </h3>
            <span className="text-xs text-slate-500">
              ({geminiCount} classified with Gemini)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search feedback..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none w-44 sm:w-56"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 bg-white"
            >
              <option value="ALL">All Categories</option>
              <option value="EXPLICIT_NEED">Explicit Need</option>
              <option value="IMPLICIT_NEED">Implicit Need</option>
              <option value="PAIN_POINT">Pain Point</option>
              <option value="NON_ACTIONABLE">Non-Actionable</option>
              <option value="GEMINI_CLASSIFIED">Gemini Analyzed Only</option>
              <option value="UNCLASSIFIED">Unclassified</option>
            </select>

            {/* Batch Run Heuristic */}
            <button
              onClick={onBatchClassifyAll}
              className="inline-flex items-center px-2.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
              title="Run baseline regex on all records"
            >
              <Cpu className="w-3 h-3 mr-1" />
              Batch Heuristic
            </button>

            {/* Batch Run Gemini */}
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-2xs transition-colors"
              title="Run Gemini AI on records"
            >
              <Bot className="w-3.5 h-3.5 mr-1" />
              Batch Gemini AI
            </button>

            {/* Quick Export */}
            <button
              onClick={handleQuickExportCSV}
              className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
              title="Quick Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table of Records */}
        <div className="overflow-x-auto text-xs">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Feedback Sentence</th>
                <th className="px-3 py-2 text-left">Heuristic Baseline</th>
                <th className="px-3 py-2 text-left">Gemini AI Category</th>
                <th className="px-3 py-2 text-left">Gemini Sentiment</th>
                <th className="px-3 py-2 text-center">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRecords.map(rec => {
                const isSelected = rec.id === selectedRecordId;
                const hCat = rec.predictedCategory;
                const gRes = rec.geminiResult;

                return (
                  <tr
                    key={rec.id}
                    onClick={() => setSelectedRecordId(rec.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono font-medium text-slate-900 whitespace-nowrap">{rec.id}</td>
                    <td className="px-3 py-2 max-w-sm truncate" title={rec.text}>"{rec.text}"</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {hCat ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${CATEGORY_DESCRIPTIONS[hCat].badgeClass}`}>
                          {CATEGORY_DESCRIPTIONS[hCat].label}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not run</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {gRes ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${CATEGORY_DESCRIPTIONS[gRes.requirement_category].badgeClass}`}>
                          {CATEGORY_DESCRIPTIONS[gRes.requirement_category].label}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {gRes ? (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${SENTIMENT_BADGES[gRes.sentiment]?.badgeClass}`}>
                          {gRes.sentiment}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-600 whitespace-nowrap">
                      {gRes ? `${(gRes.confidence * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-2 border-t border-slate-100 gap-2 text-xs text-slate-500">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length.toLocaleString()} entries
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Gemini Batch Classification Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-semibold text-slate-900">
                  Gemini AI Batch Classification
                </h3>
              </div>
              {!batchProgress.active && (
                <button
                  onClick={() => setIsBatchModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Run Gemini AI to classify sentiment and requirement categories across loaded records. Concurrency is throttled to prevent API rate-limit starvation.
            </p>

            <div className="space-y-2 text-xs bg-slate-50 p-3 rounded border border-slate-200">
              <div className="flex justify-between">
                <span>Active Dataset:</span>
                <strong className="text-slate-800">{sourceName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Dataset Rows:</span>
                <strong className="font-mono text-slate-800">{records.length.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>Currently Classified by Gemini:</span>
                <strong className="font-mono text-blue-700">{geminiCount.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span>Few-Shot Configuration:</span>
                <select
                  value={selectedK}
                  onChange={e => setSelectedK(Number(e.target.value) as any)}
                  disabled={batchProgress.active}
                  className="bg-white border border-slate-200 rounded text-xs px-2 py-1 font-mono"
                >
                  <option value={0}>k=0 (Zero-Shot)</option>
                  <option value={2}>k=2 (Few-Shot)</option>
                  <option value={4}>k=4 (Few-Shot)</option>
                  <option value={8}>k=8 (Few-Shot)</option>
                </select>
              </div>
            </div>

            {batchProgress.active && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{batchProgress.statusText}</span>
                  <span className="font-mono font-semibold">
                    {Math.round((batchProgress.processed / Math.max(1, batchProgress.total)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-700 h-full transition-all duration-300"
                    style={{
                      width: `${(batchProgress.processed / Math.max(1, batchProgress.total)) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {batchProgress.statusText && !batchProgress.active && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                {batchProgress.statusText}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              {batchProgress.active ? (
                <button
                  onClick={handleCancelBatch}
                  className="px-4 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                >
                  Cancel Batch Run
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleStartGeminiBatch}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-2xs transition-colors"
                  >
                    Start Batch Inference
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Notice Toast */}
      {exportNotice && (
        <div className="fixed bottom-4 right-4 z-50 p-3 bg-emerald-700 text-white rounded-lg shadow-lg text-xs flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Full Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={records}
        sourceName={sourceName}
      />
    </div>
  );
};
