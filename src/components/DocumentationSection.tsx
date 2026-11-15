import React from 'react';
import {
  FileText,
  Layers,
  Database,
  Terminal,
  ExternalLink,
  Code2,
  BookOpen,
  CheckCircle2
} from 'lucide-react';

export const DocumentationSection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Documentation Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight">System &amp; Research Documentation</h1>
        <p className="text-xs text-slate-500">
          Manuscript references, system architecture, dataset provenance, and API contracts.
        </p>
      </div>

      {/* 1. Research Manuscript Overview Card */}
      <div className="bg-white p-5 rounded border border-slate-200 space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <BookOpen className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Research Manuscript</h2>
        </div>

        <div className="space-y-2 text-xs">
          <div className="text-slate-900 font-semibold text-sm">
            "Designing a Benchmark for Classifying Explicit Needs, Implicit Needs, and Pain Points in User-Generated Content"
          </div>
          <div className="text-slate-600">
            <strong>Authors:</strong> Rupika Upadhyay, Roshni Singh, Ronak Garg, Rishu Awasthi
          </div>
          <div className="text-slate-500">
            <strong>Supervisor:</strong> Mr. Praveen Kumar Rai • Department of Computer Science and Engineering, ABES Engineering College, Ghaziabad, Uttar Pradesh, India
          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 text-xs leading-relaxed space-y-1.5">
            <div className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider">Research Abstract:</div>
            <p>
              User-generated content (UGC) contains vital product feedback, yet traditional sentiment analysis collapses distinct customer signals into emotional polarity. This research develops a rigorous four-class taxonomy: <em>Explicit Needs</em>, <em>Implicit Needs</em>, <em>Pain Points</em>, and <em>Non-Actionable Content</em>. We establish formal annotation boundary rules, evaluate human inter-coder reliability using nominal Krippendorff's alpha, provide a deterministic rule-based linguistic baseline, and evaluate zero-shot and few-shot Gemini LLMs alongside planned RoBERTa models across SemEval laptop and restaurant domains.
            </p>
          </div>

          <div className="pt-2 flex items-center space-x-2 text-xs">
            <span className="font-medium text-slate-700">Workspace Manuscript File:</span>
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
              manuscript_IEEE_clean_final_v3.docx
            </span>
          </div>
        </div>
      </div>

      {/* 2. System Architecture & Tech Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Architecture */}
        <div className="bg-white p-5 rounded border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Layers className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">System Architecture</h2>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-900">1. Client Layer (Vite + React 19)</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Renders the three primary destinations (Implementation, Research, Documentation). Features side-by-side model comparison, live human annotation workbench, and client-side throttled batch inference.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-900">2. Backend Proxy Layer (Express on Node.js)</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Listens on port 5000. Shields the secret <code>GEMINI_API_KEY</code> from client exposure, enforces structured JSON schema output, and manages rate-limit backoff.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-900">3. AI Engine (@google/genai SDK)</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Invokes Gemini 2.5 Flash at low temperature (0.1) for deterministic academic output with few-shot exemplars (k = 0, 2, 4, 8) isolated from evaluation splits.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Stack */}
        <div className="bg-white p-5 rounded border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Code2 className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">Technical Stack</h2>
          </div>

          <table className="w-full text-xs text-left">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 text-slate-500 font-medium">Frontend Framework</td>
                <td className="py-2 text-slate-900 font-mono text-right">React 19.0 + TypeScript 7.0</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500 font-medium">Build Tool</td>
                <td className="py-2 text-slate-900 font-mono text-right">Vite 8.3 + Tailwind CSS v4</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500 font-medium">Backend API</td>
                <td className="py-2 text-slate-900 font-mono text-right">Node.js Express 4.21</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500 font-medium">LLM Provider</td>
                <td className="py-2 text-slate-900 font-mono text-right">Google Gemini 2.5 Flash</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500 font-medium">GenAI SDK</td>
                <td className="py-2 text-slate-900 font-mono text-right">@google/genai (v2.4.0)</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500 font-medium">Spreadsheet Parser</td>
                <td className="py-2 text-slate-900 font-mono text-right">xlsx (SheetJS v0.18)</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500 font-medium">Reliability Metric</td>
                <td className="py-2 text-slate-900 font-mono text-right">Nominal Krippendorff's α</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Dataset Provenance, Partitioning & Academic Integrity */}
      <div className="bg-white p-5 rounded border border-slate-200 space-y-3 text-xs">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Database className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Dataset Provenance, Partitioning &amp; Academic Integrity</h2>
        </div>

        <div className="space-y-3 text-slate-700 leading-relaxed">
          <div className="p-3 bg-blue-50/60 rounded border border-blue-200 text-blue-900 space-y-1">
            <div className="font-semibold text-xs flex items-center space-x-1">
              <span>Academic Provenance Distinction:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              In this software implementation, <strong>SemEval-2015 Task 12 (Aspect-Based Sentiment Analysis)</strong> data is utilized as an <strong>exploratory experimental proxy dataset</strong> (Laptop: 2,314 rows, Restaurant: 1,847 rows). The theoretical manuscript benchmark specification cites <strong>Amazon Product Reviews (McAuley Lab)</strong> for in-domain evaluation and the <strong>AWARE dataset (Alturaief et al.)</strong> for out-of-domain app feedback. To maintain strict scientific integrity, SemEval data is never misrepresented as Amazon or AWARE data.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Review ID-Based Group Partitioning:</h3>
            <p className="text-slate-600 text-[11px]">
              Splitting is performed strictly at the <code>review_id</code> level using reproducible hash partitioning (70% Train, 15% Validation, 15% Test with seed=42). All sentences originating from the same customer review are allocated to the exact same split, completely eliminating intra-review syntactic and lexical leakage.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Ground-Truth Training Integrity:</h3>
            <p className="text-slate-600 text-[11px]">
              Supervised model arms (Linear SVM and RoBERTa-base) can only be trained on verified, adjudicated human labels from the training partition. Training on regex heuristic predictions or pseudo-labels is strictly prohibited. If fewer than 4 adjudicated records per category exist in the training split, supervised training is withheld with an explicit status message.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Complete Backend API Contract Specification */}
      <div className="bg-white p-5 rounded border border-slate-200 space-y-3 text-xs">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Terminal className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Backend API Contracts</h2>
        </div>

        <div className="space-y-3 text-slate-700">
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-bold text-[10px]">GET</span>
              <span className="text-slate-900 font-semibold">/api/health &amp; /api/ml/status</span>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Returns health status, active Gemini model identifier, prompt version (<code>v1.0-research</code>), Python ML subsystem status, and training dataset eligibility counts.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="bg-slate-800 text-white px-1.5 py-0.2 rounded font-bold text-[10px]">POST</span>
              <span className="text-slate-900 font-semibold">/api/ml/classify-all</span>
            </div>
            <div className="text-slate-600 font-sans text-xs">
              <strong>Body:</strong> <code>{'{ text: string, k?: 0|2|4|8 }'}</code>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Coordinates simultaneous evaluation across Linear SVM (Arm 1), RoBERTa-base (Arm 2), and Gemini AI (Arm 3), returning side-by-side predictions, confidence scores, and execution latency.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="bg-slate-800 text-white px-1.5 py-0.2 rounded font-bold text-[10px]">POST</span>
              <span className="text-slate-900 font-semibold">/api/annotations/sync &amp; /api/ml/train</span>
            </div>
            <div className="text-slate-600 font-sans text-xs">
              <strong>Body:</strong> <code>{'{ records: FeedbackRecord[] }'}</code> / <code>{'{ model: "svm" | "roberta" }'}</code>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Synchronizes dual human annotations to backend storage, partitions by review ID, and triggers supervised training when eligibility thresholds (≥4 adjudicated examples/class) are satisfied.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Viva Defense Preparation Guide */}
      <div className="bg-white p-5 rounded border border-slate-200 space-y-4 text-xs">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <BookOpen className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Viva Defense Q&amp;A Preparation</h2>
        </div>

        <div className="space-y-3 text-slate-700 leading-relaxed">
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-900">Q1: Why classify customer requirements instead of standard sentiment analysis?</span>
            <p className="text-slate-600 text-[11px]">
              Sentiment analysis only reports emotional valence (positive/negative), not actionable engineering demands. A negative review could be an explicit feature request ("awful app, add offline mode"), an implicit need ("battery drains in 2h"), or an unresolvable complaint ("terrible"). Our four-class taxonomy decouples sentiment from actionable requirement engineering.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-900">Q2: What is the boundary precedence rule between Implicit Needs and Pain Points?</span>
            <p className="text-slate-600 text-[11px]">
              Per manuscript Section V (Table II): If a statement expresses customer dissatisfaction and describes a limitation from which a concrete actionable improvement can reasonably be inferred (e.g. thermal throttling implying cooling needs), it is classified as an <em>Implicit Need</em>. If it describes an acute crash or failure with no inferable new feature, it is classified as a <em>Pain Point</em>. Direct requests always take highest precedence as <em>Explicit Needs</em>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-900">Q3: Why is Krippendorff's alpha preferred over Cohen's kappa or percentage agreement?</span>
            <p className="text-slate-600 text-[11px]">
              Krippendorff's alpha natively handles nominal multi-class data, corrects mathematically for chance agreement, and operates seamlessly even when items have missing annotations from one of the coders, unlike Cohen's kappa which assumes fully paired ratings.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-900">Q4: Why must the train/validation/test split be grouped by review_id?</span>
            <p className="text-slate-600 text-[11px]">
              Individual sentences within the same review share writing style, vocabulary, product context, and idiosyncratic reviewer syntax. A random sentence split would leak intra-review stylistic signals between training and test sets, artificially inflating test scores. Grouping by <code>review_id</code> prevents this data leakage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
