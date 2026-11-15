import React from 'react';
import {
  Activity, Bell, BookOpen, Database, FileText, LayoutDashboard, ListChecks, Settings, Sparkles
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'implementation' | 'annotation' | 'research' | 'documentation';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  recordCount: number;
  classifiedCount: number;
  annotatedCount?: number;
  sourceName?: string;
  onQuickSwitchDataset?: (preset: 'curated' | 'full') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, setActiveTab, recordCount, classifiedCount, annotatedCount = 0,
  sourceName = '', onQuickSwitchDataset
}) => {
  const links = [
    { id: 'dashboard' as ActiveTab, label: 'Feedback Analysis', icon: LayoutDashboard },
    { id: 'implementation' as ActiveTab, label: 'Sentence Analysis', icon: ListChecks },
    { id: 'annotation' as ActiveTab, label: 'Dataset & Annotation', icon: Database },
    { id: 'research' as ActiveTab, label: 'Evaluation & Benchmark', icon: Activity },
    { id: 'documentation' as ActiveTab, label: 'Insights & Reports', icon: FileText }
  ];
  const isFull = sourceName.toLowerCase().includes('full') || recordCount > 500;

  return <>
    <header className="fixed top-0 inset-x-0 z-40 h-[70px] bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-5 sm:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200"><LayersBrand/></div>
        <div className="min-w-0"><div className="text-xl font-extrabold tracking-tight text-slate-950">CRAU</div><div className="text-[11px] text-slate-500 truncate hidden sm:block">Customer Requirement Analysis Using User Generated Content</div></div>
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        {onQuickSwitchDataset && <div className="hidden md:flex items-center rounded-lg bg-slate-100 p-1 gap-1"><button onClick={()=>onQuickSwitchDataset('curated')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold ${!isFull?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>Curated 45</button><button onClick={()=>onQuickSwitchDataset('full')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold ${isFull?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>Full 4,161</button></div>}
        <button className="hidden sm:grid w-9 h-9 place-items-center rounded-full hover:bg-slate-100 text-slate-600" aria-label="Notifications"><Bell size={19}/></button>
        <button className="hidden sm:grid w-9 h-9 place-items-center rounded-full hover:bg-slate-100 text-slate-600" aria-label="Settings"><Settings size={19}/></button>
        <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-blue-600 text-white grid place-items-center font-semibold">R</div><span className="hidden sm:block text-xs font-semibold text-slate-800">Research Workspace</span></div>
      </div>
    </header>
    <aside className="fixed z-30 top-[70px] bottom-0 left-0 hidden lg:flex w-[248px] flex-col bg-white border-r border-slate-200 px-3 py-6">
      <p className="px-3 mb-3 text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">Workspace</p>
      <nav className="space-y-1">{links.map(link=>{const Icon=link.icon;const active=activeTab===link.id;return <button key={link.id} onClick={()=>setActiveTab(link.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-[13px] font-semibold transition ${active?'bg-blue-50 text-blue-700 shadow-sm':'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={18} className={active?'text-blue-600':'text-slate-400'}/>{link.label}</button>})}</nav>
      <div className="mt-auto rounded-xl bg-slate-50 border border-slate-100 p-4"><div className="flex items-center gap-2 text-slate-700"><Sparkles size={16} className="text-blue-600"/><span className="text-xs font-bold">Workspace status</span></div><div className="mt-3 flex justify-between text-[11px] text-slate-500"><span>Records</span><strong className="text-slate-700">{recordCount.toLocaleString()}</strong></div><div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>Classified</span><strong className="text-slate-700">{classifiedCount.toLocaleString()}</strong></div><div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>Dual annotated</span><strong className="text-slate-700">{annotatedCount.toLocaleString()}</strong></div></div>
    </aside>
    <div className="lg:hidden fixed z-30 bottom-0 inset-x-0 bg-white border-t border-slate-200 px-1 py-2 flex justify-around">{links.slice(0,4).map(link=>{const Icon=link.icon;return <button key={link.id} onClick={()=>setActiveTab(link.id)} className={`flex flex-col items-center gap-1 px-2 py-1 text-[9px] font-semibold ${activeTab===link.id?'text-blue-600':'text-slate-500'}`}><Icon size={18}/>{link.label.split(' ')[0]}</button>})}</div>
  </>;
};

const LayersBrand = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>;
