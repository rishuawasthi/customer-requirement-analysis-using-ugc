import React, { useState } from 'react';
import { FeedbackRecord } from '../types';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import { Download, X, FileSpreadsheet, Check, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: FeedbackRecord[];
  currentFilterCategory?: string;
  currentSearchTerm?: string;
  sourceName?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  records,
  currentFilterCategory = 'ALL',
  currentSearchTerm = '',
  sourceName = 'dataset'
}) => {
  const [exportMode, setExportMode] = useState<'all' | 'classified' | 'actionable' | 'filtered'>('all');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCount = records.length;
  const classifiedCount = records.filter(r => r.predictedCategory).length;
  const actionableCount = records.filter(
    r =>
      r.predictedCategory === 'EXPLICIT_NEED' ||
      r.predictedCategory === 'IMPLICIT_NEED' ||
      r.predictedCategory === 'PAIN_POINT'
  ).length;

  const filteredCount = records.filter(record => {
    const matchesSearch =
      !currentSearchTerm ||
      record.text.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
      record.id.toLowerCase().includes(currentSearchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (currentFilterCategory === 'ALL') return true;
    if (currentFilterCategory === 'UNCLASSIFIED') return !record.predictedCategory;
    return record.predictedCategory === currentFilterCategory;
  }).length;

  const getRecordCountForMode = () => {
    switch (exportMode) {
      case 'classified':
        return classifiedCount;
      case 'actionable':
        return actionableCount;
      case 'filtered':
        return filteredCount;
      default:
        return totalCount;
    }
  };

  const handleDownload = () => {
    try {
      let result;
      const timestamp = new Date().toISOString().slice(0, 10);
      const cleanSourceName = sourceName.replace(/\.[^/.]+$/, '');

      if (exportMode === 'actionable') {
        result = exportAnalyzedRecordsToCSV(records, {
          actionableOnly: true,
          includeMetadataColumns: includeMetadata,
          fileName: `actionable_requirements_${cleanSourceName}_${timestamp}.csv`
        });
      } else if (exportMode === 'classified') {
        result = exportAnalyzedRecordsToCSV(records.filter(r => r.predictedCategory), {
          includeMetadataColumns: includeMetadata,
          fileName: `classified_requirements_${cleanSourceName}_${timestamp}.csv`
        });
      } else if (exportMode === 'filtered') {
        const filteredRecords = records.filter(record => {
          const matchesSearch =
            !currentSearchTerm ||
            record.text.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            record.id.toLowerCase().includes(currentSearchTerm.toLowerCase());
          if (!matchesSearch) return false;
          if (currentFilterCategory === 'ALL') return true;
          if (currentFilterCategory === 'UNCLASSIFIED') return !record.predictedCategory;
          return record.predictedCategory === currentFilterCategory;
        });
        result = exportAnalyzedRecordsToCSV(filteredRecords, {
          includeMetadataColumns: includeMetadata,
          fileName: `filtered_requirements_${cleanSourceName}_${timestamp}.csv`
        });
      } else {
        result = exportAnalyzedRecordsToCSV(records, {
          includeMetadataColumns: includeMetadata,
          fileName: `customer_requirement_analysis_report_${cleanSourceName}_${timestamp}.csv`
        });
      }

      setDownloadSuccess(`Exported ${result.count} records as ${result.filename}`);
      setTimeout(() => {
        setDownloadSuccess(null);
        onClose();
      }, 1400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Export failed: ${msg}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-lg max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-semibold text-slate-900">
              Export Analysis Results as CSV
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Download the analyzed customer requirement dataset for your academic project report, seminar presentation, or statistical evaluation.
        </p>

        {/* Export Scope Selector */}
        <div className="space-y-2.5 mb-5 text-xs">
          <div className="font-semibold text-slate-700 mb-1">Select Records to Export:</div>

          <label className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${exportMode === 'all' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportMode"
                checked={exportMode === 'all'}
                onChange={() => setExportMode('all')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-800">Complete Dataset</span>
            </div>
            <span className="font-mono text-slate-500">{totalCount} records</span>
          </label>

          <label className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${exportMode === 'actionable' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportMode"
                checked={exportMode === 'actionable'}
                onChange={() => setExportMode('actionable')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-slate-800 block">Actionable Requirements Only</span>
                <span className="text-[11px] text-slate-500">Explicit Needs + Implicit Needs + Pain Points</span>
              </div>
            </div>
            <span className="font-mono text-emerald-700 font-semibold">{actionableCount} records</span>
          </label>

          <label className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${exportMode === 'classified' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportMode"
                checked={exportMode === 'classified'}
                onChange={() => setExportMode('classified')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-800">All Analyzed / Classified Records</span>
            </div>
            <span className="font-mono text-slate-500">{classifiedCount} records</span>
          </label>

          {(currentFilterCategory !== 'ALL' || currentSearchTerm) && (
            <label className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${exportMode === 'filtered' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'filtered'}
                  onChange={() => setExportMode('filtered')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-slate-800 block">Current Filtered View</span>
                  <span className="text-[11px] text-slate-500">Category: {currentFilterCategory} {currentSearchTerm ? `| Search: "${currentSearchTerm}"` : ''}</span>
                </div>
              </div>
              <span className="font-mono text-slate-500">{filteredCount} records</span>
            </label>
          )}
        </div>

        {/* Options */}
        <div className="mb-5 pt-3 border-t border-slate-100 text-xs">
          <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Include original SemEval benchmark columns (aspect, polarity, etc.)</span>
          </label>
        </div>

        {/* Success confirmation */}
        {downloadSuccess && (
          <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={getRecordCountForMode() === 0}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download CSV ({getRecordCountForMode()} Records)
          </button>
        </div>
      </div>
    </div>
  );
};
