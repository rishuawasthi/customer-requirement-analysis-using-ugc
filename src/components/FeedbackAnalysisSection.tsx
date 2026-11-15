import React, { useState } from 'react';
import { FeedbackRecord, RequirementCategory } from '../types';
import { classifyFeedback, CATEGORY_DESCRIPTIONS } from '../utils/classifier';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import { ExportModal } from './ExportModal';
import {
  Search,
  Filter,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Info,
  Check,
  CheckCircle2
} from 'lucide-react';

interface FeedbackAnalysisSectionProps {
  records: FeedbackRecord[];
  onUpdateRecord: (updatedRecord: FeedbackRecord) => void;
  onBatchClassifyAll: () => void;
  sourceName?: string;
}

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

  // Modal and toast state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Custom sentence tester state
  const [customText, setCustomText] = useState('');
  const [customResult, setCustomResult] = useState<ReturnType<typeof classifyFeedback> | null>(null);

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected record
  const selectedRecord = records.find(r => r.id === selectedRecordId) || records[0];

  // Filtering
  const filteredRecords = records.filter(record => {
    const matchesSearch =
      record.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'UNCLASSIFIED') return !record.predictedCategory;
    return record.predictedCategory === categoryFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handler to analyze single record
  const handleAnalyzeRecord = (record: FeedbackRecord) => {
    const result = classifyFeedback(record.text);
    const updated: FeedbackRecord = {
      ...record,
      predictedCategory: result.category,
      explanation: result.explanation,
      matchedCues: result.matchedCues,
      isUserAnnotated: false
    };
    onUpdateRecord(updated);
  };

  // Handler to manually override category (for student review / human annotation)
  const handleManualOverride = (record: FeedbackRecord, newCat: RequirementCategory) => {
    const updated: FeedbackRecord = {
      ...record,
      predictedCategory: newCat,
      explanation: `Manual academic annotation: categorized as ${CATEGORY_DESCRIPTIONS[newCat].label} by user/reviewer.`,
      matchedCues: ['Manual Annotation'],
      isUserAnnotated: true
    };
    onUpdateRecord(updated);
  };

  // Custom test tester
  const handleTestCustomSentence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    const res = classifyFeedback(customText);
    setCustomResult(res);
  };

  // Quick export all classified/loaded records as CSV
  const handleQuickExportCSV = () => {
    if (records.length === 0) return;
    try {
      const res = exportAnalyzedRecordsToCSV(records, {
        fileName: `customer_requirement_analysis_results.csv`,
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
          Please navigate to the Dataset tab and load the SemEval dataset or upload a CSV/Excel file.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Methodological Honesty Disclaimer Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-900">Academic Project Method: </span>
          Classification is performed using an interpretable, rule-based linguistic pattern matching baseline.
          It inspects directive modal verbs (for explicit needs), counterfactual wishes / friction descriptors (for implicit needs),
          system failure terms (for pain points), or categorizes items as non-actionable.
          <span className="font-medium text-blue-800 ml-1">
            It is a deterministic experimental heuristic baseline, not a trained neural network or fabricated confidence score.
          </span>
        </div>
      </div>

      {/* Selected Sentence Inspection Panel */}
      {selectedRecord && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Selected Feedback Record:
              </span>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                {selectedRecord.id}
              </span>
              {selectedRecord.isUserAnnotated && (
                <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-medium">
                  Manually Verified
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleAnalyzeRecord(selectedRecord)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                {selectedRecord.predictedCategory ? 'Re-Analyze Heuristic' : 'Analyze Sentence'}
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
            {Object.keys(selectedRecord.originalMetadata).length > 0 && (
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Original SemEval Tags:</span>
                {Object.entries(selectedRecord.originalMetadata).map(([k, v]) => (
                  <span key={k} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-xs">
                    {k}: <strong className="text-slate-800">{v}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Classification Result Display */}
          {selectedRecord.predictedCategory ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold text-slate-600">Requirement Category:</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${
                      CATEGORY_DESCRIPTIONS[selectedRecord.predictedCategory].badgeClass
                    }`}
                  >
                    {CATEGORY_DESCRIPTIONS[selectedRecord.predictedCategory].label}
                  </span>
                </div>

                {/* Manual annotation override dropdown for academic evaluation */}
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">Manual Correction:</span>
                  <select
                    value={selectedRecord.predictedCategory}
                    onChange={(e) => handleManualOverride(selectedRecord, e.target.value as RequirementCategory)}
                    className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-700"
                  >
                    <option value="EXPLICIT_NEED">Explicit Need</option>
                    <option value="IMPLICIT_NEED">Implicit Need</option>
                    <option value="PAIN_POINT">Pain Point</option>
                    <option value="NON_ACTIONABLE">Non-Actionable</option>
                  </select>
                </div>
              </div>

              {/* Rationale and matched cues */}
              <div className="bg-white p-3 rounded border border-slate-200 text-xs">
                <div className="font-semibold text-slate-700 mb-1">Classification Explanation:</div>
                <p className="text-slate-600 leading-relaxed mb-2">
                  {selectedRecord.explanation}
                </p>

                {selectedRecord.matchedCues && selectedRecord.matchedCues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                    <span className="font-medium text-slate-500">Identified Linguistic Cues:</span>
                    {selectedRecord.matchedCues.map((cue, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-xs border border-slate-200"
                      >
                        {cue}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-slate-500 bg-slate-50 rounded border border-dashed border-slate-300">
              This sentence has not been analyzed yet. Click "Analyze Sentence" above to run the requirement heuristic.
            </div>
          )}
        </div>
      )}

      {/* Interactive Custom Feedback Tester */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-100">
          <Sparkles className="w-4 h-4 text-blue-700" />
          <h3 className="text-sm font-semibold text-slate-900">
            Interactive Requirement Tester (Try Any Sentence)
          </h3>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Type or paste any arbitrary customer feedback sentence to test how the heuristic baseline categorizes it into Explicit Need, Implicit Need, Pain Point, or Non-Actionable.
        </p>

        <form onSubmit={handleTestCustomSentence} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g., Please add an export to PDF button, or: The application crashes during startup"
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shrink-0 transition-colors"
            >
              Analyze Input
            </button>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Sample test phrases:</span>
            <button
              type="button"
              onClick={() => {
                setCustomText("Please provide support for two-factor authentication.");
                setCustomResult(classifyFeedback("Please provide support for two-factor authentication."));
              }}
              className="text-blue-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-xs"
            >
              "Please provide support..." (Explicit)
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomText("I wish the battery lasted longer than three hours.");
                setCustomResult(classifyFeedback("I wish the battery lasted longer than three hours."));
              }}
              className="text-blue-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-xs"
            >
              "I wish the battery lasted..." (Implicit)
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomText("The software froze completely and lost my unsaved data.");
                setCustomResult(classifyFeedback("The software froze completely and lost my unsaved data."));
              }}
              className="text-blue-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-xs"
            >
              "The software froze..." (Pain point)
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomText("Loved the authentic dessert, best in town!");
                setCustomResult(classifyFeedback("Loved the authentic dessert, best in town!"));
              }}
              className="text-blue-700 hover:underline bg-slate-100 px-2 py-0.5 rounded text-xs"
            >
              "Loved the authentic..." (Non-actionable)
            </button>
          </div>
        </form>

        {customResult && (
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Test Result:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                  CATEGORY_DESCRIPTIONS[customResult.category].badgeClass
                }`}
              >
                {CATEGORY_DESCRIPTIONS[customResult.category].label}
              </span>
            </div>
            <p className="text-slate-600">{customResult.explanation}</p>
          </div>
        )}
      </div>

      {/* Dataset Feedback Records Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search feedback or ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none w-56 sm:w-64"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="ALL">All Categories ({records.length})</option>
                <option value="EXPLICIT_NEED">Explicit Need</option>
                <option value="IMPLICIT_NEED">Implicit Need</option>
                <option value="PAIN_POINT">Pain Point</option>
                <option value="NON_ACTIONABLE">Non-Actionable</option>
                <option value="UNCLASSIFIED">Unclassified Only</option>
              </select>
            </div>
          </div>

          {/* Action buttons: Batch Classify & Export Options */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onBatchClassifyAll}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Classify All
            </button>
            <button
              onClick={handleQuickExportCSV}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
              title="Instantly download full dataset as CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
              Quick CSV
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded transition-colors"
              title="Custom academic report export (filter, metadata, scope)"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-blue-700" />
              Export Report...
            </button>
          </div>
        </div>

        {/* Temporary Export Notification Toast */}
        {exportNotice && (
          <div className="mx-4 mt-2 mb-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Feedback Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-16">ID</th>
                <th className="py-2.5 px-3">Feedback Sentence</th>
                <th className="py-2.5 px-3 w-32 hidden md:table-cell">Original Metadata</th>
                <th className="py-2.5 px-3 w-36">Requirement Category</th>
                <th className="py-2.5 px-3 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map(record => {
                  const isSelected = record.id === selectedRecordId;
                  const cat = record.predictedCategory;
                  return (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecordId(record.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {record.id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 max-w-md">
                        <div className="line-clamp-2 leading-relaxed">
                          {record.text}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                        {record.originalMetadata['polarity'] && (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-mono mr-1 ${
                              record.originalMetadata['polarity'].toLowerCase() === 'positive'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : record.originalMetadata['polarity'].toLowerCase() === 'negative'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {record.originalMetadata['polarity']}
                          </span>
                        )}
                        {record.originalMetadata['aspect_category'] && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {record.originalMetadata['aspect_category']}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {cat ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              CATEGORY_DESCRIPTIONS[cat].badgeClass
                            }`}
                          >
                            {CATEGORY_DESCRIPTIONS[cat].label}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unclassified</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecordId(record.id);
                            handleAnalyzeRecord(record);
                          }}
                          className="text-blue-700 hover:text-blue-900 font-medium text-xs hover:underline"
                        >
                          {cat ? 'Re-test' : 'Analyze'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No feedback sentences match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{Math.min(filteredRecords.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
            <span className="font-semibold">{Math.min(filteredRecords.length, currentPage * pageSize)}</span> of{' '}
            <span className="font-semibold">{filteredRecords.length}</span> records
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Export CSV Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={records}
        currentFilterCategory={categoryFilter}
        currentSearchTerm={searchTerm}
        sourceName={sourceName}
      />
    </div>
  );
};
