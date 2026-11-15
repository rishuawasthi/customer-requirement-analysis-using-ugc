import React from 'react';
import {
  LayoutDashboard,
  FileSearch,
  Users,
  BarChart3,
  Database,
  BookOpen,
  CheckCircle2
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'analysis'
  | 'annotation'
  | 'evaluation'
  | 'dataset'
  | 'about';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  recordCount: number;
  classifiedCount: number;
  annotatedCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  recordCount,
  classifiedCount,
  annotatedCount = 0
}) => {
  const tabs = [
    { id: 'overview' as ActiveTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'analysis' as ActiveTab, label: 'Heuristic Analysis', icon: FileSearch },
    { id: 'annotation' as ActiveTab, label: 'Human Annotation & Alpha', icon: Users, badge: annotatedCount > 0 ? annotatedCount : undefined },
    { id: 'evaluation' as ActiveTab, label: 'Evaluation & Benchmark', icon: BarChart3 },
    { id: 'dataset' as ActiveTab, label: 'Dataset Switcher', icon: Database, badge: recordCount > 0 ? recordCount : undefined },
    { id: 'about' as ActiveTab, label: 'About & Taxonomy', icon: BookOpen }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Project Title and Academic Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-blue-700 text-white flex items-center justify-center font-semibold text-lg tracking-tight shadow-xs">
              CR
            </div>
            <div>
              <div className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                Customer Requirement Analysis
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">
                Academic Research Prototype • User Generated Content (UGC)
              </div>
            </div>
          </div>

          {/* Quick Stats Indicator */}
          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            <span className="font-medium text-slate-800">Records:</span>
            <span>{recordCount.toLocaleString()}</span>
            <span className="text-slate-300">|</span>
            <span className="font-medium text-slate-800">Heuristic Predictions:</span>
            <span className={classifiedCount > 0 ? "text-blue-700 font-semibold" : "text-slate-500"}>
              {classifiedCount.toLocaleString()} / {recordCount.toLocaleString()}
            </span>
            {recordCount > 0 && classifiedCount === recordCount && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1 inline" />
            )}
            {annotatedCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-medium text-purple-800">Annotated Pairs:</span>
                <span className="text-purple-700 font-semibold">{annotatedCount}</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 overflow-x-auto py-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`ml-1 px-1.5 py-0.2 text-[11px] rounded-full font-mono ${
                    isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge.toLocaleString()}
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
