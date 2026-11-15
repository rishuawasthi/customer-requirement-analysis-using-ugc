import React from 'react';
import {
  FileSearch,
  BookOpen,
  FileText
} from 'lucide-react';

export type ActiveTab = 'implementation' | 'research' | 'documentation';

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
  activeTab,
  setActiveTab,
  recordCount,
  classifiedCount,
  annotatedCount = 0,
  sourceName = '',
  onQuickSwitchDataset
}) => {
  const tabs = [
    { id: 'implementation' as ActiveTab, label: 'Implementation', icon: FileSearch },
    { id: 'research' as ActiveTab, label: 'Research', icon: BookOpen, badge: annotatedCount > 0 ? `${annotatedCount} annotated` : undefined },
    { id: 'documentation' as ActiveTab, label: 'Documentation', icon: FileText }
  ];

  const isFullActive = sourceName.includes('full') || recordCount > 500;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Project Title and Academic Identifier */}
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-semibold text-xs tracking-wider">
              UGC
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 tracking-tight leading-tight">
                Customer Requirement Analysis
              </div>
              <div className="text-[11px] text-slate-500 hidden sm:block">
                SemEval-2015 Benchmark • Academic Research System
              </div>
            </div>
          </div>

          {/* Global Dataset Toolbar & Navigation */}
          <div className="flex items-center space-x-3">
            {onQuickSwitchDataset && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => onQuickSwitchDataset('curated')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    !isFullActive
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Switch to Curated 45-Record Presentation Dataset"
                >
                  Curated (45)
                </button>
                <button
                  type="button"
                  onClick={() => onQuickSwitchDataset('full')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    isFullActive
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Switch to Full 4,161-Row SemEval-2015 Benchmark"
                >
                  Full (4,161)
                </button>
              </div>
            )}

            <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 pl-2 border-l border-slate-200 font-mono text-[11px]">
              <span>{recordCount.toLocaleString()} rows</span>
            </div>
          </div>
        </div>

        {/* 3 Main Target Tabs */}
        <nav className="flex space-x-2 border-t border-slate-100 py-1 -mb-px">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium rounded transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded font-mono ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
