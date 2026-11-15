import React, { useState, useEffect, useRef } from 'react';
import { FeedbackRecord, RequirementCategory, SentimentCategory, MLClassificationResult } from '../types';
import { classifyFeedback, CATEGORY_DESCRIPTIONS } from '../utils/classifier';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import { classifyWithGemini } from '../services/geminiApi';
import {
  fetchMlStatus,
  syncAnnotationsToBackend,
  trainModel,
  classifyAllModels,
  MLStatusResponse
} from '../services/mlApi';
import { parseFile } from '../utils/fileParser';
import { ExportModal } from './ExportModal';
import {
  Search,
  Download,
  Cpu,
  Bot,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserCheck
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

  // Gemini & ML State for selected record
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [isMlLoading, setIsMlLoading] = useState(false);
  const [isComparingAll, setIsComparingAll] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [selectedK, setSelectedK] = useState<0 | 2 | 4 | 8>(0);

  // Backend ML Subsystem Status
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [isTrainingSvm, setIsTrainingSvm] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [trainingNotice, setTrainingNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Inline custom sentence tester toggle
  const [showCustomTester, setShowCustomTester] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customMultiResults, setCustomMultiResults] = useState<{
    heuristic?: ReturnType<typeof classifyFeedback>;
    svm?: MLClassificationResult;
    roberta?: MLClassificationResult;
    gemini?: import('../types').GeminiClassificationResult;
  } | null>(null);
  const [isCustomEvaluating, setIsCustomEvaluating] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

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

  // Refresh ML backend status on mount
  useEffect(() => {
    refreshMlStatus();
  }, []);

  const refreshMlStatus = async () => {
    try {
      const status = await fetchMlStatus();
      setMlStatus(status);
    } catch {
      // Backend not yet reachable or running standalone
    }
  };

  // Sync human annotations to backend
  const handleSyncAnnotations = async () => {
    try {
      setSyncNotice('Syncing annotations to Python ML backend...');
      const res = await syncAnnotationsToBackend(records);
      await refreshMlStatus();
      setSyncNotice(`Successfully synchronized ${res.persisted_records} records to ML service.`);
      setTimeout(() => setSyncNotice(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncNotice(`Sync failed: ${msg}`);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  // Trigger Linear SVM training
  const handleTrainSvm = async () => {
    try {
      setIsTrainingSvm(true);
      setTrainingNotice(null);
      const res = await trainModel('svm');
      await refreshMlStatus();

      if (res.success) {
        setTrainingNotice({
          type: 'success',
          message: res.message || 'Linear SVM successfully trained and artifact saved.'
        });
      } else {
        setTrainingNotice({
          type: 'warning',
          message: res.message || 'Training refused: insufficient adjudicated training records.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTrainingNotice({
        type: 'error',
        message: `Training request failed: ${msg}`
      });
    } finally {
      setIsTrainingSvm(false);
    }
  };

  // Filtering
  const filteredRecords = records.filter(record => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      record.text.toLowerCase().includes(term) ||
      record.id.toLowerCase().includes(term) ||
      (record.domain && record.domain.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'UNCLASSIFIED') return !record.predictedCategory && !record.geminiResult && !record.svmResult;
    if (categoryFilter === 'ADJUDICATED') return !!record.humanAnnotations?.adjudicated;
    if (categoryFilter === 'GEMINI_CLASSIFIED') return !!record.geminiResult;
    if (categoryFilter === 'SVM_CLASSIFIED') return !!record.svmResult;
    return (
      record.predictedCategory === categoryFilter ||
      record.geminiResult?.requirement_category === categoryFilter ||
      record.svmResult?.requirement_category === categoryFilter ||
      record.humanAnnotations?.adjudicated === categoryFilter
    );
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

  // Run Gemini
  const handleAnalyzeRecordGemini = async (record: FeedbackRecord) => {
    setIsGeminiLoading(true);
    setGeminiError(null);

    const start = performance.now();
    const res = await classifyWithGemini(record.text, { k: selectedK });
    const latency = Math.round(performance.now() - start);

    if (res.success && res.result) {
      const updated: FeedbackRecord = {
        ...record,
        geminiResult: {
          ...res.result,
          latencyMs: latency
        }
      };
      onUpdateRecord(updated);
    } else {
      setGeminiError(res.error || 'Gemini inference failed.');
    }

    setIsGeminiLoading(false);
  };

  // Run Linear SVM & RoBERTa via Python ML
  const handleAnalyzeRecordMl = async (record: FeedbackRecord) => {
    setIsMlLoading(true);
    try {
      const res = await classifyAllModels(record.text, selectedK);
      const updated: FeedbackRecord = {
        ...record,
        svmResult: res.results.svm,
        robertaResult: res.results.roberta
      };
      onUpdateRecord(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeminiError(`ML inference error: ${msg}`);
    } finally {
      setIsMlLoading(false);
    }
  };

  // Run ALL 7 Configurations Side-by-Side (Benchmark Mode)
  const handleRunAllConfigurations = async (record: FeedbackRecord) => {
    setIsComparingAll(true);
    setGeminiError(null);

    // 1. Run Heuristic
    const hResult = classifyFeedback(record.text);

    // 2. Run Python ML Arms (SVM + RoBERTa)
    let svmRes: MLClassificationResult | undefined = undefined;
    let robertaRes: MLClassificationResult | undefined = undefined;
    try {
      const mlRes = await classifyAllModels(record.text, selectedK);
      svmRes = mlRes.results.svm;
      robertaRes = mlRes.results.roberta;
    } catch {
      svmRes = {
        requirement_category: 'NON_ACTIONABLE',
        confidence: 0,
        model: 'LinearSVC',
        method: 'Supervised Linear SVM',
        status: 'awaiting_data',
        errorMessage: 'Awaiting sufficient adjudicated training data',
        timestamp: new Date().toISOString()
      };
      robertaRes = {
        requirement_category: 'NON_ACTIONABLE',
        confidence: 0,
        model: 'RoBERTa-base',
        method: 'Fine-Tuned RoBERTa',
        status: 'awaiting_data',
        errorMessage: 'Awaiting sufficient adjudicated training data',
        timestamp: new Date().toISOString()
      };
    }

    // 3. Run Gemini with selected k
    let gResult: import('../types').GeminiClassificationResult | undefined = undefined;
    try {
      const start = performance.now();
      const gemRes = await classifyWithGemini(record.text, { k: selectedK });
      if (gemRes.success && gemRes.result) {
        gResult = {
          ...gemRes.result,
          latencyMs: Math.round(performance.now() - start)
        };
      }
    } catch {
      // Gemini error handled cleanly
    }

    const updated: FeedbackRecord = {
      ...record,
      predictedCategory: hResult.category,
      explanation: hResult.explanation,
      matchedCues: hResult.matchedCues,
      svmResult: svmRes,
      robertaResult: robertaRes,
      geminiResult: gResult
    };

    onUpdateRecord(updated);
    setIsComparingAll(false);
  };

  // Evaluate Custom Sentence Across Models
  const handleEvaluateCustomSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    setIsCustomEvaluating(true);
    setCustomError(null);

    const hResult = classifyFeedback(customText);

    let mlRes: { svm?: MLClassificationResult; roberta?: MLClassificationResult } = {};
    try {
      const res = await classifyAllModels(customText, selectedK);
      mlRes = res.results;
    } catch {
      // ML service standalone fallback
    }

    let gResult: import('../types').GeminiClassificationResult | undefined = undefined;
    try {
      const res = await classifyWithGemini(customText, { k: selectedK });
      if (res.success && res.result) {
        gResult = res.result;
      }
    } catch (err: unknown) {
      setCustomError(err instanceof Error ? err.message : String(err));
    }

    setCustomMultiResults({
      heuristic: hResult,
      svm: mlRes.svm,
      roberta: mlRes.roberta,
      gemini: gResult
    });

    setIsCustomEvaluating(false);
  };

  // Custom File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await parseFile(file);
      if (res.error) {
        alert(`File error: ${res.error}`);
        return;
      }
      onCustomFileLoaded(
        res.records,
        res.allColumns,
        res.detectedTextColumn,
        res.metadataColumns,
        file.name,
        res.uniqueReviewsCount,
        res.uniqueSentencesCount
      );
      setSelectedRecordId(res.records.length > 0 ? res.records[0].id : null);
      setCurrentPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`File parse error: ${msg}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick export
  const handleQuickExportCSV = () => {
    if (records.length === 0) return;
    try {
      const res = exportAnalyzedRecordsToCSV(records, {
        fileName: `customer_requirements_evaluated_${Date.now()}.csv`,
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
  const adjudicatedCount = records.filter(r => !!r.humanAnnotations?.adjudicated).length;
  const heuristicCount = records.filter(r => r.predictedCategory !== undefined).length;
  const geminiCount = records.filter(r => r.geminiResult !== undefined).length;
  const svmCount = records.filter(r => r.svmResult !== undefined).length;

  const minAdjudicatedRequired = mlStatus?.dataset_statistics?.training_eligibility?.min_total_train || 16;
  const isSvmEligible = mlStatus?.dataset_statistics?.training_eligibility?.is_eligible || adjudicatedCount >= minAdjudicatedRequired;
  const isSvmTrained = mlStatus?.svm_arm?.is_trained || false;
  const isRobertaTrained = mlStatus?.roberta_arm?.is_trained || false;

  return (
    <div className="space-y-6">
      {/* 1. Header & Dataset Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
              Model Benchmark & Implementation
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              7 Configurations
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Rule-Based Heuristic Baseline, Formal Arm 1 (Linear SVM), Formal Arm 2 (RoBERTa-base), and Formal Arm 3 (Gemini k=0, 2, 4, 8).
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

          {/* Sync Annotations to ML Backend */}
          <button
            onClick={handleSyncAnnotations}
            className="px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
            title="Synchronize human annotations and review splits to Python ML service"
          >
            <RefreshCw className="w-3 h-3 mr-1 inline text-slate-500" />
            Sync Annotations ({adjudicatedCount})
          </button>

          {/* Batch Actions */}
          <button
            onClick={onBatchClassifyAll}
            className="px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
            title="Run rule-based heuristic on all records"
          >
            <Cpu className="w-3 h-3 mr-1 inline text-slate-500" />
            Batch Heuristic
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

      {syncNotice && (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          <span>{syncNotice}</span>
        </div>
      )}

      {exportNotice && (
        <div className="p-2.5 bg-slate-100 border border-slate-300 rounded text-xs text-slate-800">
          {exportNotice}
        </div>
      )}

      {/* 2. Supervised Training & Data Pipeline Banner */}
      <div className="bg-slate-50 rounded border border-slate-200 p-3.5 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Supervised Arms Status:</span>
            </span>

            {/* Linear SVM Status */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-600">Linear SVM:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                isSvmTrained
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isSvmTrained ? 'Trained (Artifact Active)' : 'Awaiting Adjudicated Data'}
              </span>
            </div>

            {/* RoBERTa-base Status */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-600">RoBERTa-base:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                isRobertaTrained
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isRobertaTrained ? 'Trained (Artifact Active)' : 'Awaiting Adjudicated Data'}
              </span>
            </div>

            {/* Adjudicated Data Progress */}
            <div className="flex items-center space-x-1.5 text-slate-500">
              <span>Adjudicated:</span>
              <span className="font-mono font-semibold text-slate-800">
                {adjudicatedCount} / {minAdjudicatedRequired} min
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTrainSvm}
              disabled={isTrainingSvm}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                isSvmEligible
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
              title={isSvmEligible ? 'Train Linear SVM on adjudicated records' : 'Requires at least 4 adjudicated records per category'}
            >
              {isTrainingSvm ? 'Training...' : 'Train Linear SVM'}
            </button>
          </div>
        </div>

        {trainingNotice && (
          <div className={`mt-2.5 p-2 rounded border text-xs ${
            trainingNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : trainingNotice.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {trainingNotice.message}
          </div>
        )}
      </div>

      {/* 3. Central Focus Workspace */}
      {selectedRecord && (
        <div className="bg-white rounded border border-slate-200 p-5 space-y-4">
          {/* Record Selector / Stepper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-500">Sentence:</span>
              <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {selectedRecord.id}
              </span>
              {selectedRecord.domain && (
                <span className="text-[11px] font-medium uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {selectedRecord.domain}
                </span>
              )}
              {selectedRecord.humanAnnotations?.adjudicated && (
                <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded flex items-center space-x-1">
                  <UserCheck className="w-3 h-3 inline mr-0.5" />
                  <span>Ground Truth: {CATEGORY_DESCRIPTIONS[selectedRecord.humanAnnotations.adjudicated]?.label || selectedRecord.humanAnnotations.adjudicated}</span>
                </span>
              )}
            </div>

            {/* Stepper & Execution Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Stepper */}
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
                <span className="text-[11px] text-slate-500">Gemini:</span>
                <select
                  value={selectedK}
                  onChange={e => setSelectedK(Number(e.target.value) as any)}
                  className="bg-white border border-slate-200 rounded text-xs px-1.5 py-0.5 text-slate-800"
                >
                  <option value={0}>k=0 (Zero-shot)</option>
                  <option value={2}>k=2 (8 exemplars)</option>
                  <option value={4}>k=4 (16 exemplars)</option>
                  <option value={8}>k=8 (32 exemplars)</option>
                </select>
              </div>

              {/* Run Individual Buttons */}
              <button
                onClick={() => handleAnalyzeRecordHeuristic(selectedRecord)}
                className="px-2 py-1 text-xs font-medium rounded border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                title="Run Rule-Based Heuristic"
              >
                <Cpu className="w-3 h-3 mr-1 inline text-slate-500" />
                Heuristic
              </button>

              <button
                onClick={() => handleAnalyzeRecordMl(selectedRecord)}
                disabled={isMlLoading}
                className="px-2 py-1 text-xs font-medium rounded border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                title="Run Linear SVM & RoBERTa via Python ML"
              >
                <Layers className="w-3 h-3 mr-1 inline text-slate-500" />
                SVM / RoBERTa
              </button>

              <button
                onClick={() => handleAnalyzeRecordGemini(selectedRecord)}
                disabled={isGeminiLoading}
                className="px-2.5 py-1 text-xs font-medium rounded text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition-colors"
                title="Run Gemini AI with selected k"
              >
                <Bot className="w-3 h-3 mr-1 inline" />
                Gemini
              </button>

              {/* Run All 7 Configurations */}
              <button
                onClick={() => handleRunAllConfigurations(selectedRecord)}
                disabled={isComparingAll}
                className="px-3 py-1 text-xs font-medium rounded text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
                title="Run all experimental configurations for multi-model comparison"
              >
                <Sparkles className="w-3 h-3 mr-1 inline" />
                {isComparingAll ? 'Evaluating All...' : 'Run All Models'}
              </button>

              {/* Custom Tester Toggle */}
              <button
                onClick={() => setShowCustomTester(!showCustomTester)}
                className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                  showCustomTester
                    ? 'bg-slate-200 text-slate-900 border-slate-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {showCustomTester ? 'Hide Sandbox' : 'Sandbox'}
              </button>
            </div>
          </div>

          {/* Feedback Text Panel */}
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
              Feedback Text
            </div>
            <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
              "{selectedRecord.text}"
            </p>

            {/* Human Annotation Ground Truth Strip */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">Human Annotator Workbench:</span>
                <span className="text-slate-500">Coder A:</span>
                <select
                  value={selectedRecord.humanAnnotations?.annotatorA || ''}
                  onChange={e => {
                    const cat = e.target.value as RequirementCategory;
                    const ha = selectedRecord.humanAnnotations || {};
                    const updated = {
                      ...selectedRecord,
                      isUserAnnotated: true,
                      humanAnnotations: { ...ha, annotatorA: cat || undefined }
                    };
                    onUpdateRecord(updated);
                  }}
                  className="bg-white border border-slate-300 rounded text-[11px] px-1.5 py-0.5"
                >
                  <option value="">Unset</option>
                  <option value="EXPLICIT_NEED">Explicit Need</option>
                  <option value="IMPLICIT_NEED">Implicit Need</option>
                  <option value="PAIN_POINT">Pain Point</option>
                  <option value="NON_ACTIONABLE">Non-Actionable</option>
                </select>

                <span className="text-slate-500 pl-2">Coder B:</span>
                <select
                  value={selectedRecord.humanAnnotations?.annotatorB || ''}
                  onChange={e => {
                    const cat = e.target.value as RequirementCategory;
                    const ha = selectedRecord.humanAnnotations || {};
                    const updated = {
                      ...selectedRecord,
                      isUserAnnotated: true,
                      humanAnnotations: { ...ha, annotatorB: cat || undefined }
                    };
                    onUpdateRecord(updated);
                  }}
                  className="bg-white border border-slate-300 rounded text-[11px] px-1.5 py-0.5"
                >
                  <option value="">Unset</option>
                  <option value="EXPLICIT_NEED">Explicit Need</option>
                  <option value="IMPLICIT_NEED">Implicit Need</option>
                  <option value="PAIN_POINT">Pain Point</option>
                  <option value="NON_ACTIONABLE">Non-Actionable</option>
                </select>

                <span className="text-slate-700 font-semibold pl-2">Adjudicated:</span>
                <select
                  value={selectedRecord.humanAnnotations?.adjudicated || ''}
                  onChange={e => {
                    const cat = e.target.value as RequirementCategory;
                    const ha = selectedRecord.humanAnnotations || {};
                    const updated = {
                      ...selectedRecord,
                      isUserAnnotated: true,
                      humanAnnotations: { ...ha, adjudicated: cat || undefined }
                    };
                    onUpdateRecord(updated);
                  }}
                  className="bg-white border border-purple-300 text-purple-900 font-semibold rounded text-[11px] px-1.5 py-0.5"
                >
                  <option value="">Unadjudicated</option>
                  <option value="EXPLICIT_NEED">Explicit Need</option>
                  <option value="IMPLICIT_NEED">Implicit Need</option>
                  <option value="PAIN_POINT">Pain Point</option>
                  <option value="NON_ACTIONABLE">Non-Actionable</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-400">
                {selectedRecord.humanAnnotations?.adjudicated ? (
                  <span className="text-emerald-700 font-medium flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 inline text-emerald-600 mr-0.5" />
                    <span>Eligible for Supervised Training</span>
                  </span>
                ) : (
                  <span>Pending human adjudication</span>
                )}
              </div>
            </div>
          </div>

          {geminiError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Inference Error: </span>
                {geminiError}
              </div>
            </div>
          )}

          {/* 4. Multi-Model Benchmark Comparison Matrix */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Multi-Model Classification Results
              </h3>
              <span className="text-[11px] text-slate-500">
                Adjudicated Ground Truth:{' '}
                {selectedRecord.humanAnnotations?.adjudicated ? (
                  <strong className="text-purple-700">
                    {selectedRecord.humanAnnotations.adjudicated}
                  </strong>
                ) : (
                  <span className="italic text-slate-400">Not set</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Card 1: Rule-Based Heuristic Baseline */}
              <div className="p-3.5 rounded border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center space-x-1">
                    <Cpu className="w-3.5 h-3.5 text-slate-600" />
                    <span className="font-semibold text-slate-900">Heuristic Baseline</span>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">Regex Rules</span>
                </div>

                {selectedRecord.predictedCategory ? (
                  <div className="space-y-1.5">
                    <div>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${
                        CATEGORY_DESCRIPTIONS[selectedRecord.predictedCategory].badgeClass
                      }`}>
                        {CATEGORY_DESCRIPTIONS[selectedRecord.predictedCategory].label}
                      </span>
                      {selectedRecord.humanAnnotations?.adjudicated && (
                        <div className="mt-1">
                          {selectedRecord.predictedCategory === selectedRecord.humanAnnotations.adjudicated ? (
                            <span className="text-[10px] text-emerald-700 font-medium">✔ Matches Ground Truth</span>
                          ) : (
                            <span className="text-[10px] text-rose-700 font-medium">✖ Disagrees with GT</span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-3 italic">
                      "{selectedRecord.explanation}"
                    </p>
                    {selectedRecord.matchedCues && selectedRecord.matchedCues.length > 0 && (
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        Cues: {selectedRecord.matchedCues.join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 italic text-[11px]">
                    Not evaluated yet.
                  </div>
                )}
              </div>

              {/* Card 2: Formal Arm 1 - TF-IDF + Linear SVM */}
              <div className="p-3.5 rounded border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-900">Linear SVM (Arm 1)</span>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1 py-0.2 rounded">TF-IDF 1-2g</span>
                </div>

                {selectedRecord.svmResult ? (
                  <div className="space-y-1.5">
                    {selectedRecord.svmResult.status === 'awaiting_data' ? (
                      <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                        <strong>Awaiting Data:</strong> Supervised training requires at least 4 adjudicated records per category.
                      </div>
                    ) : selectedRecord.svmResult.status === 'error' ? (
                      <div className="p-2 bg-rose-50 rounded text-rose-800 text-[11px]">
                        {selectedRecord.svmResult.errorMessage}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${
                            CATEGORY_DESCRIPTIONS[selectedRecord.svmResult.requirement_category]?.badgeClass || 'bg-slate-100 text-slate-700'
                          }`}>
                            {CATEGORY_DESCRIPTIONS[selectedRecord.svmResult.requirement_category]?.label || selectedRecord.svmResult.requirement_category}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600">
                            conf: {selectedRecord.svmResult.confidence.toFixed(2)}
                          </span>
                        </div>
                        {selectedRecord.humanAnnotations?.adjudicated && (
                          <div className="mt-1">
                            {selectedRecord.svmResult.requirement_category === selectedRecord.humanAnnotations.adjudicated ? (
                              <span className="text-[10px] text-emerald-700 font-medium">✔ Matches Ground Truth</span>
                            ) : (
                              <span className="text-[10px] text-rose-700 font-medium">✖ Disagrees with GT</span>
                            )}
                          </div>
                        )}
                        {selectedRecord.svmResult.latencyMs !== undefined && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Latency: {selectedRecord.svmResult.latencyMs}ms
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 italic text-[11px]">
                    {isSvmTrained ? 'Click "SVM / RoBERTa" to evaluate' : 'Awaiting training (un-trained)'}
                  </div>
                )}
              </div>

              {/* Card 3: Formal Arm 2 - RoBERTa-base */}
              <div className="p-3.5 rounded border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center space-x-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-semibold text-slate-900">RoBERTa-base (Arm 2)</span>
                  </div>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded">Transformer</span>
                </div>

                {selectedRecord.robertaResult ? (
                  <div className="space-y-1.5">
                    {selectedRecord.robertaResult.status === 'awaiting_data' ? (
                      <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                        <strong>Awaiting Data:</strong> Fine-tuning requires at least 4 adjudicated records per category.
                      </div>
                    ) : selectedRecord.robertaResult.status === 'error' ? (
                      <div className="p-2 bg-rose-50 rounded text-rose-800 text-[11px]">
                        {selectedRecord.robertaResult.errorMessage}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${
                            CATEGORY_DESCRIPTIONS[selectedRecord.robertaResult.requirement_category]?.badgeClass || 'bg-slate-100 text-slate-700'
                          }`}>
                            {CATEGORY_DESCRIPTIONS[selectedRecord.robertaResult.requirement_category]?.label || selectedRecord.robertaResult.requirement_category}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600">
                            conf: {selectedRecord.robertaResult.confidence.toFixed(2)}
                          </span>
                        </div>
                        {selectedRecord.humanAnnotations?.adjudicated && (
                          <div className="mt-1">
                            {selectedRecord.robertaResult.requirement_category === selectedRecord.humanAnnotations.adjudicated ? (
                              <span className="text-[10px] text-emerald-700 font-medium">✔ Matches Ground Truth</span>
                            ) : (
                              <span className="text-[10px] text-rose-700 font-medium">✖ Disagrees with GT</span>
                            )}
                          </div>
                        )}
                        {selectedRecord.robertaResult.latencyMs !== undefined && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Latency: {selectedRecord.robertaResult.latencyMs}ms
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 italic text-[11px]">
                    {isRobertaTrained ? 'Click "SVM / RoBERTa" to evaluate' : 'Awaiting fine-tuning (un-trained)'}
                  </div>
                )}
              </div>

              {/* Card 4: Formal Arm 3 - Gemini AI (k=0, 2, 4, 8) */}
              <div className="p-3.5 rounded border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center space-x-1">
                    <Bot className="w-3.5 h-3.5 text-purple-600" />
                    <span className="font-semibold text-slate-900">Gemini (Arm 3)</span>
                  </div>
                  <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1 py-0.2 rounded">
                    k={selectedRecord.geminiResult?.k !== undefined ? selectedRecord.geminiResult.k : selectedK}
                  </span>
                </div>

                {selectedRecord.geminiResult ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${
                        CATEGORY_DESCRIPTIONS[selectedRecord.geminiResult.requirement_category]?.badgeClass || 'bg-slate-100 text-slate-700'
                      }`}>
                        {CATEGORY_DESCRIPTIONS[selectedRecord.geminiResult.requirement_category]?.label || selectedRecord.geminiResult.requirement_category}
                      </span>
                      <span className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                        SENTIMENT_BADGES[selectedRecord.geminiResult.sentiment]?.badgeClass || 'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedRecord.geminiResult.sentiment}
                      </span>
                    </div>

                    {selectedRecord.humanAnnotations?.adjudicated && (
                      <div className="mt-1">
                        {selectedRecord.geminiResult.requirement_category === selectedRecord.humanAnnotations.adjudicated ? (
                          <span className="text-[10px] text-emerald-700 font-medium">✔ Matches Ground Truth</span>
                        ) : (
                          <span className="text-[10px] text-rose-700 font-medium">✖ Disagrees with GT</span>
                        )}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-600 line-clamp-2 italic">
                      "{selectedRecord.geminiResult.explanation}"
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                      <span>Conf: {selectedRecord.geminiResult.confidence.toFixed(2)}</span>
                      {selectedRecord.geminiResult.latencyMs && <span>{selectedRecord.geminiResult.latencyMs}ms</span>}
                    </div>

                    {selectedRecord.geminiResult.exemplar_status && !selectedRecord.geminiResult.exemplar_status.is_sufficient && (
                      <div className="text-[9px] text-amber-700 bg-amber-50 p-1 rounded font-mono">
                        {selectedRecord.geminiResult.exemplar_status.total_available}/{selectedRecord.geminiResult.exemplar_status.total_requested} exemplars used
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 italic text-[11px]">
                    Click "Gemini" or "Run All Models"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Compact Custom Sentence Tester (Toggled) */}
      {showCustomTester && (
        <div className="bg-white rounded border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Custom Feedback Sandbox</h2>
              <p className="text-xs text-slate-500">
                Type or test arbitrary feedback sentences directly against all available models.
              </p>
            </div>
            <button
              onClick={() => setShowCustomTester(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleEvaluateCustomSentence} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Type customer feedback (e.g., 'Please add an option to adjust screen timeout in BIOS')..."
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!customText.trim() || isCustomEvaluating}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded transition-colors"
              >
                {isCustomEvaluating ? 'Evaluating...' : 'Evaluate Sentence'}
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Sample phrases:</span>
              <button
                type="button"
                onClick={() => setCustomText("Please add an option to export reports as PDF.")}
                className="text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-[11px]"
              >
                "Please add export to PDF..." (Explicit Need)
              </button>
              <button
                type="button"
                onClick={() => setCustomText("The battery drains within two hours with no way to preserve power.")}
                className="text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-[11px]"
              >
                "Battery drains within 2h..." (Implicit Need)
              </button>
              <button
                type="button"
                onClick={() => setCustomText("The application crashes completely whenever I tap upload.")}
                className="text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-[11px]"
              >
                "App crashes completely..." (Pain Point)
              </button>
              <button
                type="button"
                onClick={() => setCustomText("Good laptop, five stars for fast delivery.")}
                className="text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-[11px]"
              >
                "Good laptop, 5 stars" (Non-Actionable)
              </button>
            </div>
          </form>

          {customError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
              {customError}
            </div>
          )}

          {/* Sandbox Results Display */}
          {customMultiResults && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              {/* Heuristic */}
              {customMultiResults.heuristic && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-800">Heuristic</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                      CATEGORY_DESCRIPTIONS[customMultiResults.heuristic.category].badgeClass
                    }`}>
                      {CATEGORY_DESCRIPTIONS[customMultiResults.heuristic.category].label}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {customMultiResults.heuristic.explanation}
                  </p>
                </div>
              )}

              {/* SVM */}
              {customMultiResults.svm && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-800">Linear SVM</span>
                    <span className="text-[10px] font-mono text-slate-500">TF-IDF</span>
                  </div>
                  {customMultiResults.svm.status === 'awaiting_data' ? (
                    <p className="text-amber-800 text-[11px]">Awaiting adjudicated training data.</p>
                  ) : (
                    <div>
                      <span className="font-semibold">{customMultiResults.svm.requirement_category}</span>
                      <div className="text-[10px] text-slate-500 font-mono">conf: {customMultiResults.svm.confidence}</div>
                    </div>
                  )}
                </div>
              )}

              {/* RoBERTa */}
              {customMultiResults.roberta && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-800">RoBERTa-base</span>
                    <span className="text-[10px] font-mono text-slate-500">PyTorch</span>
                  </div>
                  {customMultiResults.roberta.status === 'awaiting_data' ? (
                    <p className="text-amber-800 text-[11px]">Awaiting fine-tuning data.</p>
                  ) : (
                    <div>
                      <span className="font-semibold">{customMultiResults.roberta.requirement_category}</span>
                      <div className="text-[10px] text-slate-500 font-mono">conf: {customMultiResults.roberta.confidence}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Gemini */}
              {customMultiResults.gemini && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-800">Gemini AI</span>
                    <span className="text-[10px] font-mono text-purple-700 font-semibold">k={customMultiResults.gemini.k}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                      CATEGORY_DESCRIPTIONS[customMultiResults.gemini.requirement_category]?.badgeClass || 'bg-slate-100 text-slate-700'
                    }`}>
                      {CATEGORY_DESCRIPTIONS[customMultiResults.gemini.requirement_category]?.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      conf: {customMultiResults.gemini.confidence}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Searchable Dataset Sentences Table */}
      <div className="bg-white rounded border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Dataset Records ({filteredRecords.length.toLocaleString()})
            </h2>
            <span className="text-xs text-slate-500">
              • {heuristicCount} Heuristic / {geminiCount} Gemini / {svmCount} SVM / {adjudicatedCount} Adjudicated
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
              <option value="ADJUDICATED">Adjudicated Only</option>
              <option value="GEMINI_CLASSIFIED">Gemini Evaluated Only</option>
              <option value="SVM_CLASSIFIED">SVM Evaluated Only</option>
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
                <th className="px-3 py-2 w-32">Heuristic</th>
                <th className="px-3 py-2 w-32">Linear SVM</th>
                <th className="px-3 py-2 w-32">Gemini Category</th>
                <th className="px-3 py-2 w-36">Ground Truth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRecords.map(rec => {
                const isSelected = rec.id === selectedRecordId;
                const hCat = rec.predictedCategory;
                const svmRes = rec.svmResult;
                const gRes = rec.geminiResult;
                const adj = rec.humanAnnotations?.adjudicated;

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
                      {svmRes && svmRes.status === 'success' ? (
                        <span className={`inline-flex px-1.5 py-0.2 rounded text-[11px] font-medium border ${
                          CATEGORY_DESCRIPTIONS[svmRes.requirement_category]?.badgeClass || 'bg-slate-100 text-slate-700'
                        }`}>
                          {CATEGORY_DESCRIPTIONS[svmRes.requirement_category]?.label || svmRes.requirement_category}
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
                      {adj ? (
                        <span className="inline-flex px-1.5 py-0.2 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {CATEGORY_DESCRIPTIONS[adj]?.label || adj}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, filteredRecords.length)}</span> of{' '}
            <span className="font-semibold text-slate-800">{filteredRecords.length.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          records={records}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};
