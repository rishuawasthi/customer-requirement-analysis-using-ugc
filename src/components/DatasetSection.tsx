import React, { useState, useRef } from 'react';
import { FeedbackRecord } from '../types';
import { parseFile, parseCSV, processRawRows, ParseResult } from '../utils/fileParser';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Database,
  Search,
  FileText,
  HelpCircle,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  Check
} from 'lucide-react';

interface DatasetSectionProps {
  records: FeedbackRecord[];
  allColumns: string[];
  detectedTextColumn: string;
  metadataColumns: string[];
  sourceName: string;
  uniqueReviewsCount?: number;
  uniqueSentencesCount?: number;
  onDatasetLoaded: (
    records: FeedbackRecord[],
    allColumns: string[],
    detectedTextColumn: string,
    metadataColumns: string[],
    sourceName: string,
    uniqueReviews?: number,
    uniqueSentences?: number
  ) => void;
}

export const DatasetSection: React.FC<DatasetSectionProps> = ({
  records,
  allColumns,
  detectedTextColumn,
  metadataColumns,
  sourceName,
  uniqueReviewsCount,
  uniqueSentencesCount,
  onDatasetLoaded
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Identify which preset is currently active
  const isCuratedActive = sourceName.includes('semeval2015_research_ready') && !sourceName.includes('full') && records.length <= 100;
  const isFullSemEvalActive = sourceName.includes('full') || records.length > 500;

  // Handler to load preset dataset
  const handleLoadPresetDataset = async (preset: 'curated' | 'full', format: 'csv' | 'xlsx' = 'csv') => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const filename = preset === 'curated'
      ? (format === 'xlsx' ? 'semeval2015_research_ready.xlsx' : 'semeval2015_research_ready.csv')
      : 'semeval2015_research_ready_full.csv';

    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) {
        throw new Error(`Dataset file '${filename}' could not be fetched from the server (HTTP ${response.status}).`);
      }

      let parseResult: ParseResult;
      if (format === 'xlsx') {
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        parseResult = await parseFile(file);
      } else {
        const text = await response.text();
        const rows = parseCSV(text);
        parseResult = processRawRows(rows);
      }

      if (parseResult.error || parseResult.records.length === 0) {
        setErrorMessage(parseResult.error || 'Failed to parse records from dataset file.');
      } else {
        onDatasetLoaded(
          parseResult.records,
          parseResult.allColumns,
          parseResult.detectedTextColumn,
          parseResult.metadataColumns,
          filename,
          parseResult.uniqueReviewsCount,
          parseResult.uniqueSentencesCount
        );
        const desc = preset === 'curated' ? 'Curated 45-record presentation dataset' : 'Full 4,161-row SemEval-2015 benchmark';
        setSuccessMessage(`Successfully switched to ${desc} (${parseResult.records.length.toLocaleString()} records).`);
        setCurrentPage(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Error loading ${filename}: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload user custom file (.xlsx or .csv)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parseResult = await parseFile(file);
      if (parseResult.error || parseResult.records.length === 0) {
        setErrorMessage(parseResult.error || 'Failed to read dataset from uploaded file.');
      } else {
        onDatasetLoaded(
          parseResult.records,
          parseResult.allColumns,
          parseResult.detectedTextColumn,
          parseResult.metadataColumns,
          file.name,
          parseResult.uniqueReviewsCount,
          parseResult.uniqueSentencesCount
        );
        setSuccessMessage(`Loaded ${parseResult.records.length.toLocaleString()} records from custom file ${file.name}.`);
        setCurrentPage(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`File parsing error: ${msg}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter records in table
  const filteredRecords = records.filter(record => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    const matchesSearch =
      record.text.toLowerCase().includes(term) ||
      record.id.toLowerCase().includes(term) ||
      (record.domain && record.domain.toLowerCase().includes(term)) ||
      (record.reviewId && record.reviewId.toLowerCase().includes(term)) ||
      Object.values(record.originalMetadata).some(val =>
        String(val).toLowerCase().includes(term)
      );
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Derive domain breakdown
  const domainCounts: Record<string, number> = {};
  records.forEach(r => {
    const d = r.domain || r.originalMetadata['domain'];
    if (d) {
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Switcher Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Option 1: Curated 45-Record Presentation Set */}
        <div className={`p-5 rounded-lg border flex flex-col justify-between transition-all ${
          isCuratedActive
            ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-300 shadow-xs'
            : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 font-mono">
                Dataset Option 1
              </span>
              {isCuratedActive ? (
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-blue-700 text-white flex items-center">
                  <Check className="w-3 h-3 mr-1" /> ACTIVE
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium">Default</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Curated Presentation Dataset
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              45 balanced, highly focused sentences (25 Laptop, 20 Restaurant) curated for swift, crisp viva defense and feature verification.
            </p>
            <div className="space-y-1 text-[11px] text-slate-600 mb-4 bg-white/80 p-2.5 rounded border border-slate-200/70">
              <div className="flex justify-between">
                <span>Total records:</span>
                <strong className="text-slate-900 font-mono">45</strong>
              </div>
              <div className="flex justify-between">
                <span>Domains:</span>
                <span>Laptop (25), Restaurant (20)</span>
              </div>
              <div className="flex justify-between">
                <span>Heuristic balance:</span>
                <span>All 4 classes represented</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-2 border-t border-slate-200">
            <button
              onClick={() => handleLoadPresetDataset('curated', 'csv')}
              disabled={isLoading || isCuratedActive}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isCuratedActive
                  ? 'bg-blue-100 text-blue-800 cursor-default'
                  : 'bg-blue-700 hover:bg-blue-800 text-white shadow-2xs'
              }`}
            >
              {isCuratedActive ? 'Currently Loaded (.csv)' : 'Switch to 45 Records'}
            </button>
            <button
              onClick={() => handleLoadPresetDataset('curated', 'xlsx')}
              disabled={isLoading}
              className="px-2 py-1.5 text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded"
              title="Load as Excel (.xlsx)"
            >
              .xlsx
            </button>
          </div>
        </div>

        {/* Option 2: Full 4,161-Row SemEval Benchmark */}
        <div className={`p-5 rounded-lg border flex flex-col justify-between transition-all ${
          isFullSemEvalActive
            ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-300 shadow-xs'
            : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 font-mono">
                Dataset Option 2
              </span>
              {isFullSemEvalActive ? (
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-blue-700 text-white flex items-center">
                  <Check className="w-3 h-3 mr-1" /> ACTIVE
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium">Full Corpus</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Full SemEval-2015 Benchmark
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Complete raw SemEval-2015 Task 12 corpus. 4,161 rows across 531 unique reviews and 3,054 unique sentences with full aspect metadata.
            </p>
            <div className="space-y-1 text-[11px] text-slate-600 mb-4 bg-white/80 p-2.5 rounded border border-slate-200/70">
              <div className="flex justify-between">
                <span>Total records:</span>
                <strong className="text-slate-900 font-mono">4,161 rows</strong>
              </div>
              <div className="flex justify-between">
                <span>Unique review IDs:</span>
                <strong className="text-slate-900 font-mono">531 reviews</strong>
              </div>
              <div className="flex justify-between">
                <span>Unique sentences:</span>
                <strong className="text-slate-900 font-mono">3,054 units</strong>
              </div>
              <div className="flex justify-between">
                <span>Domains:</span>
                <span>Laptop (2,314), Restaurant (1,847)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => handleLoadPresetDataset('full', 'csv')}
              disabled={isLoading || isFullSemEvalActive}
              className={`w-full px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isFullSemEvalActive
                  ? 'bg-blue-100 text-blue-800 cursor-default'
                  : 'bg-blue-700 hover:bg-blue-800 text-white shadow-2xs'
              }`}
            >
              {isFullSemEvalActive ? 'Currently Loaded (4,161 rows)' : 'Switch to Full 4,161 Benchmark'}
            </button>
          </div>
        </div>

        {/* Option 3: Custom File Upload */}
        <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Dataset Option 3
              </span>
              <span className="text-[11px] text-slate-400 font-medium">External</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Custom Dataset Upload
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Upload any custom customer review dataset in CSV or Excel format to evaluate the pipeline on unseen feedback.
            </p>
            <div className="text-[11px] text-slate-500 mb-4 bg-slate-50 p-2.5 rounded border border-slate-200">
              Supports columns: <code>id</code>, <code>sentence_text</code>, <code>text</code>, <code>review_id</code>, <code>polarity</code>, etc. Automatic schema mapping enabled.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Upload .csv / .xlsx File
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Active Dataset Inspection Badge */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-700" />
            <span className="font-semibold text-slate-900 text-sm">Active Dataset Specification:</span>
            <span className="font-mono text-xs bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
              {sourceName}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Detected Text Column: <code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{detectedTextColumn}</code>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="text-slate-500 font-medium">Total Rows</div>
            <div className="text-lg font-bold font-mono text-slate-900">{records.length.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="text-slate-500 font-medium">Unique Reviews</div>
            <div className="text-lg font-bold font-mono text-slate-900">
              {uniqueReviewsCount ? uniqueReviewsCount.toLocaleString() : (isFullSemEvalActive ? '531' : records.length.toLocaleString())}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="text-slate-500 font-medium">Unique Sentences</div>
            <div className="text-lg font-bold font-mono text-slate-900">
              {uniqueSentencesCount ? uniqueSentencesCount.toLocaleString() : (isFullSemEvalActive ? '3,054' : records.length.toLocaleString())}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="text-slate-500 font-medium">Domain Breakdown</div>
            <div className="text-xs font-medium text-slate-800 mt-1">
              {Object.keys(domainCounts).length > 0 ? (
                Object.entries(domainCounts).map(([k, v]) => `${k}: ${v}`).join(' | ')
              ) : (
                isCuratedActive ? 'Laptop: 25 | Restaurant: 20' : 'Multi-domain'
              )}
            </div>
          </div>
        </div>

        {/* Metadata columns list */}
        {metadataColumns.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 items-center text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Preserved Metadata Columns:</span>
            {metadataColumns.map(col => (
              <span key={col} className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                {col}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dataset Records Preview Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Dataset Records Explorer ({filteredRecords.length.toLocaleString()} matching)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search text, IDs, domain..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none w-48 sm:w-64"
              />
            </div>

            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs px-2 py-1.5 border border-slate-200 rounded text-slate-700 bg-white"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto text-xs">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Record ID</th>
                <th className="px-3 py-2 text-left">Feedback Sentence Text</th>
                <th className="px-3 py-2 text-left">Domain</th>
                <th className="px-3 py-2 text-left">Polarity</th>
                <th className="px-3 py-2 text-left">Aspect Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRecords.map(rec => {
                const pol = rec.originalMetadata['polarity'] || '';
                const asp = rec.originalMetadata['category'] || rec.originalMetadata['aspect_category'] || '';
                const dom = rec.domain || rec.originalMetadata['domain'] || '';

                return (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-medium text-slate-900 whitespace-nowrap">{rec.id}</td>
                    <td className="px-3 py-2 max-w-md truncate" title={rec.text}>"{rec.text}"</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {dom ? (
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-mono">
                          {dom}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {pol ? (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          pol.toLowerCase() === 'negative' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          pol.toLowerCase() === 'positive' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {pol}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {asp || <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
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
    </div>
  );
};
