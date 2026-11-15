/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { FeedbackDashboard } from './components/FeedbackDashboard';
import { ImplementationSection } from './components/ImplementationSection';
import { ResearchSection } from './components/ResearchSection';
import { DocumentationSection } from './components/DocumentationSection';
import { FeedbackRecord } from './types';
import { parseCSV, processRawRows } from './utils/fileParser';
import { classifyFeedback } from './utils/classifier';

const ANNOTATION_STORAGE_PREFIX = 'ugc_human_annotations_';

function getStoredAnnotations(source: string): Record<string, FeedbackRecord['humanAnnotations']> {
  try {
    const key = ANNOTATION_STORAGE_PREFIX + source.replace(/[^a-zA-Z0-9_-]/g, '_');
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persistAnnotation(source: string, recordId: string, annotations: FeedbackRecord['humanAnnotations']) {
  try {
    const key = ANNOTATION_STORAGE_PREFIX + source.replace(/[^a-zA-Z0-9_-]/g, '_');
    const stored = getStoredAnnotations(source);
    if (annotations) stored[recordId] = annotations;
    else delete stored[recordId];
    localStorage.setItem(key, JSON.stringify(stored));
  } catch { /* safe fallback if storage is disabled */ }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [detectedTextColumn, setDetectedTextColumn] = useState<string>('text');
  const [metadataColumns, setMetadataColumns] = useState<string[]>([]);
  const [sourceName, setSourceName] = useState<string>('semeval2015_research_ready.csv');
  const [uniqueReviewsCount, setUniqueReviewsCount] = useState<number>(45);
  const [uniqueSentencesCount, setUniqueSentencesCount] = useState<number>(45);
  const [isAutoLoading, setIsAutoLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch('/semeval2015_research_ready.csv');
        if (res.ok) {
          const result = processRawRows(parseCSV(await res.text()));
          if (result.records.length > 0) {
            const initialSource = 'semeval2015_research_ready.csv (Curated 45-Set)';
            const saved = getStoredAnnotations(initialSource);
            const hydrated = result.records.map(r => saved[r.id]
              ? { ...r, humanAnnotations: saved[r.id], isUserAnnotated: true } : r);
            setRecords(hydrated);
            setAllColumns(result.allColumns);
            setDetectedTextColumn(result.detectedTextColumn);
            setMetadataColumns(result.metadataColumns);
            setSourceName(initialSource);
            setUniqueReviewsCount(result.uniqueReviewsCount || result.records.length);
            setUniqueSentencesCount(result.uniqueSentencesCount || result.records.length);
          }
        }
      } catch (err) { console.warn('Initial dataset fetch error:', err); }
      finally { setIsAutoLoading(false); }
    }
    loadInitialData();
  }, []);

  const handleUpdateRecord = (updatedRecord: FeedbackRecord) => {
    if (updatedRecord.humanAnnotations) persistAnnotation(sourceName, updatedRecord.id, updatedRecord.humanAnnotations);
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const handleBatchClassifyAll = () => {
    setRecords(prev => prev.map(r => {
      const result = classifyFeedback(r.text);
      return { ...r, predictedCategory: result.category, explanation: result.explanation,
        matchedCues: result.matchedCues, isUserAnnotated: r.isUserAnnotated || false };
    }));
  };

  const handleQuickSwitchDataset = async (preset: 'curated' | 'full') => {
    setIsAutoLoading(true);
    const filename = preset === 'curated' ? 'semeval2015_research_ready.csv' : 'semeval2015_research_ready_full.csv';
    try {
      const res = await fetch(`/${filename}`);
      if (res.ok) {
        const result = processRawRows(parseCSV(await res.text()));
        if (result.records.length > 0) {
          const saved = getStoredAnnotations(filename);
          const hydrated = result.records.map(r => saved[r.id]
            ? { ...r, humanAnnotations: saved[r.id], isUserAnnotated: true } : r);
          setRecords(hydrated);
          setAllColumns(result.allColumns);
          setDetectedTextColumn(result.detectedTextColumn);
          setMetadataColumns(result.metadataColumns);
          setSourceName(filename);
          setUniqueReviewsCount(result.uniqueReviewsCount || result.records.length);
          setUniqueSentencesCount(result.uniqueSentencesCount || result.records.length);
        }
      }
    } catch (err) { console.warn('Dataset switch error:', err); }
    finally { setIsAutoLoading(false); }
  };

  const handleDatasetLoaded = (
    newRecords: FeedbackRecord[], newAllCols: string[], newDetectedTextCol: string,
    newMetaCols: string[], newSource: string, newUniqueReviews?: number, newUniqueSentences?: number
  ) => {
    const saved = getStoredAnnotations(newSource);
    const hydrated = newRecords.map(r => saved[r.id]
      ? { ...r, humanAnnotations: saved[r.id], isUserAnnotated: true } : r);
    setRecords(hydrated);
    setAllColumns(newAllCols);
    setDetectedTextColumn(newDetectedTextCol);
    setMetadataColumns(newMetaCols);
    setSourceName(newSource);
    setUniqueReviewsCount(newUniqueReviews || newRecords.length);
    setUniqueSentencesCount(newUniqueSentences || newRecords.length);
  };

  const classifiedCount = records.filter(r => r.predictedCategory !== undefined).length;
  const annotatedPairCount = records.filter(r =>
    r.humanAnnotations?.annotatorA !== undefined && r.humanAnnotations?.annotatorB !== undefined
  ).length;

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-slate-800 font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} recordCount={records.length}
        classifiedCount={classifiedCount} annotatedCount={annotatedPairCount}
        sourceName={sourceName} onQuickSwitchDataset={handleQuickSwitchDataset}/>
      <main className="min-h-screen ml-0 lg:ml-[248px] px-4 sm:px-6 xl:px-8 pt-[94px] pb-24 lg:pb-6 max-w-[1800px]">
        {isAutoLoading && records.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-slate-500 text-sm">Loading SemEval dataset…</div>
        ) : (
          <>
            {activeTab === 'dashboard' && <FeedbackDashboard records={records} sourceName={sourceName}
              onUpdateRecords={setRecords} onDatasetLoaded={handleDatasetLoaded}
              onAnalyzeAll={handleBatchClassifyAll} onOpenSentenceAnalysis={() => setActiveTab('implementation')}/>}
            {activeTab === 'implementation' && <ImplementationSection records={records}
              onUpdateRecord={handleUpdateRecord} onBatchClassifyAll={handleBatchClassifyAll}
              sourceName={sourceName} onSelectPresetDataset={handleQuickSwitchDataset}
              onCustomFileLoaded={handleDatasetLoaded}/>}
            {(activeTab === 'research' || activeTab === 'annotation') && <ResearchSection
              records={records} onUpdateRecord={handleUpdateRecord} sourceName={sourceName}/>}
            {activeTab === 'documentation' && <DocumentationSection/>}
          </>
        )}
        <footer className="mt-8 border-t border-slate-200/80 py-4 text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between gap-2">
          <span>CRAU · Customer Requirement Analysis Using User Generated Content</span>
          <span>Department of Computer Science &amp; Engineering · ABES Engineering College</span>
        </footer>
      </main>
    </div>
  );
}
