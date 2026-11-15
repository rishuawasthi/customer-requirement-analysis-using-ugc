/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
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
  } catch {
    return {};
  }
}

function persistAnnotation(source: string, recordId: string, annotations: FeedbackRecord['humanAnnotations']) {
  try {
    const key = ANNOTATION_STORAGE_PREFIX + source.replace(/[^a-zA-Z0-9_-]/g, '_');
    const stored = getStoredAnnotations(source);
    if (annotations) {
      stored[recordId] = annotations;
    } else {
      delete stored[recordId];
    }
    localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // safe fallback if storage is disabled
  }
}

export default function App() {
  // Section 1: Implementation is the default landing page
  const [activeTab, setActiveTab] = useState<ActiveTab>('implementation');
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [detectedTextColumn, setDetectedTextColumn] = useState<string>('text');
  const [metadataColumns, setMetadataColumns] = useState<string[]>([]);
  const [sourceName, setSourceName] = useState<string>('semeval2015_research_ready.csv');
  const [uniqueReviewsCount, setUniqueReviewsCount] = useState<number>(45);
  const [uniqueSentencesCount, setUniqueSentencesCount] = useState<number>(45);
  const [isAutoLoading, setIsAutoLoading] = useState(true);

  // Automatically load the curated presentation SemEval dataset on initial launch
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch('/semeval2015_research_ready.csv');
        if (res.ok) {
          const csvText = await res.text();
          const rows = parseCSV(csvText);
          const result = processRawRows(rows);
          if (result.records.length > 0) {
            const initialSource = 'semeval2015_research_ready.csv (Curated 45-Set)';
            const savedAnnotations = getStoredAnnotations(initialSource);

            // Re-attach saved human annotations across browser refreshes
            const hydrated = result.records.map(r => {
              if (savedAnnotations[r.id]) {
                return {
                  ...r,
                  humanAnnotations: savedAnnotations[r.id],
                  isUserAnnotated: true
                };
              }
              return r;
            });

            setRecords(hydrated);
            setAllColumns(result.allColumns);
            setDetectedTextColumn(result.detectedTextColumn);
            setMetadataColumns(result.metadataColumns);
            setSourceName(initialSource);
            setUniqueReviewsCount(result.uniqueReviewsCount || result.records.length);
            setUniqueSentencesCount(result.uniqueSentencesCount || result.records.length);
          }
        }
      } catch (err) {
        console.warn('Initial dataset fetch error:', err);
      } finally {
        setIsAutoLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Update a single record (e.g. analyzed, annotated by human, or adjudicated)
  const handleUpdateRecord = (updatedRecord: FeedbackRecord) => {
    if (updatedRecord.humanAnnotations) {
      persistAnnotation(sourceName, updatedRecord.id, updatedRecord.humanAnnotations);
    }
    setRecords(prev =>
      prev.map(r => (r.id === updatedRecord.id ? updatedRecord : r))
    );
  };

  // Batch classify all loaded records using the transparent rule-based heuristic
  const handleBatchClassifyAll = () => {
    setRecords(prev =>
      prev.map(r => {
        const result = classifyFeedback(r.text);
        return {
          ...r,
          predictedCategory: result.category,
          explanation: result.explanation,
          matchedCues: result.matchedCues,
          isUserAnnotated: r.isUserAnnotated || false
        };
      })
    );
  };

  // Switch between curated (45) and full (4,161) datasets seamlessly
  const handleQuickSwitchDataset = async (preset: 'curated' | 'full') => {
    setIsAutoLoading(true);
    const filename = preset === 'curated'
      ? 'semeval2015_research_ready.csv'
      : 'semeval2015_research_ready_full.csv';
    try {
      const res = await fetch(`/${filename}`);
      if (res.ok) {
        const csvText = await res.text();
        const rows = parseCSV(csvText);
        const result = processRawRows(rows);
        if (result.records.length > 0) {
          const savedAnnotations = getStoredAnnotations(filename);

          const hydrated = result.records.map(r => {
            if (savedAnnotations[r.id]) {
              return {
                ...r,
                humanAnnotations: savedAnnotations[r.id],
                isUserAnnotated: true
              };
            }
            return r;
          });

          setRecords(hydrated);
          setAllColumns(result.allColumns);
          setDetectedTextColumn(result.detectedTextColumn);
          setMetadataColumns(result.metadataColumns);
          setSourceName(filename);
          setUniqueReviewsCount(result.uniqueReviewsCount || result.records.length);
          setUniqueSentencesCount(result.uniqueSentencesCount || result.records.length);
        }
      }
    } catch (err) {
      console.warn('Dataset switch error:', err);
    } finally {
      setIsAutoLoading(false);
    }
  };

  // Replace records when custom file is loaded
  const handleDatasetLoaded = (
    newRecords: FeedbackRecord[],
    newAllCols: string[],
    newDetectedTextCol: string,
    newMetaCols: string[],
    newSource: string,
    newUniqueReviews?: number,
    newUniqueSentences?: number
  ) => {
    const savedAnnotations = getStoredAnnotations(newSource);
    const hydrated = newRecords.map(r => {
      if (savedAnnotations[r.id]) {
        return {
          ...r,
          humanAnnotations: savedAnnotations[r.id],
          isUserAnnotated: true
        };
      }
      return r;
    });

    setRecords(hydrated);
    setAllColumns(newAllCols);
    setDetectedTextColumn(newDetectedTextCol);
    setMetadataColumns(newMetaCols);
    setSourceName(newSource);
    setUniqueReviewsCount(newUniqueReviews || newRecords.length);
    setUniqueSentencesCount(newUniqueSentences || newRecords.length);
  };

  const classifiedCount = records.filter(r => r.predictedCategory !== undefined).length;
  const annotatedPairCount = records.filter(
    r => r.humanAnnotations?.annotatorA !== undefined && r.humanAnnotations?.annotatorB !== undefined
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-slate-200 selection:text-slate-900">
      {/* 3-Section Restructured Academic Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
        classifiedCount={classifiedCount}
        annotatedCount={annotatedPairCount}
        sourceName={sourceName}
        onQuickSwitchDataset={handleQuickSwitchDataset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isAutoLoading && records.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
            Loading SemEval dataset...
          </div>
        ) : (
          <>
            {/* SECTION 1: IMPLEMENTATION (Default Landing Page) */}
            {activeTab === 'implementation' && (
              <ImplementationSection
                records={records}
                onUpdateRecord={handleUpdateRecord}
                onBatchClassifyAll={handleBatchClassifyAll}
                sourceName={sourceName}
                onSelectPresetDataset={handleQuickSwitchDataset}
                onCustomFileLoaded={handleDatasetLoaded}
              />
            )}

            {/* SECTION 2: RESEARCH */}
            {activeTab === 'research' && (
              <ResearchSection
                records={records}
                onUpdateRecord={handleUpdateRecord}
                sourceName={sourceName}
              />
            )}

            {/* SECTION 3: DOCUMENTATION */}
            {activeTab === 'documentation' && <DocumentationSection />}
          </>
        )}
      </main>

      {/* Clean Academic Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Customer Requirement Analysis Using User Generated Content</span>
          <span className="text-slate-400">
            Department of Computer Science &amp; Engineering • ABES Engineering College
          </span>
        </div>
      </footer>
    </div>
  );
}
