/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { OverviewSection } from './components/OverviewSection';
import { FeedbackAnalysisSection } from './components/FeedbackAnalysisSection';
import { HumanAnnotationSection } from './components/HumanAnnotationSection';
import { EvaluationBenchmarkSection } from './components/EvaluationBenchmarkSection';
import { DatasetSection } from './components/DatasetSection';
import { AboutSection } from './components/AboutSection';
import { FeedbackRecord } from './types';
import { parseCSV, processRawRows } from './utils/fileParser';
import { classifyFeedback } from './utils/classifier';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
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
            setRecords(result.records);
            setAllColumns(result.allColumns);
            setDetectedTextColumn(result.detectedTextColumn);
            setMetadataColumns(result.metadataColumns);
            setSourceName('semeval2015_research_ready.csv (Curated 45-Set)');
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

  // Replace records when a new dataset or preset is loaded
  const handleDatasetLoaded = (
    newRecords: FeedbackRecord[],
    newAllCols: string[],
    newDetectedTextCol: string,
    newMetaCols: string[],
    newSource: string,
    newUniqueReviews?: number,
    newUniqueSentences?: number
  ) => {
    setRecords(newRecords);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Clean Academic Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
        classifiedCount={classifiedCount}
        annotatedCount={annotatedPairCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isAutoLoading && records.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
            Loading SemEval dataset...
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewSection
                records={records}
                sourceName={sourceName}
                detectedTextColumn={detectedTextColumn}
                uniqueReviewsCount={uniqueReviewsCount}
                uniqueSentencesCount={uniqueSentencesCount}
                onGoToAnalysis={() => setActiveTab('analysis')}
                onGoToDataset={() => setActiveTab('dataset')}
                onGoToAnnotation={() => setActiveTab('annotation')}
                onBatchClassify={handleBatchClassifyAll}
              />
            )}

            {activeTab === 'analysis' && (
              <FeedbackAnalysisSection
                records={records}
                onUpdateRecord={handleUpdateRecord}
                onBatchClassifyAll={handleBatchClassifyAll}
                sourceName={sourceName}
              />
            )}

            {activeTab === 'annotation' && (
              <HumanAnnotationSection
                records={records}
                onUpdateRecord={handleUpdateRecord}
                sourceName={sourceName}
              />
            )}

            {activeTab === 'evaluation' && (
              <EvaluationBenchmarkSection
                records={records}
                sourceName={sourceName}
              />
            )}

            {activeTab === 'dataset' && (
              <DatasetSection
                records={records}
                allColumns={allColumns}
                detectedTextColumn={detectedTextColumn}
                metadataColumns={metadataColumns}
                sourceName={sourceName}
                uniqueReviewsCount={uniqueReviewsCount}
                uniqueSentencesCount={uniqueSentencesCount}
                onDatasetLoaded={handleDatasetLoaded}
              />
            )}

            {activeTab === 'about' && <AboutSection />}
          </>
        )}
      </main>

      {/* Clean Academic Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Customer Requirement Analysis Using User Generated Content</span>
          <span className="text-slate-400">
            College Academic Research Project Prototype • ABES Engineering College
          </span>
        </div>
      </footer>
    </div>
  );
}
