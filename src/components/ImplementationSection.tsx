import React, { useState, useRef } from 'react';
import { FeedbackRecord, RequirementCategory, SentimentCategory } from '../types';
import { classifyFeedback, CATEGORY_DESCRIPTIONS } from '../utils/classifier';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import { classifyWithGemini, batchClassifyWithGemini } from '../services/geminiApi';
import { parseFile } from '../utils/fileParser';
import { ExportModal } from './ExportModal';
import {
  Search,
  Play,
  Download,
  Cpu,
  Bot,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  FileSpreadsheet,
  Check,
  Sparkles
} from 'lucide-react';

interface ImplementationSectionProps {
  records: FeedbackRecord[];
  onUpdateRecord: (updatedRecord: FeedbackRecord) => void;
  onBatchClassifyAll: () => void;
  sourceName: string;
  onSelectPresetDataset: (preset: 'curated' | 'full') => void;
  onCustomFileLoaded: (
    records: FeedbackRecord[],
    allColumns: string[],
    detectedTextColumn: string,
    metadataColumns: string[],
    sourceName: string,
    uniqueReviews?: number,
    uniqueSentences?: number
  ) => void;
}

const SENTIMENT_BADGES: Record<SentimentCategory, { label: string; badgeClass: string }> = {
  POSITIVE: { label: 'Positive', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  NEGATIVE: { label: 'Negative', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  NEUTRAL: { label: 'Neutral', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  MIXED: { label: 'Mixed', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200' }
};

export const ImplementationSection: React.FC<ImplementationSectionProps> = ({
  records,
  onUpdateRecord,
  onBatchClassifyAll,
  sourceName,
  onSelectPresetDataset,
  onCustomFileLoaded
}) => {
  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    records.length > 0 ? records[0].id : null
  );

  // Gemini state for selected record
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [selectedK, setSelectedK] = useState<0 | 2 | 4 | 8>(0);

  // Inline custom sentence tester toggle
  const [showCustomTester, setShowCustomTester] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customHeuristicResult, setCustomHeuristicResult] = useState<ReturnType<typeof classifyFeedback> | null>(null);
  const [customGeminiResult, setCustomGeminiResult] = useState<import('../types').GeminiClassificationResult | null>(null);
  const [isCustomGeminiLoading, setIsCustomGeminiLoading] = useState(false);
  const [customGeminiError, setCustomGeminiError] = useState<string | null>(null);

  // Batch Classification Modal state
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

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const currentFilteredIndex = filteredRecords.findIndex(r => r.id === (selectedRecord?.id || ''));

  const handlePrevRecord = () => {
    if (currentFilteredIndex > 0) {
      setSelectedRecordId(filteredRecords[currentFilteredIndex - 1].id);
    }
  };

  const handleNextRecord = () => {
    if (currentFilteredIndex >= 0 && currentFilteredIndex < filteredRecords.length - 1) {
      setSelectedRecordId(filteredRecords[currentFilteredIndex + 1].id);
    }
  };

  // Run Rule-Based Heuristic
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

  // Run Gemini AI Classifier
  const handleAnalyzeRecordGemini = async (record: FeedbackRecord) => {
    setIsGeminiLoading(true);
    setGeminiError(null);

    try {
      const res = await classifyWithGemini(record.text, { k: selectedK });
      if (res.success && res.result) {
        const updated: FeedbackRecord = {
          ...record,
          geminiResult: res.result
        };
        onUpdateRecord(updated);
      } else {
        setGeminiError(res.error || 'Gemini classification failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeminiError(msg);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  // Evaluate Custom Sentence
  const handleEvaluateCustomSentence = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customText.trim()) return;

    // Run Heuristic
    const hRes = classifyFeedback(customText);
    setCustomHeuristicResult(hRes);

    // Run Gemini
    setIsCustomGeminiLoading(true);
    setCustomGeminiError(null);
    try {
      const res = await classifyWithGemini(customText, { k: selectedK });
      if (res.success && res.result) {
        setCustomGeminiResult(res.result);
      } else {
        setCustomGeminiError(res.error || 'Gemini classification failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCustomGeminiError(msg);
    } finally {
      setIsCustomGeminiLoading(false);
    }
  };

  // Custom File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parseResult = await parseFile(file);
      if (parseResult.records.length > 0) {
        onCustomFileLoaded(
          parseResult.records,
          parseResult.allColumns,
          parseResult.detectedTextColumn,
          parseResult.metadataColumns,
          file.name,
          parseResult.uniqueReviewsCount,
          parseResult.uniqueSentencesCount
        );
        setCurrentPage(1);
      }
    } catch (err) {
      console.warn('File upload failed:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Batch Gemini classification
  const handleStartBatchGemini = async () => {
    setBatchProgress({
      active: true,
      processed: 0,
      total: records.length,
      cancelled: false,
      statusText: 'Processing records via Gemini API...'
    });

    let isCancelled = false;
    const items = records.map(r => ({ id: r.id, text: r.text }));

    await batchClassifyWithGemini(
      items,
      { k: selectedK, concurrency: 2 },
      (processed, total, latest) => {
        setBatchProgress(prev => ({
          ...prev,
          processed,
          statusText: `Processed ${processed} / ${total} items...`
        }));

        if (latest && latest.result) {
          const target = records.find(r => r.id === latest.id);
          if (target) {
            onUpdateRecord({
              ...target,
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
      statusText: 'Batch classification complete.'
    }));
  };

  const handleCancelBatch = () => {
    setBatchProgress(prev => ({
      ...prev,
      cancelled: true,
      active: false,
      statusText: 'Batch classification stopped.'
    }));
  };

  const handleQuickExportCSV = () => {
    if (records.length === 0) return;
    try {
      const res = exportAnalyzedRecordsToCSV(records, {
        fileName: `customer_requirements_${Date.now()}.csv`,
        includeMetadataColumns: true
      });
      setExportNotice(`Exported ${res.count} records to ${res.filename}`);
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Export error: ${msg}`);
    }
  };

  const isFullDataset = sourceName.includes('full') || records.length > 500;
  const geminiCount = records.filter(r => r.geminiResult !== undefined).length;
  const heuristicCount = records.filter(r => r.predictedCategory !== undefined).length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Dataset Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
            Classification Pipeline
          </h1>
          <p className="text-xs text-slate-500">
            Real-time evaluation of customer feedback using the Rule-Based Baseline and Google Gemini AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dataset Selector Control */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
            <button
              onClick={() => onSelectPresetDataset('curated')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                !isFullDataset
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Curated (45)
            </button>
            <button
              onClick={() => onSelectPresetDataset('full')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                isFullDataset
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full (4,161)
            </button>
            <label
              className="px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Upload custom .csv or .xlsx dataset"
            >
              Upload
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Batch & Export Actions */}
          <button
            onClick={onBatchClassifyAll}
            className="px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
            title="Run rule-based heuristic on all records"
          >
            <Cpu className="w-3 h-3 mr-1 inline text-slate-500" />
            Batch Heuristic
          </button>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded shadow-2xs transition-colors"
            title="Run Gemini AI batch inference"
          >
            <Bot className="w-3 h-3 mr-1 inline" />
            Batch Gemini
          </button>
          <button
            onClick={handleQuickExportCSV}
            className="p-1 border border-slate-200 rounded text-slate-600 bg-white hover:bg-slate-50"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-2.5 bg-slate-100 border border-slate-300 rounded text-xs text-slate-800">
          {exportNotice}
        </div>
      )}

      {/* 2. Central Focus Workspace */}
      {selectedRecord && (
        <div className="bg-white rounded border border-slate-200 p-5 space-y-4">
          {/* Record Selector / Stepper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-500">Record:</span>
              <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {selectedRecord.id}
              </span>
              {selectedRecord.domain && (
                <span className="text-[11px] font-medium uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {selectedRecord.domain}
                </span>
              )}
              {selectedRecord.isUserAnnotated && (
                <span className="text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                  Human Annotated
                </span>
              )}
            </div>

            {/* Stepper & Execution Controls */}
            <div className="flex items-center space-x-2">
              {/* Previous / Next Stepper */}
              <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
                <button
                  onClick={handlePrevRecord}
                  disabled={currentFilteredIndex <= 0}
                  className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  title="Previous sentence"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-500 font-mono px-1">
                  {currentFilteredIndex + 1} / {filteredRecords.length}
                </span>
                <button
                  onClick={handleNextRecord}
                  disabled={currentFilteredIndex >= filteredRecords.length - 1}
                  className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  title="Next sentence"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Few-Shot k Selector */}
              <div className="flex items-center space-x-1 text-xs text-slate-600">
                <span className="text-[11px] text-slate-500">Shots:</span>
                <select
                  value={selectedK}
                  onChange={e => setSelectedK(Number(e.target.value) as any)}
                  className="bg-white border border-slate-200 rounded text-xs px-1.5 py-0.5 text-slate-800"
                >
                  <option value={0}>k=0 (Zero-shot)</option>
                  <option value={2}>k=2 (Boundary Contrast)</option>
                  <option value={4}>k=4 (Balanced 1-per-class)</option>
                  <option value={8}>k=8 (Balanced 2-per-class)</option>
                </select>
              </div>

              {/* Run Heuristic Button */}
              <button
                onClick={() => handleAnalyzeRecordHeuristic(selectedRecord)}
                className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <Cpu className="w-3 h-3 mr-1 inline text-slate-500" />
                Run Heuristic
              </button>

              {/* Classify with Gemini Button */}
              <button
                onClick={() => handleAnalyzeRecordGemini(selectedRecord)}
                disabled={isGeminiLoading}
                className="px-3 py-1 text-xs font-medium rounded text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
              >
                <Bot className="w-3 h-3 mr-1 inline" />
                {isGeminiLoading ? 'Calling Gemini...' : 'Classify with Gemini'}
              </button>

              {/* Toggle Custom Sentence Tester */}
              <button
                onClick={() => setShowCustomTester(!showCustomTester)}
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                  showCustomTester
                    ? 'bg-slate-200 text-slate-900 border-slate-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {showCustomTester ? 'Hide Tester' : 'Test Custom Sentence'}
              </button>
            </div>
          </div>

          {/* Feedback Text Panel */}
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
              Selected Feedback Text
            </div>
            <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
              "{selectedRecord.text}"
            </p>

            {/* Underlying SemEval Aspect Tags */}
            {Object.keys(selectedRecord.originalMetadata || {}).length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-600">SemEval Annotations:</span>
                {Object.entries(selectedRecord.originalMetadata).map(([k, v]) => (
                  <span key={k} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                    {k}: <strong className="text-slate-900">{v}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          {geminiError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Gemini Error: </span>
                {geminiError}
              </div>
            </div>
          )}

          {/* Side-by-Side Classifier Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Rule-Based Baseline */}
            <div className="p-4 rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-semibold text-xs text-slate-900">Rule-Based Heuristic Baseline</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                  Deterministic
                </span>
              </div>

              {selectedRecord.predictedCategory ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">Requirement Category:</div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                      CATEGORY_DESCRIPTIONS[selectedRecord.predictedCategory].badgeClass
                    }`}>
                      {CATEGORY_DESCRIPTIONS[selectedRecord.predictedCategory].label}
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">Syntactic Rationale:</div>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs leading-relaxed">
                      {selectedRecord.explanation}
                    </p>
                  </div>

                  {selectedRecord.matchedCues && selectedRecord.matchedCues.length > 0 && (
                    <div>
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
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 rounded border border-dashed border-slate-200">
                  Click "Run Heuristic" to classify this sentence.
                </div>
              )}
            </div>

            {/* Right: Gemini AI Classifier */}
            <div className="p-4 rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <Bot className="w-3.5 h-3.5 text-slate-700" />
                  <span className="font-semibold text-xs text-slate-900">Google Gemini AI Model</span>
                </div>
                {selectedRecord.geminiResult && (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
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

                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">Verbatim Evidence:</div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 font-mono text-[11px] text-slate-800 italic">
                      "{selectedRecord.geminiResult.evidence}"
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">Model Explanation:</div>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs leading-relaxed">
                      {selectedRecord.geminiResult.explanation}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>
                      Confidence: <strong className="font-mono text-slate-900">{selectedRecord.geminiResult.confidence.toFixed(2)}</strong>
                    </span>
                    <span className="italic text-[10px] text-slate-400">Model-reported</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 rounded border border-dashed border-slate-200">
                  {isGeminiLoading ? (
                    <div className="flex items-center justify-center space-x-2 text-slate-700">
                      <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                      <span>Classifying with Gemini AI...</span>
                    </div>
                  ) : (
                    <span>Click "Classify with Gemini" to run AI inference.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Compact Custom Sentence Tester (Toggled) */}
      {showCustomTester && (
        <div className="bg-white rounded border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Custom Sentence Tester</h2>
              <p className="text-xs text-slate-500">
                Type or test arbitrary feedback sentences directly against both models.
              </p>
            </div>
            <button
              onClick={() => setShowCustomTester(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleEvaluateCustomSentence} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Type customer feedback (e.g., 'Please add an option to export as PDF')..."
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!customText.trim() || isCustomGeminiLoading}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded transition-colors"
              >
                {isCustomGeminiLoading ? 'Evaluating...' : 'Evaluate Sentence'}
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Sample phrases:</span>
              <button
                type="button"
                onClick={() => {
                  const text = "Please add an option to export reports as PDF.";
                  setCustomText(text);
                  setCustomHeuristicResult(classifyFeedback(text));
                }}
                className="text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-[11px]"
              >
                "Please add export to PDF..." (Explicit Need)
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = "The battery drains within two hours with no way to preserve power.";
                  setCustomText(text);
                  setCustomHeuristicResult(classifyFeedback(text));
                }}
                className="text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-[11px]"
              >
                "Battery drains within 2h..." (Implicit Need)
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = "The application crashes completely whenever I tap upload.";
                  setCustomText(text);
                  setCustomHeuristicResult(classifyFeedback(text));
                }}
                className="text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-[11px]"
              >
                "App crashes completely..." (Pain Point)
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = "Good laptop, five stars for fast delivery.";
                  setCustomText(text);
                  setCustomHeuristicResult(classifyFeedback(text));
                }}
                className="text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-[11px]"
              >
                "Good laptop, 5 stars" (Non-Actionable)
              </button>
            </div>
          </form>

          {customGeminiError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
              {customGeminiError}
            </div>
          )}

          {/* Sandbox Results Display */}
          {(customHeuristicResult || customGeminiResult) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              {customHeuristicResult && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-semibold text-slate-800">Baseline Heuristic</span>
                    <span className={`px-2 py-0.5 rounded font-medium border ${
                      CATEGORY_DESCRIPTIONS[customHeuristicResult.category].badgeClass
                    }`}>
                      {CATEGORY_DESCRIPTIONS[customHeuristicResult.category].label}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {customHeuristicResult.explanation}
                  </p>
                  {customHeuristicResult.matchedCues.length > 0 && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Cues: {customHeuristicResult.matchedCues.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {customGeminiResult && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-semibold text-slate-800">Gemini AI Output</span>
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                        SENTIMENT_BADGES[customGeminiResult.sentiment as SentimentCategory]?.badgeClass || 'bg-slate-100 text-slate-700'
                      }`}>
                        {customGeminiResult.sentiment}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-medium border ${
                        CATEGORY_DESCRIPTIONS[customGeminiResult.requirement_category as RequirementCategory]?.badgeClass || 'bg-slate-100 text-slate-700'
                      }`}>
                        {CATEGORY_DESCRIPTIONS[customGeminiResult.requirement_category as RequirementCategory]?.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono italic text-slate-800">
                    Evidence: "{customGeminiResult.evidence}"
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {customGeminiResult.explanation}
                  </p>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 font-mono">
                    <span>Confidence: {customGeminiResult.confidence}</span>
                    <span>Model: {customGeminiResult.model}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Searchable Dataset Sentences Table */}
      <div className="bg-white rounded border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Dataset Records ({filteredRecords.length.toLocaleString()})
            </h2>
            <span className="text-xs text-slate-500">
              • {heuristicCount} heuristic / {geminiCount} Gemini
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search feedback text..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 focus:outline-none w-48 sm:w-60"
              />
            </div>

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
              <option value="GEMINI_CLASSIFIED">Gemini Evaluated Only</option>
              <option value="UNCLASSIFIED">Unclassified</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto text-xs">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-600 text-left">
              <tr>
                <th className="px-3 py-2 w-16">ID</th>
                <th className="px-3 py-2">Sentence Text</th>
                <th className="px-3 py-2 w-36">Heuristic</th>
                <th className="px-3 py-2 w-36">Gemini Category</th>
                <th className="px-3 py-2 w-28">Sentiment</th>
                <th className="px-3 py-2 w-20 text-center">Confidence</th>
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
                      isSelected ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono font-medium text-slate-900 whitespace-nowrap">{rec.id}</td>
                    <td className="px-3 py-2 max-w-sm truncate" title={rec.text}>"{rec.text}"</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {hCat ? (
                        <span className={`inline-flex px-1.5 py-0.2 rounded text-[11px] font-medium border ${
                          CATEGORY_DESCRIPTIONS[hCat].badgeClass
                        }`}>
                          {CATEGORY_DESCRIPTIONS[hCat].label}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {gRes ? (
                        <span className={`inline-flex px-1.5 py-0.2 rounded text-[11px] font-medium border ${
                          CATEGORY_DESCRIPTIONS[gRes.requirement_category]?.badgeClass || 'bg-slate-100 text-slate-700'
                        }`}>
                          {CATEGORY_DESCRIPTIONS[gRes.requirement_category]?.label || gRes.requirement_category}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {gRes ? (
                        <span className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                          SENTIMENT_BADGES[gRes.sentiment]?.badgeClass || 'bg-slate-100 text-slate-700'
                        }`}>
                          {gRes.sentiment}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600">
                      {gRes ? gRes.confidence.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length.toLocaleString()} records
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Batch Processing Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-slate-200 shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Gemini AI Batch Classification</h3>
              {!batchProgress.active && (
                <button
                  onClick={() => setIsBatchModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Batch processing runs Gemini across loaded records with controlled concurrency and exponential rate-limit backoff.
            </p>

            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Items:</span>
                <span className="font-mono font-medium text-slate-800">{records.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Few-Shot Arm:</span>
                <span className="font-mono font-medium text-slate-800">k={selectedK}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-medium text-slate-800">{batchProgress.statusText || 'Ready to start'}</span>
              </div>
            </div>

            {batchProgress.active && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Progress</span>
                  <span>{batchProgress.processed} / {batchProgress.total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-900 h-full transition-all duration-300"
                    style={{ width: `${(batchProgress.processed / Math.max(1, batchProgress.total)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              {batchProgress.active ? (
                <button
                  onClick={handleCancelBatch}
                  className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200"
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleStartBatchGemini}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded shadow-2xs"
                  >
                    Start Batch
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
