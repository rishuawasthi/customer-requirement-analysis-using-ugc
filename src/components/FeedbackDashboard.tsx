import React, { useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownToLine, Bell, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleHelp, Database, Eye, FileText, Filter,
  Layers3, Lightbulb, List, MessageCircle, Search, Settings, Sparkles,
  Target, UploadCloud, X
} from 'lucide-react';
import { FeedbackRecord, RequirementCategory } from '../types';
import { parseFile } from '../utils/fileParser';
import { exportAnalyzedRecordsToCSV } from '../utils/exportCsv';

interface DashboardProps {
  records: FeedbackRecord[];
  sourceName: string;
  onUpdateRecords: (records: FeedbackRecord[]) => void;
  onDatasetLoaded: (
    records: FeedbackRecord[], allColumns: string[], detectedTextColumn: string,
    metadataColumns: string[], sourceName: string, uniqueReviews?: number, uniqueSentences?: number
  ) => void;
  onAnalyzeAll: () => void;
  onOpenSentenceAnalysis: () => void;
}

const CATEGORIES: { key: RequirementCategory; label: string; color: string; soft: string; icon: React.ElementType }[] = [
  { key: 'EXPLICIT_NEED', label: 'Explicit Need', color: '#16a34a', soft: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Target },
  { key: 'IMPLICIT_NEED', label: 'Implicit Need', color: '#eaa400', soft: 'bg-amber-50 text-amber-800 border-amber-100', icon: Lightbulb },
  { key: 'PAIN_POINT', label: 'Pain Point', color: '#ef4444', soft: 'bg-rose-50 text-rose-700 border-rose-100', icon: AlertTriangle },
  { key: 'NON_ACTIONABLE', label: 'Non-actionable', color: '#8b5cf6', soft: 'bg-violet-50 text-violet-700 border-violet-100', icon: MessageCircle }
];

const getCategory = (r: FeedbackRecord): RequirementCategory | undefined =>
  r.humanAnnotations?.adjudicated || r.predictedCategory || r.geminiResult?.requirement_category;

export const FeedbackDashboard: React.FC<DashboardProps> = ({
  records, sourceName, onUpdateRecords, onDatasetLoaded, onAnalyzeAll, onOpenSentenceAnalysis
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState<FeedbackRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const pageSize = 8;

  const counts = useMemo(() => {
    const base: Record<RequirementCategory, number> = {
      EXPLICIT_NEED: 0, IMPLICIT_NEED: 0, PAIN_POINT: 0, NON_ACTIONABLE: 0
    };
    records.forEach(r => { const category = getCategory(r); if (category) base[category] += 1; });
    return base;
  }, [records]);

  const classified = CATEGORIES.reduce((sum, c) => sum + counts[c.key], 0);
  const filtered = useMemo(() => records.filter(r => {
    const q = search.trim().toLowerCase();
    const matches = !q || r.text.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    const category = getCategory(r);
    return matches && (filter === 'ALL' || (filter === 'UNCLASSIFIED' ? !category : category === filter));
  }), [records, search, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pct = (n: number) => records.length ? (n / records.length * 100) : 0;
  const donut = CATEGORIES.reduce((acc, c) => {
    const start = acc.end;
    const end = start + pct(counts[c.key]);
    acc.parts.push(`${c.color} ${start}% ${end}%`);
    acc.end = end;
    return acc;
  }, { end: 0, parts: [] as string[] });

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const parsed = await parseFile(file);
      if (parsed.error) throw new Error(parsed.error);
      onDatasetLoaded(parsed.records, parsed.allColumns, parsed.detectedTextColumn,
        parsed.metadataColumns, file.name, parsed.uniqueReviewsCount, parsed.uniqueSentencesCount);
      setPage(1); setFilter('ALL'); setSearch('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to read this dataset.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const exportData = () => {
    try {
      exportAnalyzedRecordsToCSV(filtered, { fileName: 'CRAU_feedback_analysis.csv' });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Nothing to export.');
    }
  };

  const trendValues = CATEGORIES.map(c => counts[c.key]);
  const max = Math.max(1, ...trendValues);
  const chartPoints = trendValues.map((v, i) => `${24 + i * 82},${116 - (v / max) * 88}`).join(' ');

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><span>Workspace</span><span>/</span><span className="text-blue-700 font-semibold">Feedback Analysis</span></div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900">Feedback Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">Analyze customer feedback, classify requirements, and discover actionable insights.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm min-w-0">
          <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={20}/></span>
          <div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate">Dataset: {sourceName || 'No dataset selected'}</p><p className="text-[11px] text-slate-500 mt-1">{records.length.toLocaleString()} records <span className="mx-1">·</span> {classified.toLocaleString()} classified</p></div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="grid lg:grid-cols-[1fr_auto_1.15fr] gap-4 items-center">
          <button type="button" onClick={() => fileRef.current?.click()} className="group min-h-[112px] border-2 border-dashed border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl flex flex-col items-center justify-center gap-2 transition">
            <UploadCloud size={30} className="text-blue-500"/>
            <span className="text-sm font-semibold text-slate-800">{uploading ? 'Loading dataset…' : 'Upload Feedback Dataset'}</span>
            <span className="text-xs text-slate-500">Drag and drop is supported by your browser file picker · .xlsx, .csv</span>
            <span className="text-xs text-blue-700 font-semibold">Choose file</span>
          </button>
          <div className="hidden lg:flex items-center justify-center"><span className="rounded-full bg-slate-100 text-slate-500 text-xs font-semibold px-3 py-2">OR</span></div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 min-w-0"><label className="block text-xs font-semibold text-slate-700 mb-2"><Database size={14} className="inline mr-2 text-blue-600"/>Current dataset</label><div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 truncate">{sourceName || 'No dataset loaded'}</div><p className="text-[11px] text-slate-400 mt-2">Choose a dataset from the header controls or upload a new file.</p></div>
            <button type="button" onClick={onAnalyzeAll} disabled={!records.length} className="h-11 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-200 whitespace-nowrap"><Sparkles size={16}/> Analyze Dataset</button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleUpload(e.target.files?.[0])}/>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm"><div className="flex items-center justify-between"><Layers3 className="text-blue-600" size={23}/><span className="text-[10px] uppercase tracking-wide text-blue-600 font-bold">Dataset</span></div><p className="text-xs font-semibold text-slate-600 mt-3">Total Feedback</p><p className="text-2xl font-bold text-slate-900 mt-1">{records.length.toLocaleString()}</p><p className="text-[11px] text-slate-500 mt-1">Loaded records</p></div>
        {CATEGORIES.map(c => { const Icon = c.icon; return <div key={c.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><Icon size={23} style={{color:c.color}}/><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Category</span></div><p className="text-xs font-semibold text-slate-600 mt-3">{c.label}</p><p className="text-2xl font-bold text-slate-900 mt-1">{counts[c.key].toLocaleString()}</p><p className="text-[11px] text-slate-500 mt-1">{pct(counts[c.key]).toFixed(1)}% of all records</p></div>; })}
      </section>

      <section className="grid xl:grid-cols-[1fr_1.12fr_0.78fr] gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Classification Distribution</h2><span className="text-[10px] text-slate-400">Current dataset</span></div>
          {classified ? <div className="flex flex-col sm:flex-row items-center gap-5 mt-5">
            <div className="relative w-40 h-40 rounded-full shrink-0" style={{background: `conic-gradient(${donut.parts.join(', ')})`}}><div className="absolute inset-[25px] rounded-full bg-white flex flex-col items-center justify-center"><strong className="text-xl text-slate-900">{classified.toLocaleString()}</strong><span className="text-[10px] text-slate-500">Classified</span></div></div>
            <div className="space-y-3 w-full">{CATEGORIES.map(c=><div key={c.key} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 text-slate-600"><i className="w-2.5 h-2.5 rounded-sm" style={{background:c.color}}/>{c.label}</span><strong className="text-slate-800 tabular-nums">{counts[c.key].toLocaleString()} <span className="text-slate-400 font-normal">({(pct(counts[c.key])).toFixed(1)}%)</span></strong></div>)}</div>
          </div> : <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400"><Activity size={28}/><p className="text-sm font-medium mt-2">No classification data yet</p><p className="text-xs mt-1">Run analysis to populate this chart.</p></div>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Category Overview</h2><span className="text-[10px] text-slate-400">By category</span></div>
          {classified ? <><div className="mt-5 h-36"><svg viewBox="0 0 300 140" className="w-full h-full" role="img" aria-label="Bar chart of category counts"><line x1="18" y1="118" x2="286" y2="118" stroke="#e2e8f0"/>{CATEGORIES.map((c,i)=>{const h=counts[c.key]/max*92;return <g key={c.key}><rect x={34+i*66} y={118-h} width="34" height={h} rx="5" fill={c.color} opacity=".88"/><text x={51+i*66} y="133" textAnchor="middle" fontSize="8" fill="#64748b">{['Explicit','Implicit','Pain','Other'][i]}</text></g>})}</svg></div><div className="grid grid-cols-2 gap-2 mt-2">{CATEGORIES.map(c=><div key={c.key} className="flex items-center gap-2 text-[11px] text-slate-500"><span className="w-2 h-2 rounded-full" style={{background:c.color}}/>{c.label}</div>)}</div></> : <div className="h-44 flex items-center justify-center text-sm text-slate-400">Charts appear after classification.</div>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2"><Sparkles size={18} className="text-blue-600"/><h2 className="font-bold text-slate-900">Quick Insights</h2></div>
          <div className="space-y-4 mt-5">{classified ? CATEGORIES.slice().sort((a,b)=>counts[b.key]-counts[a.key]).map(c=><div key={c.key} className="flex items-start gap-2.5"><CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0"/><p className="text-xs leading-relaxed text-slate-600"><strong className="text-slate-800">{pct(counts[c.key]).toFixed(1)}%</strong> of loaded records are <strong>{c.label.toLowerCase()}</strong>.</p></div>) : <p className="text-xs text-slate-500 leading-relaxed">Insights will be generated from actual classification results. No sample statistics are displayed.</p>}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-2"><CircleHelp size={14}/> {records.length-classified} records are not yet classified.</div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_250px] gap-4 items-start">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Analyzed Feedback <span className="text-slate-400 font-medium">({filtered.length.toLocaleString()})</span></h2><p className="text-[11px] text-slate-400 mt-1">Predictions and human-adjudicated labels are shown separately in the record details.</p></div>
              <div className="flex flex-wrap gap-2"><div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search feedback…" className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-400"/></div><button onClick={()=>setShowFilters(!showFilters)} className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2 hover:bg-slate-50"><Filter size={14}/> Filters</button><button onClick={exportData} disabled={!filtered.length} className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 hover:bg-slate-50 disabled:opacity-40"><ArrowDownToLine size={14}/> Export</button></div>
            </div>
            {showFilters && <div className="mt-3 flex flex-wrap gap-2 items-center"><label className="text-xs text-slate-500">Category</label><select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1)}} className="h-9 rounded-lg border border-slate-200 px-3 text-xs bg-white"><option value="ALL">All records</option><option value="UNCLASSIFIED">Unclassified</option>{CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select><button onClick={()=>{setFilter('ALL');setSearch('');setPage(1)}} className="text-xs text-blue-600 font-semibold">Clear filters</button></div>}
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left min-w-[650px]"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 w-12">#</th><th className="px-3 py-3">Feedback text</th><th className="px-3 py-3">Predicted category</th><th className="px-3 py-3">Human label</th><th className="px-4 py-3 text-right">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((r,i)=>{const cat=getCategory(r);const meta=CATEGORIES.find(c=>c.key===cat);return <tr key={r.id} className="hover:bg-blue-50/40"><td className="px-5 py-3 text-xs text-slate-400">{(page-1)*pageSize+i+1}</td><td className="px-3 py-3 max-w-[430px]"><p className="text-xs text-slate-700 line-clamp-2">{r.text}</p><p className="text-[10px] text-slate-400 mt-1">{r.domain || 'Dataset record'} · {r.id.slice(0,18)}</p></td><td className="px-3 py-3">{meta?<span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-semibold ${meta.soft}`}>{meta.label}</span>:<span className="text-[10px] text-slate-400">Not classified</span>}</td><td className="px-3 py-3 text-xs text-slate-600">{r.humanAnnotations?.adjudicated ? <span className="text-emerald-700 font-semibold">Adjudicated</span> : <span className="text-slate-400">—</span>}</td><td className="px-4 py-3 text-right"><button onClick={()=>setShowDetails(r)} className="p-2 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600" aria-label="View feedback details"><Eye size={16}/></button></td></tr>})}{!visible.length&&<tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">No feedback matches your search or filter.</td></tr>}</tbody></table></div>
          <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3"><span className="text-[11px] text-slate-500">Showing {filtered.length ? (page-1)*pageSize+1 : 0}–{Math.min(page*pageSize,filtered.length)} of {filtered.length.toLocaleString()}</span><div className="flex items-center gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30"><ChevronLeft size={15}/></button><span className="text-xs text-slate-600">{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30"><ChevronRight size={15}/></button></div></div>
        </div>
        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"><div className="flex items-center gap-2"><Sparkles size={18} className="text-blue-600"/><h2 className="font-bold text-slate-900">Actions</h2></div><div className="space-y-2 mt-5"><button onClick={exportData} disabled={!filtered.length} className="w-full h-10 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700 flex items-center gap-2 px-3 disabled:opacity-40"><ArrowDownToLine size={15}/> Export classified data</button><button onClick={onOpenSentenceAnalysis} className="w-full h-10 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700 flex items-center gap-2 px-3"><List size={15}/> Open sentence analysis</button><button onClick={onAnalyzeAll} disabled={!records.length} className="w-full h-10 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700 flex items-center gap-2 px-3 disabled:opacity-40"><Activity size={15}/> Re-run analysis</button></div><div className="mt-5 pt-4 border-t border-slate-100"><p className="text-[11px] text-slate-500 leading-relaxed">Category totals use available human-adjudicated labels first, then rule-based or model predictions. They are not benchmark evaluation scores.</p></div></aside>
      </section>

      {showDetails && <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowDetails(null)}><div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-blue-600 font-semibold">FEEDBACK RECORD</p><h3 className="text-lg font-bold text-slate-900 mt-1">Record details</h3></div><button onClick={()=>setShowDetails(null)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18}/></button></div><p className="text-sm text-slate-700 leading-relaxed mt-5">{showDetails.text}</p><div className="grid grid-cols-2 gap-3 mt-5"><div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase">Predicted category</p><p className="text-sm font-semibold text-slate-800 mt-1">{CATEGORIES.find(c=>c.key===getCategory(showDetails))?.label || 'Not classified'}</p></div><div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase">Adjudicated label</p><p className="text-sm font-semibold text-slate-800 mt-1">{showDetails.humanAnnotations?.adjudicated || 'Not adjudicated'}</p></div></div><p className="text-xs text-slate-500 mt-4">Record ID: {showDetails.id}</p></div></div>}
    </div>
  );
};
