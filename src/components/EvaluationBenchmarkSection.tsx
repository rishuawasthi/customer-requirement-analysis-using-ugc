import React from 'react';
import {
  BarChart3,
  BookOpen,
  Scale,
  Cpu,
  Layers,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Table as TableIcon,
  ShieldCheck,
  ArrowRight,
  Bot
} from 'lucide-react';
import { FeedbackRecord } from '../types';

interface EvaluationBenchmarkSectionProps {
  records: FeedbackRecord[];
  sourceName?: string;
}

export const EvaluationBenchmarkSection: React.FC<EvaluationBenchmarkSectionProps> = ({
  records,
  sourceName = 'dataset'
}) => {
  // Compute current dataset heuristic counts
  const total = records.length;
  const heuristicCounts = {
    EXPLICIT_NEED: 0,
    IMPLICIT_NEED: 0,
    PAIN_POINT: 0,
    NON_ACTIONABLE: 0
  };
  records.forEach(r => {
    if (r.predictedCategory && heuristicCounts[r.predictedCategory] !== undefined) {
      heuristicCounts[r.predictedCategory]++;
    }
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header and Academic Benchmark Notice */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2.5 pb-3 mb-4 border-b border-slate-100">
          <BarChart3 className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            Experimental Evaluation & Research Benchmark Design
          </h2>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed mb-4">
          This section details the experimental design, comparative model families, and formal evaluation protocol
          specified in the research manuscript:{' '}
          <em className="text-slate-900 font-medium">
            "Designing a Benchmark for Classifying Explicit Needs, Implicit Needs, and Pain Points in User-Generated Content"
          </em>{' '}
          (Upadhyay, Singh, Garg, Awasthi — ABES Engineering College).
        </p>

        {/* Academic Integrity Badge */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-amber-900">Research Integrity Policy (Section I & Section X of Manuscript):</span>
            <p className="leading-relaxed">
              In accordance with academic standards, empirical values that depend on future large-scale human annotation and GPU fine-tuning are marked as{' '}
              <strong className="underline">[Pending Experimental Execution]</strong>. This prototype does not fabricate synthetic classification confidences or mock metric values. The category counts shown in the application reflect the{' '}
              <strong>Rule-Based Linguistic Heuristic Baseline</strong>, not gold-standard human ground truth.
            </p>
          </div>
        </div>
      </div>

      {/* Research Questions RQ1 – RQ4 */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <HelpCircle className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Formulation of Core Research Questions (Section IV)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          {/* RQ1 */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                RQ1 (Annotation Reliability)
              </span>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Live Tooling Implemented
              </span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed mb-2 font-medium">
              "How reliably can independent human annotators distinguish explicit needs, implicit needs, pain points, and non-actionable content in reviews, as measured by Krippendorff's alpha?"
            </p>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              <strong>Evaluation Metric:</strong> Nominal Krippendorff's α (target ≥ 0.80 reliable, 0.67–0.80 tentative).
            </div>
          </div>

          {/* RQ2 */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                RQ2 (Comparative Modeling)
              </span>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Methodology Formulated
              </span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed mb-2 font-medium">
              "How do TF-IDF with a linear SVM, a fine-tuned RoBERTa classifier, and zero-/few-shot LLM prompting compare on this four-way classification task, in terms of Macro-F1 and per-class precision/recall?"
            </p>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              <strong>Evaluation Metric:</strong> Macro-F1 (primary), Macro Precision, Macro Recall, Confusion Matrix.
            </div>
          </div>

          {/* RQ3 */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                RQ3 (Cross-Domain Generalization)
              </span>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Design Pending Execution
              </span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed mb-2 font-medium">
              "How does model performance change when a model developed on product-review data is evaluated on application reviews from a held-out domain?"
            </p>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              <strong>Planned Setup:</strong> Train on Amazon product reviews, evaluate on held-out AWARE application reviews.
            </div>
          </div>

          {/* RQ4 */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                RQ4 (In-Context Exemplar Sensitivity)
              </span>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Secondary Question
              </span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed mb-2 font-medium">
              "How does the number of in-context examples (k = 0, 2, 4, 8) affect LLM classification performance on the four-category task?"
            </p>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              <strong>Regime:</strong> k ∈ &#123;0, 2, 4, 8&#125; exemplars drawn exclusively from training split.
            </div>
          </div>
        </div>
      </div>

      {/* Table V: Dataset and Annotation Statistics */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <TableIcon className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Table V: Dataset and Annotation Statistics (Manuscript Results Template)
          </h3>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-2.5 text-left">Metric Specification</th>
                <th className="px-4 py-2.5 text-left">Manuscript Planned Benchmark</th>
                <th className="px-4 py-2.5 text-left">Exploratory SemEval-2015 Available Corpus</th>
                <th className="px-4 py-2.5 text-left">Curated Demo Sample</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-4 py-2 font-medium">Total Sentences</td>
                <td className="px-4 py-2 italic text-slate-500">300 – 400 (Pilot Target)</td>
                <td className="px-4 py-2 font-mono font-semibold text-slate-900">3,054 unique sentences (4,161 rows)</td>
                <td className="px-4 py-2 font-mono text-slate-800">45 sentences</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Domains Covered</td>
                <td className="px-4 py-2 italic text-slate-500">Amazon Product Reviews &amp; AWARE App Reviews</td>
                <td className="px-4 py-2 text-slate-800">Laptop (2,314) &amp; Restaurant (1,847)</td>
                <td className="px-4 py-2 text-slate-800">Laptop (25) &amp; Restaurant (20)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Review Partitioning Unit</td>
                <td className="px-4 py-2 italic text-slate-500">Review-ID level (prevents cross-sentence leakage)</td>
                <td className="px-4 py-2 text-slate-800">531 unique review IDs</td>
                <td className="px-4 py-2 text-slate-800">45 individual feedback IDs</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Gold-Standard Label Distribution</td>
                <td className="px-4 py-2 italic text-amber-700 bg-amber-50/50">[To be populated after annotation]</td>
                <td className="px-4 py-2 text-slate-500">Original ABSA Polarity: 2300 Pos, 1167 Neg, 159 Neu</td>
                <td className="px-4 py-2 text-slate-500">Original Polarity: 24 Neg, 13 Neu, 8 Pos</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Krippendorff's Alpha (Nominal)</td>
                <td className="px-4 py-2 italic text-amber-700 bg-amber-50/50">[To be populated after annotation]</td>
                <td className="px-4 py-2 italic text-slate-500">Calculated via Human Annotation Tab</td>
                <td className="px-4 py-2 italic text-slate-500">Calculated via Human Annotation Tab</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table VI: In-Domain and Out-of-Domain Macro-F1 by Model */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <Cpu className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Table VI: In-Domain and Out-of-Domain Macro-F1 by Model (Manuscript Results Template)
          </h3>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          This table reproduces Table VI from the research manuscript. Each cell indicates the planned experimental arm.
          Per Section I and Section X of the paper, numeric evaluations are retained as pending to preserve scientific truth.
        </p>

        <div className="overflow-x-auto text-xs">
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-2.5 text-left">Model Family &amp; Supervision Regime</th>
                <th className="px-4 py-2.5 text-center">In-Domain Macro-F1 (95% CI)</th>
                <th className="px-4 py-2.5 text-center">Out-of-Domain Macro-F1 (95% CI)</th>
                <th className="px-4 py-2.5 text-left">Experimental Execution Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-4 py-2 font-medium">Majority-Class Baseline Floor</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending]</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending]</td>
                <td className="px-4 py-2 text-slate-600">Pending empirical gold test partition</td>
              </tr>
              <tr className="bg-blue-50/30">
                <td className="px-4 py-2 font-medium text-blue-900">
                  Rule-Based Linguistic Heuristic (Current Prototype Baseline)
                </td>
                <td className="px-4 py-2 text-center font-mono text-blue-800">
                  Heuristic Baseline
                </td>
                <td className="px-4 py-2 text-center font-mono text-blue-800">
                  Heuristic Baseline
                </td>
                <td className="px-4 py-2 text-emerald-700 font-semibold flex items-center mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Implemented in Application
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">TF-IDF + Linear SVM (Class-Balanced)</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-amber-700">
                  Awaiting genuine human ground-truth requirement labels
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">RoBERTa-base (Fine-Tuned Sequence Classifier)</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-amber-700">
                  GPU fine-tuning pending gold training split
                </td>
              </tr>
              <tr className="bg-purple-50/30">
                <td className="px-4 py-2 font-medium text-purple-950">
                  Gemini AI (k = 0, Zero-Shot)
                </td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-purple-800 font-semibold">
                  API &amp; Structured JSON Engine Live
                </td>
              </tr>
              <tr className="bg-purple-50/30">
                <td className="px-4 py-2 font-medium text-purple-950">
                  Gemini AI (k = 2, Few-Shot)
                </td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-purple-800 font-semibold">
                  Controlled Training Exemplars Operational
                </td>
              </tr>
              <tr className="bg-purple-50/30">
                <td className="px-4 py-2 font-medium text-purple-950">
                  Gemini AI (k = 4, Few-Shot)
                </td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-purple-800 font-semibold">
                  Controlled Training Exemplars Operational
                </td>
              </tr>
              <tr className="bg-purple-50/30">
                <td className="px-4 py-2 font-medium text-purple-950">
                  Gemini AI (k = 8, Few-Shot)
                </td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-center text-slate-500 italic">[Pending Gold Set]</td>
                <td className="px-4 py-2 text-purple-800 font-semibold">
                  Controlled Training Exemplars Operational
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Gemini AI Integration & Prompt Specification Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-slate-100">
          <Bot className="w-5 h-5 text-purple-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Gemini AI Benchmark Architecture &amp; Prompt Specification
          </h3>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            The project integrates Google's official <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">@google/genai</code> SDK through a secure backend Node.js architecture to implement the LLM experimental arms specified in Section VIII-D of the manuscript.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-900">1. Two-Dimensional Independence</span>
              <p className="text-slate-600">
                Gemini classifies both <strong>Sentiment Polarity</strong> (Positive, Negative, Neutral, Mixed) and <strong>Customer Requirement Category</strong> (Explicit Need, Implicit Need, Pain Point, Non-Actionable) in a single structured request. Sentiment does not dictate requirement category.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-900">2. Strict Schema Enforcement</span>
              <p className="text-slate-600">
                Responses are constrained via OpenAPI JSON Schema to guarantee field presence (<code className="font-mono">sentiment</code>, <code className="font-mono">requirement_category</code>, <code className="font-mono">evidence</code>, <code className="font-mono">explanation</code>, <code className="font-mono">confidence</code>), eliminating parsing failures.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-900">3. Exemplar Leakage Prevention</span>
              <p className="text-slate-600">
                Few-shot exemplars (<code className="font-mono">k ∈ &#123;0, 2, 4, 8&#125;</code>) are drawn exclusively from verified training split examples, guaranteeing zero data leakage into evaluation partitions.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-900">4. Scientific Confidence Footnote</span>
              <p className="text-slate-600">
                Confidence reported by Gemini reflects internal token probability heuristics and is explicitly communicated in the UI as <em>model-reported, uncalibrated confidence</em>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Learning Baseline Scientific Statement */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-slate-100">
          <Layers className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Machine Learning Baseline (TF-IDF + Linear SVM) Execution Status
          </h3>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            The project architecture specifies training a <strong>Linear Support Vector Machine with TF-IDF unigram and bigram features</strong> with class-balanced weighting as the traditional supervised baseline.
          </p>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-2">
            <div className="font-semibold text-slate-900">Why supervised training is withheld in this phase:</div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600">
              <li>
                <strong>Sentiment Polarity ≠ Requirement Class:</strong> The SemEval dataset provides aspect-sentiment labels (Positive, Negative, Neutral). Training an SVM on these labels would train a sentiment classifier, not a customer requirements classifier.
              </li>
              <li>
                <strong>Avoiding Pseudo-Label Circularity:</strong> Training a machine-learning model on regex heuristic predictions would merely approximate the heuristic rules, fabricating artificially high accuracy numbers that violate academic integrity.
              </li>
              <li>
                <strong>Integrity Principle:</strong> As instructed by our supervisor and manuscript guidelines, supervised training will only be executed once human double-annotation and adjudication provide a verified gold-standard ground truth.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* SemEval Exploratory Domain Comparison */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Exploratory Domain Comparison: Laptop vs Restaurant (SemEval-2015)
          </h3>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 mb-4">
          <strong>Academic Scope Notice:</strong> This exploratory analysis examines the two distinct domains available in the SemEval-2015 dataset (Laptop Product Reviews vs Restaurant Service Reviews).{' '}
          <strong className="underline">It does NOT represent the manuscript's Amazon-to-AWARE cross-domain experiment</strong>, which remains pending future data acquisition.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Laptop Domain */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-900 mb-2 flex items-center justify-between">
              <span>Laptop Domain (Product UGC)</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">2,314 rows</span>
            </div>
            <ul className="space-y-1 text-slate-600">
              <li>• <strong>Target Characteristics:</strong> Hardware specs, battery life, drivers, performance, ports.</li>
              <li>• <strong>Negative/Pain Polarity:</strong> 774 negative feedback rows (33.4%).</li>
              <li>• <strong>Typical Aspect Categories:</strong> LAPTOP#OPERATION_PERFORMANCE, BATTERY, KEYBOARD.</li>
              <li>• <strong>Requirement Suitability:</strong> Higher density of technical feature requests and implicit hardware friction.</li>
            </ul>
          </div>

          {/* Restaurant Domain */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-900 mb-2 flex items-center justify-between">
              <span>Restaurant Domain (Service UGC)</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">1,847 rows</span>
            </div>
            <ul className="space-y-1 text-slate-600">
              <li>• <strong>Target Characteristics:</strong> Food quality, ambiance, waiting times, staff service.</li>
              <li>• <strong>Negative/Pain Polarity:</strong> 393 negative feedback rows (21.3%).</li>
              <li>• <strong>Typical Aspect Categories:</strong> SERVICE#GENERAL, FOOD#QUALITY, RESTAURANT#PRICES.</li>
              <li>• <strong>Requirement Suitability:</strong> Predominantly experiential sentiment; fewer direct software/engineering feature requests.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Table VII: Planned Error Analysis Categories */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <AlertTriangle className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Table VII: Planned Qualitative Error-Analysis Categories (Section XI)
          </h3>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Failure Mode Category</th>
                <th className="px-3 py-2 text-left">Theoretical Operational Definition</th>
                <th className="px-3 py-2 text-left">Prototypical Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">Explicit ↔ Implicit Confusion</td>
                <td className="px-3 py-2">Boundary cases where a request is stated through indirect preference rather than imperative verb.</td>
                <td className="px-3 py-2 italic text-slate-500">"Could use an extra USB port" vs "Please add USB-C"</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">Implicit ↔ Pain-Point Confusion</td>
                <td className="px-3 py-2">Dissatisfaction expressing problem without clear inferable desired remediation.</td>
                <td className="px-3 py-2 italic text-slate-500">"The checkout is terrible" vs "Checkout crashed during payment"</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">Pain-Point ↔ Non-Actionable Confusion</td>
                <td className="px-3 py-2">Mild subjective dissatisfaction with unclear actionability or rating restatement.</td>
                <td className="px-3 py-2 italic text-slate-500">"Not my favorite color" vs "Display calibration is distorted"</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">Sarcasm &amp; Indirect Phrasing</td>
                <td className="px-3 py-2">Statements whose literal positive wording contrasts with negative intended requirement.</td>
                <td className="px-3 py-2 italic text-slate-500">"Great battery if you enjoy being plugged into the wall 24/7"</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">Context-Dependent Meaning</td>
                <td className="px-3 py-2">Sentences requiring preceding discourse context to resolve ambiguous pronouns or references.</td>
                <td className="px-3 py-2 italic text-slate-500">"It simply does not work" (missing hardware referent)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
