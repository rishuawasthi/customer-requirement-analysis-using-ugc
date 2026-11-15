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
            <strong>Authors:</strong> Anant Upadhyay, Harsh Singh, Devansh Garg, Rishu Awasthi
          </div>
          <div className="text-slate-500">
            Department of Computer Science and Engineering, ABES Engineering College, Ghaziabad, Uttar Pradesh, India
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

      {/* 3. Dataset Provenance & Attribution */}
      <div className="bg-white p-5 rounded border border-slate-200 space-y-3 text-xs">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Database className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Dataset Provenance &amp; Licensing</h2>
        </div>

        <div className="space-y-2 text-slate-700 leading-relaxed">
          <p>
            The project benchmarks customer requirements using data derived from the internationally recognized <strong>SemEval-2015 Task 12 (Aspect Based Sentiment Analysis)</strong> benchmark:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Laptop Domain:</strong> 2,314 customer reviews spanning hardware, software, performance, and usability.</li>
            <li><strong>Restaurant Domain:</strong> 1,847 customer reviews spanning food, service, ambience, and price.</li>
            <li><strong>Curated Presentation Set:</strong> 45 balanced rows (25 Laptop, 20 Restaurant) for swift viva demonstrations.</li>
          </ul>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600 font-mono">
            Citation: Maria Pontiki, Dimitris Galanis, Haris Papageorgiou, Suresh Manandhar, and Ion Androutsopoulos. 2015. "SemEval-2015 Task 12: Aspect Based Sentiment Analysis." In Proceedings of the 9th International Workshop on Semantic Evaluation (SemEval 2015), pages 486–495.
          </div>
        </div>
      </div>

      {/* 4. Backend API Contract Specification */}
      <div className="bg-white p-5 rounded border border-slate-200 space-y-3 text-xs">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Terminal className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Backend API Specification</h2>
        </div>

        <div className="space-y-3 text-slate-700">
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-bold text-[10px]">GET</span>
              <span className="text-slate-900 font-semibold">/api/health</span>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Returns health status, active model identifier, prompt version (<code>v1.0-research</code>), and whether <code>GEMINI_API_KEY</code> is configured.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="bg-slate-800 text-white px-1.5 py-0.2 rounded font-bold text-[10px]">POST</span>
              <span className="text-slate-900 font-semibold">/api/classify</span>
            </div>
            <div className="text-slate-600 font-sans text-xs">
              <strong>Body:</strong> <code>{'{ text: string, config?: { k?: 0|2|4|8, model?: string } }'}</code>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Classifies a single sentence along both dimensions. Returns structured JSON: <code>sentiment</code>, <code>requirement_category</code>, <code>evidence</code>, <code>explanation</code>, and <code>confidence</code>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="bg-slate-800 text-white px-1.5 py-0.2 rounded font-bold text-[10px]">POST</span>
              <span className="text-slate-900 font-semibold">/api/batch-classify</span>
            </div>
            <div className="text-slate-600 font-sans text-xs">
              <strong>Body:</strong> <code>{'{ items: Array<{ id: string, text: string }>, config?: { k?: number, concurrency?: number } }'}</code>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Processes a batch of feedback records with server-controlled concurrency and throttled exponential backoff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
