import React, { useState } from 'react';
import { FeedbackRecord, RequirementCategory } from '../types';
import { calculateKrippendorffAlpha } from '../utils/krippendorff';
import { CATEGORY_DESCRIPTIONS } from '../utils/classifier';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';
import {
  Users,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Scale,
  Download,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  RotateCcw,
  Check,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

interface HumanAnnotationSectionProps {
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

export const HumanAnnotationSection: React.FC<HumanAnnotationSectionProps> = ({
  records,
  onUpdateRecord,
  sourceName = 'dataset'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'AGREED' | 'DISAGREED' | 'UNANNOTATED'>('ALL');
  const [activeRole, setActiveRole] = useState<'A' | 'B' | 'ADJUDICATOR'>('A');
  const [adjudicationNote, setAdjudicationNote] = useState('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Compute live Krippendorff's alpha strictly across dual human annotations
  const agreementStats = calculateKrippendorffAlpha(records);

  // Filter records based on selected tab/filter
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

  // Handlers for independent annotations
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
      predictedCategory: cat, // Adjudicated gold standard overrides for final evaluation
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
        fileName: `inter_annotator_study_${Date.now()}.csv`,
        includeMetadataColumns: true
      });
      setExportNotice(`Exported ${res.count} records to ${res.filename} successfully.`);
      setTimeout(() => setExportNotice(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Export error: ${msg}`);
    }
  };

  if (records.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center my-8">
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Records Available</h3>
        <p className="text-sm text-slate-500">
          Please load a dataset using the Dataset Switcher tab to perform human annotations.
        </p>
      </div>
    );
  }

  const annA = currentRecord?.humanAnnotations?.annotatorA;
  const annB = currentRecord?.humanAnnotations?.annotatorB;
  const adjudicated = currentRecord?.humanAnnotations?.adjudicated;

  let agreementStatus: 'INCOMPLETE' | 'AGREED' | 'DISAGREED' = 'INCOMPLETE';
  if (annA && annB) {
    agreementStatus = annA === annB ? 'AGREED' : 'DISAGREED';
  }

  return (
    <div className="space-y-6">
      {/* Research Integrity & Protocol Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-xs text-purple-950 flex items-start space-x-3">
        <Scale className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-purple-900">
            Manuscript Protocol: Independent Two-Annotator Calibration & Adjudication (Section VII)
          </div>
          <p className="text-purple-800 leading-relaxed">
            Per the research design, two human annotators review sentences independently. Nominal Krippendorff's alpha is computed{' '}
            <strong>strictly on independent human labels</strong>. The automated rule-based heuristic prediction is never used as a substitute for a human annotator, and adjudicated labels are excluded from the reliability computation.
          </p>
        </div>
      </div>

      {/* Live Krippendorff's Alpha & Reliability Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Alpha Value */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Krippendorff's Alpha (α)
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {agreementStats.krippendorffAlpha !== null ? agreementStats.krippendorffAlpha.toFixed(3) : 'Pending'}
            </span>
            <span className="text-xs text-slate-500">nominal metric</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-600 line-clamp-2">
            {agreementStats.interpretation}
          </div>
        </div>

        {/* Dual-Annotated Units */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Dual-Annotated Pairs
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-blue-700">
              {agreementStats.bothAnnotatedUnits}
            </span>
            <span className="text-xs text-slate-500">/ {records.length} sentences</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {records.length - agreementStats.bothAnnotatedUnits} sentences await complete dual labeling
          </div>
        </div>

        {/* Observed Agreement */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Raw Agreement Rate
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              {agreementStats.percentObservedAgreement !== null
                ? `${agreementStats.percentObservedAgreement.toFixed(1)}%`
                : 'Pending'}
            </span>
            <span className="text-xs text-slate-500">observed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {agreementStats.agreedUnits} agreed, {agreementStats.disagreedUnits} disagreed pairs
          </div>
        </div>

        {/* Reliability Benchmark Reference */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Acceptance Thresholds
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span>α ≥ 0.800:</span>
              <span className="font-semibold text-emerald-700">Definitive / Reliable</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>0.670 ≤ α &lt; 0.800:</span>
              <span className="font-semibold text-amber-700">Tentative Conclusions</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>α &lt; 0.670:</span>
              <span className="font-medium text-rose-700">Revision Required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Annotation Workbench */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        {/* Header with Navigation and Active Role Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sentence Unit:
            </span>
            <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-900">
              {currentRecord?.id}
            </span>
            {currentRecord?.domain && (
              <span className="text-xs font-semibold uppercase bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                {currentRecord.domain}
              </span>
            )}
            <span className="text-xs text-slate-400">
              ({filteredRecords.length > 0 ? currentIndex + 1 : 0} of {filteredRecords.length} in view)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Role Switcher */}
            <div className="inline-flex rounded-md shadow-2xs bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                onClick={() => setActiveRole('A')}
                className={`px-3 py-1 font-medium rounded ${
                  activeRole === 'A' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annotator A
              </button>
              <button
                onClick={() => setActiveRole('B')}
                className={`px-3 py-1 font-medium rounded ${
                  activeRole === 'B' ? 'bg-white text-purple-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annotator B
              </button>
              <button
                onClick={() => setActiveRole('ADJUDICATOR')}
                className={`px-3 py-1 font-medium rounded ${
                  activeRole === 'ADJUDICATOR' ? 'bg-white text-emerald-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Adjudicator (Gold)
              </button>
            </div>

            {/* Navigation buttons */}
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              title="Previous Sentence"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentIndex(prev => Math.min(filteredRecords.length - 1, prev + 1))}
              disabled={currentIndex >= filteredRecords.length - 1}
              className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              title="Next Sentence"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Feedback Sentence Card */}
        {currentRecord && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-medium">Raw Customer Review Text:</span>
                {currentRecord.reviewId && (
                  <span className="font-mono text-[11px] text-slate-400">Review ID: {currentRecord.reviewId}</span>
                )}
              </div>
              <p className="text-base font-medium text-slate-900 leading-relaxed">
                "{currentRecord.text}"
              </p>

              {/* Original metadata tags */}
              {Object.keys(currentRecord.originalMetadata || {}).length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Metadata:</span>
                  {Object.entries(currentRecord.originalMetadata).map(([k, v]) => (
                    <span key={k} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] font-mono">
                      {k}: <strong>{v}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Dual Annotations & Adjudication Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Annotator A Card */}
              <div className={`p-4 rounded-lg border ${
                activeRole === 'A' ? 'border-blue-400 bg-blue-50/20 ring-1 ring-blue-300' : 'border-slate-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-blue-700" />
                    <span className="font-semibold text-slate-900 text-xs sm:text-sm">Annotator A</span>
                  </div>
                  {annA ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      SUBMITTED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      PENDING
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleAssignAnnotatorLabel('A', cat)}
                      className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between border ${
                        annA === cat
                          ? 'bg-blue-700 text-white border-blue-700 font-semibold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{CATEGORY_DESCRIPTIONS[cat].label}</span>
                      {annA === cat && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
                {currentRecord.humanAnnotations?.annotatorATimestamp && (
                  <div className="text-[10px] text-slate-400 text-right">
                    Logged: {new Date(currentRecord.humanAnnotations.annotatorATimestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Annotator B Card */}
              <div className={`p-4 rounded-lg border ${
                activeRole === 'B' ? 'border-purple-400 bg-purple-50/20 ring-1 ring-purple-300' : 'border-slate-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-purple-700" />
                    <span className="font-semibold text-slate-900 text-xs sm:text-sm">Annotator B</span>
                  </div>
                  {annB ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      SUBMITTED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      PENDING
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleAssignAnnotatorLabel('B', cat)}
                      className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between border ${
                        annB === cat
                          ? 'bg-purple-700 text-white border-purple-700 font-semibold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{CATEGORY_DESCRIPTIONS[cat].label}</span>
                      {annB === cat && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
                {currentRecord.humanAnnotations?.annotatorBTimestamp && (
                  <div className="text-[10px] text-slate-400 text-right">
                    Logged: {new Date(currentRecord.humanAnnotations.annotatorBTimestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Agreement & Adjudication Card */}
              <div className={`p-4 rounded-lg border ${
                activeRole === 'ADJUDICATOR' ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-300' : 'border-slate-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-emerald-700" />
                    <span className="font-semibold text-slate-900 text-xs sm:text-sm">Adjudication & Gold</span>
                  </div>
                  {agreementStatus === 'AGREED' && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> AGREED
                    </span>
                  )}
                  {agreementStatus === 'DISAGREED' && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" /> DISAGREED
                    </span>
                  )}
                  {agreementStatus === 'INCOMPLETE' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      AWAITING PAIR
                    </span>
                  )}
                </div>

                {/* Status Notice */}
                {agreementStatus === 'DISAGREED' && (
                  <div className="p-2 mb-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 leading-tight">
                    Disagreement detected. Annotator A chose <strong>{CATEGORY_DESCRIPTIONS[annA!].label}</strong>, while Annotator B chose <strong>{CATEGORY_DESCRIPTIONS[annB!].label}</strong>. Apply boundary rules to adjudicate.
                  </div>
                )}

                <div className="space-y-1.5 mb-2">
                  <div className="text-[11px] font-medium text-slate-600">Assign Gold Standard Label:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleAssignAdjudicatedLabel(cat)}
                        className={`px-2 py-1.5 rounded text-[11px] transition-colors text-center border font-medium ${
                          adjudicated === cat
                            ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {CATEGORY_DESCRIPTIONS[cat].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2">
                  <input
                    type="text"
                    value={adjudicationNote}
                    onChange={e => setAdjudicationNote(e.target.value)}
                    placeholder="Adjudication notes (optional)..."
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {currentRecord.humanAnnotations?.adjudicatorNotes && (
                    <div className="mt-1 text-[10px] text-slate-500 italic">
                      Note: "{currentRecord.humanAnnotations.adjudicatorNotes}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleResetAnnotations(currentRecord)}
                  className="inline-flex items-center px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Annotations for Record
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportAnnotationStudy}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                  Export Dual Annotations (.csv)
                </button>
              </div>
            </div>

            {exportNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                {exportNotice}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Annotation Summary Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <span>Annotation Study Dataset Records</span>
          </h3>

          {/* Filter Pills */}
          <div className="flex space-x-1 text-xs">
            {(['ALL', 'AGREED', 'DISAGREED', 'UNANNOTATED'] as const).map(f => (
              <button
                key={f}
                onClick={() => {
                  setSelectedFilter(f);
                  setCurrentIndex(0);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedFilter === f
                    ? 'bg-blue-700 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Feedback Sentence</th>
                <th className="px-3 py-2 text-left">Annotator A</th>
                <th className="px-3 py-2 text-left">Annotator B</th>
                <th className="px-3 py-2 text-center">Agreement</th>
                <th className="px-3 py-2 text-left">Adjudicated Gold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.slice(0, 8).map((rec, i) => {
                const a = rec.humanAnnotations?.annotatorA;
                const b = rec.humanAnnotations?.annotatorB;
                const adj = rec.humanAnnotations?.adjudicated;
                let status = 'INCOMPLETE';
                if (a && b) {
                  status = a === b ? 'AGREED' : 'DISAGREED';
                }

                return (
                  <tr
                    key={rec.id}
                    onClick={() => setCurrentIndex(i)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 font-mono font-medium text-slate-900 whitespace-nowrap">{rec.id}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={rec.text}>"{rec.text}"</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {a ? (
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                          {CATEGORY_DESCRIPTIONS[a].label}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {b ? (
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-200">
                          {CATEGORY_DESCRIPTIONS[b].label}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {status === 'AGREED' && (
                        <span className="text-emerald-700 font-semibold flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 mr-0.5" /> Agreed
                        </span>
                      )}
                      {status === 'DISAGREED' && (
                        <span className="text-amber-700 font-semibold flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5 mr-0.5" /> Disagreed
                        </span>
                      )}
                      {status === 'INCOMPLETE' && <span className="text-slate-400">Incomplete</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {adj ? (
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          {CATEGORY_DESCRIPTIONS[adj].label}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredRecords.length > 8 && (
            <div className="p-2 text-center text-xs text-slate-500 border-t border-slate-100">
              Showing first 8 of {filteredRecords.length} records. Select any row above to inspect and annotate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
