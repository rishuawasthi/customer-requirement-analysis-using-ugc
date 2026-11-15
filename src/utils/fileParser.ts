import * as XLSX from 'xlsx';
import { FeedbackRecord } from '../types';

export interface ParseResult {
  records: FeedbackRecord[];
  allColumns: string[];
  detectedTextColumn: string;
  metadataColumns: string[];
  warnings: string[];
  error?: string;
  uniqueReviewsCount: number;
  uniqueSentencesCount: number;
}

// Robust CSV parser supporting quotes, commas, and multiline values
export function parseCSV(csvText: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(col => col.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(col => col.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  const data: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? '').trim();
    });
    data.push(record);
  }

  return data;
}

export function processRawRows(rawObjects: Record<string, unknown>[]): ParseResult {
  const warnings: string[] = [];

  if (!rawObjects || rawObjects.length === 0) {
    return {
      records: [],
      allColumns: [],
      detectedTextColumn: '',
      metadataColumns: [],
      warnings: ['The file is empty or does not contain data rows.'],
      error: 'Empty dataset. No records found.',
      uniqueReviewsCount: 0,
      uniqueSentencesCount: 0
    };
  }

  // Extract all columns
  const firstRow = rawObjects[0];
  const allColumns = Object.keys(firstRow).filter(col => col && col.trim() !== '');

  if (allColumns.length === 0) {
    return {
      records: [],
      allColumns: [],
      detectedTextColumn: '',
      metadataColumns: [],
      warnings: ['No valid column headers found in dataset.'],
      error: 'Could not detect column headers in the provided file.',
      uniqueReviewsCount: 0,
      uniqueSentencesCount: 0
    };
  }

  // Find text column priority list
  const textKeywords = ['sentence_text', 'text', 'sentence', 'review', 'feedback', 'comment', 'content', 'utterance', 'body', 'message'];
  let detectedTextColumn = '';

  for (const kw of textKeywords) {
    const match = allColumns.find(c => c.toLowerCase() === kw);
    if (match) {
      detectedTextColumn = match;
      break;
    }
  }

  // If not exact match, look for column containing keyword
  if (!detectedTextColumn) {
    for (const kw of textKeywords) {
      const match = allColumns.find(c => c.toLowerCase().includes(kw));
      if (match) {
        detectedTextColumn = match;
        break;
      }
    }
  }

  // Fallback: search for column with highest average length
  if (!detectedTextColumn) {
    let maxLength = -1;
    for (const col of allColumns) {
      let totalLen = 0;
      let count = 0;
      for (const row of rawObjects.slice(0, 10)) {
        const val = String(row[col] ?? '');
        totalLen += val.length;
        count++;
      }
      const avg = count > 0 ? totalLen / count : 0;
      if (avg > maxLength && avg > 10) {
        maxLength = avg;
        detectedTextColumn = col;
      }
    }
  }

  if (!detectedTextColumn) {
    const nonId = allColumns.find(c => !c.toLowerCase().includes('id'));
    detectedTextColumn = nonId || allColumns[0];
    warnings.push(`Could not automatically recognize a 'text' or 'sentence' column. Using '${detectedTextColumn}' as the feedback text column.`);
  }

  const metadataColumns = allColumns.filter(c => c !== detectedTextColumn);

  // Identify distinct ID columns
  const sentenceIdCol = allColumns.find(c => c.toLowerCase() === 'sentence_id' || c.toLowerCase() === 'sentenceid');
  const reviewIdCol = allColumns.find(c => c.toLowerCase() === 'review_id' || c.toLowerCase() === 'reviewid');
  const genericIdCol = allColumns.find(c => c.toLowerCase() === 'id');
  const domainCol = allColumns.find(c => c.toLowerCase() === 'domain');

  const records: FeedbackRecord[] = [];
  const uniqueReviews = new Set<string>();
  const uniqueSentences = new Set<string>();

  rawObjects.forEach((row, idx) => {
    const rawText = String(row[detectedTextColumn] ?? '').trim();
    if (!rawText) return; // skip empty text rows

    // Determine row primary identifier: sentence_id > generic id > review_id + idx > default
    let rowId = '';
    if (sentenceIdCol && row[sentenceIdCol]) {
      rowId = String(row[sentenceIdCol]).trim();
    } else if (genericIdCol && row[genericIdCol]) {
      rowId = String(row[genericIdCol]).trim();
    } else if (reviewIdCol && row[reviewIdCol]) {
      rowId = `${String(row[reviewIdCol]).trim()}_${idx + 1}`;
    } else {
      rowId = `REC_${String(idx + 1).padStart(4, '0')}`;
    }

    const reviewId = reviewIdCol && row[reviewIdCol] ? String(row[reviewIdCol]).trim() : undefined;
    const sentenceId = sentenceIdCol && row[sentenceIdCol] ? String(row[sentenceIdCol]).trim() : rowId;
    const domain = domainCol && row[domainCol] ? String(row[domainCol]).trim() : undefined;

    if (reviewId) uniqueReviews.add(reviewId);
    if (sentenceId) uniqueSentences.add(sentenceId);

    const originalMetadata: Record<string, string> = {};
    for (const col of metadataColumns) {
      if (row[col] !== undefined && row[col] !== null) {
        originalMetadata[col] = String(row[col]).trim();
      }
    }

    records.push({
      id: rowId,
      text: rawText,
      originalMetadata,
      reviewId,
      sentenceId,
      domain
    });
  });

  if (records.length === 0) {
    return {
      records: [],
      allColumns,
      detectedTextColumn,
      metadataColumns,
      warnings: ['No valid text feedback records could be extracted from the specified column.'],
      error: `Column '${detectedTextColumn}' contained no valid text entries.`,
      uniqueReviewsCount: 0,
      uniqueSentencesCount: 0
    };
  }

  return {
    records,
    allColumns,
    detectedTextColumn,
    metadataColumns,
    warnings,
    uniqueReviewsCount: uniqueReviews.size > 0 ? uniqueReviews.size : records.length,
    uniqueSentencesCount: uniqueSentences.size > 0 ? uniqueSentences.size : records.length
  };
}

export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'xlsx' || extension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          records: [],
          allColumns: [],
          detectedTextColumn: '',
          metadataColumns: [],
          warnings: ['The Excel workbook has no sheets.'],
          error: 'Empty workbook. No worksheets found.',
          uniqueReviewsCount: 0,
          uniqueSentencesCount: 0
        };
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      return processRawRows(rawRows);
    } else if (extension === 'csv' || extension === 'txt') {
      const text = await file.text();
      const rawRows = parseCSV(text);
      return processRawRows(rawRows);
    } else {
      return {
        records: [],
        allColumns: [],
        detectedTextColumn: '',
        metadataColumns: [],
        warnings: [`Unsupported file format .${extension}`],
        error: `Please upload a .csv or .xlsx / .xls file. Format '.${extension}' is not supported.`,
        uniqueReviewsCount: 0,
        uniqueSentencesCount: 0
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      records: [],
      allColumns: [],
      detectedTextColumn: '',
      metadataColumns: [],
      warnings: ['File reading error occurred.'],
      error: `Failed to read file: ${message}`,
      uniqueReviewsCount: 0,
      uniqueSentencesCount: 0
    };
  }
}
