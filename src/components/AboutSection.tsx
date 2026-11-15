import React from 'react';
import { BookOpen, Layers, CheckCircle2, AlertTriangle, Workflow, ShieldCheck } from 'lucide-react';
import { CATEGORY_DESCRIPTIONS } from '../utils/classifier';

export const AboutSection: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Introduction Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            About the Academic Mini-Project
          </h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1 text-sm">Problem Statement</h3>
            <p>
              Modern software teams and product managers collect voluminous User-Generated Content (UGC)
              from online reviews, app store ratings, feedback forums, and social platforms.
              However, traditional sentiment analysis simply outputs polarity (<em>positive</em>, <em>negative</em>, <em>neutral</em>),
              which fails to tell software engineers <strong>what needs to be built, fixed, or modified</strong>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1 text-sm">Project Objective</h3>
            <p>
              This mini-project investigates <strong>Customer Requirement Analysis from User Generated Content</strong>.
              The goal is to automatically distinguish actionable engineering requirements from general sentiment
              by classifying feedback into four distinct operational classes.
            </p>
          </div>
        </div>
      </div>

      {/* The Four Requirement Categories */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <Layers className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            The Four Requirement Categories
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Explicit Need */}
          <div className="p-4 rounded-lg border border-slate-200 bg-blue-50/30 border-l-4 border-l-blue-600">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 text-sm">1. Explicit Need</span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                EXPLICIT_NEED
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              The customer directly and unambiguously asks for a feature, service, or system capability using imperative verbs or explicit request phrasing.
            </p>
            <div className="bg-white p-2.5 rounded border border-slate-200 text-xs">
              <div className="font-semibold text-slate-700 mb-1">Authentic Examples:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><em>"Please add an option in the BIOS to turn off the backlight timeout."</em></li>
                <li><em>"You should provide graphics drivers for Windows 10."</em></li>
                <li><em>"We urgently require Linux kernel compatibility."</em></li>
              </ul>
            </div>
          </div>

          {/* Implicit Need */}
          <div className="p-4 rounded-lg border border-slate-200 bg-emerald-50/30 border-l-4 border-l-emerald-600">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 text-sm">2. Implicit Need</span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                IMPLICIT_NEED
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              The customer indirectly expresses a requirement through wishes, counterfactual preferences, or usability friction without explicitly issuing a command.
            </p>
            <div className="bg-white p-2.5 rounded border border-slate-200 text-xs">
              <div className="font-semibold text-slate-700 mb-1">Authentic Examples:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><em>"I wish the battery lasted at least 7 hours for travel."</em></li>
                <li><em>"It would be much more convenient if there was an HDMI port."</em></li>
                <li><em>"The screen is very difficult to view under direct sunlight."</em></li>
              </ul>
            </div>
          </div>

          {/* Pain Point */}
          <div className="p-4 rounded-lg border border-slate-200 bg-amber-50/30 border-l-4 border-l-amber-600">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 text-sm">3. Pain Point</span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                PAIN_POINT
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              The customer describes an acute defect, system crash, hardware breakdown, or operational failure that disrupts normal usage.
            </p>
            <div className="bg-white p-2.5 rounded border border-slate-200 text-xs">
              <div className="font-semibold text-slate-700 mb-1">Authentic Examples:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><em>"The machine froze completely three times today and required a hard reboot."</em></li>
                <li><em>"The touchpad is erratic and jumps uncontrollably when typing."</em></li>
                <li><em>"The cooling fan makes an unbearable high-pitched whining noise."</em></li>
              </ul>
            </div>
          </div>

          {/* Non-Actionable */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 border-l-4 border-l-slate-400">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 text-sm">4. Non-Actionable</span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                NON_ACTIONABLE
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              The feedback conveys generic sentiment, emotional praise, subjective aesthetic taste, or neutral commentary without identifiable engineering requirements.
            </p>
            <div className="bg-white p-2.5 rounded border border-slate-200 text-xs">
              <div className="font-semibold text-slate-700 mb-1">Authentic Examples:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><em>"Solid aluminum chassis build quality and very lightweight."</em></li>
                <li><em>"Loved the authentic Italian dessert, best tiramisu in the city!"</em></li>
                <li><em>"Average dining experience, nothing special."</em></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Workflow Pipeline */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <Workflow className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            Project Workflow Pipeline
          </h2>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {/* Step 1 */}
          <div className="relative">
            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-700 border-2 border-white" />
            <div className="text-sm font-semibold text-slate-900">1. Dataset Ingestion</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Import customer feedback from the benchmark dataset (<code className="bg-slate-100 px-1 py-0.5 rounded">semeval2015_research_ready.xlsx</code>)
              or user-uploaded CSV / Excel spreadsheets.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-700 border-2 border-white" />
            <div className="text-sm font-semibold text-slate-900">2. Schema Inspection & Separation</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              The system scans column headers to identify the feedback text column and separates original SemEval metadata
              (e.g., sentiment polarity: <em>positive/negative/neutral</em>). The application ensures original sentiment labels
              are never conflated with requirement categories.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-700 border-2 border-white" />
            <div className="text-sm font-semibold text-slate-900">3. Rule-Based Linguistic Categorization</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Feedback sentences are analyzed by a deterministic rule-based heuristic that checks for directive imperatives
              (explicit needs), counterfactual desires or friction (implicit needs), or failure descriptors (pain points).
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-700 border-2 border-white" />
            <div className="text-sm font-semibold text-slate-900">4. Review, Annotation & Export</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              The user examines individual sentence classifications and their linguistic explanations,
              can manually adjust/verify categories for ground-truth comparison, tests custom sentences, and exports the final dataset as CSV.
            </p>
          </div>
        </div>
      </div>

      {/* Honest Limitations & Academic Transparency */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            Prototype Limitations & Academic Disclosure
          </h2>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            In accordance with academic research standards, the following limitations of this prototype are explicitly noted:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>
              <strong>Experimental Baseline vs. Trained ML: </strong>
              The current prototype implements a transparent, deterministic rule-based linguistic heuristic baseline.
              It does not employ a deep neural network (e.g. BERT/RoBERTa) or an LLM classifier. This provides high interpretability
              for academic review but cannot capture long-range contextual nuances.
            </li>
            <li>
              <strong>Context Sensitivity & Sarcasm: </strong>
              Phrases containing sarcasm, double negations, or complex multi-clause compound sentences may be misclassified
              if the lexical triggers do not align with the heuristic dictionary.
            </li>
            <li>
              <strong>Dataset Ground-Truth Distinction: </strong>
              The SemEval-2015 Task 12 dataset was designed for Aspect-Based Sentiment Analysis (ABSA) and therefore contains
              sentiment polarity labels rather than requirement engineering ground-truth. Requirement labels generated here are experimental.
            </li>
            <li>
              <strong>Absence of Fabricated Metrics: </strong>
              This application intentionally does not present fabricated F1 scores, arbitrary accuracy percentages, or artificial confidence values.
              All statistics shown in the Overview are calculated strictly from loaded rows.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
