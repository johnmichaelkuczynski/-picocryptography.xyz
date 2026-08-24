// ---------------------------------------------------------------------------
// Original content for the embedded diagnostic reasoning assessments.
//
// Two instruments, each offered at FOUR time-points (phases) so a student can
// gauge themselves before, during, and after the course:
//   - subject  — Machine Learning Operations reasoning. Realistic short cases
//     about production ML systems; the best-supported answer
//     is keyed first.
//   - general  — General Reasoning. Genuine reasoning items spanning analysis,
//     inference, evaluation, deduction, and induction (NOT a "docility"/agree-
//     with-authority test).
//
// Each (instrument, phase) is offered in THREE selectable answer formats that
// share the same kind of questions:
//   - mcq     — pick the single best option.
//   - hybrid  — pick the best option AND (optionally) write a short note.
//   - written — no options shown; write a short answer in your own words.
//
// These diagnostics are UNGRADED practice: takeable anytime, unlimited times,
// and they never affect the course grade. Every time a test is started, fresh
// questions are generated (see reasoning.ts) so questions never repeat. The
// items below are the structural BLUEPRINT (style + fallback) for that
// generation, grounded per phase by GEN_SPECS.
//
// All items are ORIGINAL. For every item the correct option is written FIRST;
// at seed time options are rotated so the correct answer lands at a varied
// index (see seedDiagnostics.ts). `modelAnswer` is the ideal short written
// response used to grade the written/hybrid formats.
// ---------------------------------------------------------------------------

export type SkillArea =
  | "analysis"
  | "inference"
  | "evaluation"
  | "deduction"
  | "induction";

export type Instrument = "subject" | "general";

export type Phase = "before" | "third" | "twothirds" | "after";

export type DiagFormat = "mcq" | "hybrid" | "written";

// A single unified diagnostic item. The correct option is listed FIRST and is
// rotated to a random index at seed time. `modelAnswer` is the reference answer
// for grading the written/hybrid formats.
export type DiagItem = {
  prompt: string;
  options: string[];
  modelAnswer: string;
  skillArea?: SkillArea;
};

export type DiagnosticSeed = {
  instrument: Instrument;
  phase: Phase;
  format: DiagFormat;
  title: string;
  subtitle: string;
  instructions: string;
  items: DiagItem[];
};

// ===========================================================================
// Phase metadata
// ===========================================================================

export const PHASE_ORDER: Phase[] = ["before", "third", "twothirds", "after"];

export const PHASE_LABEL: Record<Phase, string> = {
  before: "Before the course",
  third: "One-third of the way through",
  twothirds: "Two-thirds of the way through",
  after: "After the course",
};

// ===========================================================================
// Per-(instrument, phase) generation specs
// Used by reasoning.ts to generate fresh, never-repeating questions grounded in
// the right scope for the chosen time-point. `topicFocus` describes WHAT to ask
// about; `level` nudges difficulty for the time-point.
// ===========================================================================

export type GenSpec = { topicFocus: string; level: string };

const SUBJECT_SPECS: Record<Phase, GenSpec> = {
  before: {
    level:
      "Intro level: answerable by a thoughtful newcomer before lessons. Do not require technical vocabulary; reward brief plain-language reasoning from details in the scene.",
    topicFocus:
      "Basic boundaries between a model experiment and a production ML system: real data pipelines change, a model file alone is not reproducible, live inputs must match training meaning, and a service can stay online while prediction quality declines. Use simple cases that reward practical judgment without requiring jargon.",
  },
  third: {
    level:
      "Early course level: covers Session 1 fundamentals through context and generation controls. Keep cases brief and one-sentence-friendly.",
    topicFocus:
      "Session 1 fundamentals: the notebook-to-service gap; data sources and pipeline validation; linked versioning of code, data, configuration, and model artifacts; reproducibility; and training-serving skew caused by inconsistent feature meaning.",
  },
  twothirds: {
    level:
      "Mid-course level: covers all of Session 1 and early Session 2. Use short cases requiring one clear diagnostic step.",
    topicFocus:
      "All Session 1 concepts, including batch, real-time, and embedded packaging, model registries, feature consistency, and feature stores; plus early Session 2 monitoring beyond uptime, data versus concept drift, delayed ground truth, and leading indicators.",
  },
  after: {
    level:
      "End-of-course level: covers both sessions. Use concise integrative cases, still answerable in one sentence.",
    topicFocus:
      "The full course: reproducible pipelines and linked versions; training-serving skew; deployment patterns and feature stores; prediction and outcome monitoring; data and concept drift; delayed labels; governed retraining; shadow, canary, A/B, and rollback releases; cost and latency; incident response, lineage, and audit trails.",
  },
};

const GENERAL_SPECS: Record<Phase, GenSpec> = {
  before: {
    level: "Everyday, accessible reasoning. One step of inference per item.",
    topicFocus:
      "General reasoning on everyday, neutral topics: identifying assumptions and conclusions, what evidence does and does not support, judging the strength of sources, valid vs. invalid deduction, and the strength of generalizations.",
  },
  third: {
    level: "Everyday reasoning, slightly more demanding than the baseline.",
    topicFocus:
      "General reasoning on everyday, neutral topics: assumptions/conclusions, supported inferences, source quality, deductive validity, and inductive strength.",
  },
  twothirds: {
    level: "Moderately demanding reasoning, sometimes two steps.",
    topicFocus:
      "General reasoning on everyday, neutral topics: assumptions/conclusions, supported inferences, source quality, deductive validity, and inductive strength.",
  },
  after: {
    level: "More demanding, multi-step reasoning where appropriate.",
    topicFocus:
      "General reasoning on everyday, neutral topics: assumptions/conclusions, supported inferences, source quality, deductive validity, and inductive strength.",
  },
};

export function genSpecFor(instrument: Instrument, phase: Phase): GenSpec {
  return instrument === "subject"
    ? SUBJECT_SPECS[phase]
    : GENERAL_SPECS[phase];
}

// ===========================================================================
// Format-specific instructions
// ===========================================================================

const FORMAT_LABEL: Record<DiagFormat, string> = {
  mcq: "Multiple Choice",
  hybrid: "Hybrid",
  written: "Written",
};

function instructionsFor(instrument: Instrument, format: DiagFormat): string {
  const subject =
    instrument === "subject"
      ? "Answer each Machine Learning Operations case — these reward careful reasoning from the scene, not memorized definitions"
      : "Answer each reasoning question — these measure how you think, not what you recall";
  const body =
    format === "mcq"
      ? `${subject} by selecting the single best option.`
      : format === "hybrid"
        ? `${subject} by selecting the best option. You can add a quick note on your reasoning if you like — it's optional and a few words is plenty.`
        : `${subject}. No answer options are shown — just jot a brief answer in your own words. One or two sentences is plenty; there's no need to write a lot.`;
  return `${body} This is ungraded practice — take it anytime, as many times as you like; it never affects your course grade. Submitting shows your results with written feedback.`;
}

// ===========================================================================
// SUBJECT — Machine Learning Operations blueprint cases (best answer keyed FIRST)
// ===========================================================================

const SUBJECT_BEFORE: DiagItem[] = [
  {
    prompt:
      "A model works in one analyst's notebook but nobody else can recreate it because the data file and package versions are unknown; what should the team do first?",
    options: [
      "Record and version the code, data source, configuration, environment, and resulting model together",
      "Copy only the final model file to a shared folder",
      "Keep using the original laptop as the production server",
      "Rename the notebook so its purpose is clearer",
    ],
    modelAnswer:
      "The experiment is not reproducible until its code, data, configuration, dependencies, and model artifact are linked and versioned.",
  },
  {
    prompt:
      "A fraud model tested well, but live scores fail after production sends transaction amounts in cents while training used dollars; what is the best diagnosis?",
    options: [
      "Training-serving skew changed the meaning of an input feature",
      "The model needs a more colorful dashboard",
      "Fraud models cannot be deployed in real time",
      "The test set was necessarily too large",
    ],
    modelAnswer:
      "The offline and online systems supplied the same named feature in different units, which is training-serving skew.",
  },
  {
    prompt:
      "A recommendation endpoint has perfect uptime, but customer engagement has fallen for weeks; which response best addresses the immediate blind spot?",
    options: [
      "Monitor prediction behavior and eventual outcomes in addition to server health",
      "Assume uptime proves recommendation quality",
      "Increase server memory without examining predictions",
      "Stop recording which model version made each prediction",
    ],
    modelAnswer:
      "Availability metrics cannot reveal gradual quality decay, so prediction and outcome monitoring must be added.",
  },
];

const SUBJECT_THIRD: DiagItem[] = [
  {
    prompt:
      "A training pipeline succeeds after an upstream team silently changes a category code, but the new model behaves differently; what should be investigated first?",
    options: [
      "Data lineage, schema and value checks, and the meaning of the changed source field",
      "Only whether the model file has a newer timestamp",
      "Whether the dashboard uses the same font",
      "Whether batch scoring can be renamed real-time scoring",
    ],
    modelAnswer:
      "A successful run can still consume changed meaning, so the source change and its lineage and validation controls should be examined.",
    skillArea: "analysis",
  },
  {
    prompt:
      "A team saves the model artifact but not the training-data snapshot or preprocessing revision; what follows?",
    options: [
      "The release cannot be reliably reconstructed or explained from the model file alone",
      "The artifact contains every data transformation automatically",
      "A model registry makes source data unnecessary",
      "Reproducibility depends only on the model filename",
    ],
    modelAnswer:
      "Reproducibility requires linked versions of data, code, configuration, environment, and model artifacts.",
    skillArea: "inference",
  },
  {
    prompt:
      "An online feature is recomputed by three services with slightly different definitions; which architectural change best reduces this risk?",
    options: [
      "Centralize governed feature definitions and reuse them for training and serving",
      "Let every service keep its own undocumented calculation",
      "Version only the user interface",
      "Remove feature freshness checks",
    ],
    modelAnswer:
      "Shared governed feature definitions reduce duplicated logic and training-serving inconsistency.",
    skillArea: "evaluation",
  },
];

const SUBJECT_TWOTHIRDS: DiagItem[] = [
  {
    prompt:
      "A model's input distribution changes after a new customer segment arrives, but labeled accuracy has not yet changed; which conclusion is best?",
    options: [
      "Data drift has occurred and should be investigated, but it does not alone prove quality loss",
      "Concept drift is proven and immediate deployment is required",
      "The model is guaranteed to remain accurate",
      "Uptime metrics can determine whether the new segment is predicted correctly",
    ],
    modelAnswer:
      "The changed input distribution is data drift; outcome evidence and pipeline checks are still needed to determine its effect.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A real-time model meets accuracy targets but its p99 latency exceeds the checkout budget; which conclusion is strongest?",
    options: [
      "It is not production-ready for that decision path despite its accuracy",
      "Accuracy automatically compensates for any latency",
      "The latency matters only during training",
      "Renaming the endpoint will meet the budget",
    ],
    modelAnswer:
      "Operational requirements are part of model quality, so a candidate that misses the decision-time latency budget is not ready.",
    skillArea: "inference",
  },
  {
    prompt:
      "Outcome labels arrive 60 days after prediction; what must the serving system retain now so later evaluation is valid?",
    options: [
      "Prediction identity, timestamp, model and feature versions, and enough context to join the mature label",
      "Only the latest aggregate accuracy number",
      "Only the server's uptime percentage",
      "No records, because delayed labels cannot be used",
    ],
    modelAnswer:
      "Versioned prediction records are needed to join delayed outcomes to the exact release that produced them.",
    skillArea: "analysis",
  },
];

const SUBJECT_AFTER: DiagItem[] = [
  {
    prompt:
      "A drift alert automatically retrains and deploys a model built from a broken feed; which fix is most reliable?",
    options: [
      "Separate alerting, data validation, candidate training, approval, staged release, and rollback",
      "Raise the drift threshold until alerts disappear",
      "Deploy every candidate faster",
      "Treat a completed training job as proof of data quality",
    ],
    modelAnswer:
      "A drift signal should start investigation, not bypass data checks and controlled release gates.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A candidate wins on average accuracy but loses badly for one important region; what evidence was missing from the release decision?",
    options: [
      "Representative slice-level evaluation and predefined regional guardrails",
      "A larger overall average with the region still hidden",
      "A guarantee that all segments follow the mean",
      "A shorter model name",
    ],
    modelAnswer:
      "Aggregate performance can hide concentrated harm, so important segments need explicit evidence and release thresholds.",
    skillArea: "inference",
  },
  {
    prompt:
      "During an incident, nobody can determine which model, feature code, or data snapshot produced the affected predictions; what control is missing?",
    options: [
      "Prediction-level lineage linked to immutable release and training metadata",
      "A brighter alert color",
      "A policy to overwrite older model records",
      "A rule that incidents need no deployment history",
    ],
    modelAnswer:
      "An audit trail must connect affected predictions to the exact model, code, feature, data, and configuration versions.",
    skillArea: "evaluation",
  },
];

// ===========================================================================
// GENERAL — reasoning blueprint (analysis / inference / evaluation /
// deduction / induction). Shared across phases; difficulty is nudged per phase
// at generation time (see GEN_SPECS.level).
// ===========================================================================

const GENERAL_BLUEPRINT: DiagItem[] = [
  {
    prompt:
      "Consider: 'All students who studied passed the exam. Maria studied. So Maria passed.' Which unstated assumption does the argument rely on?",
    options: [
      "Maria is among the students the first statement describes.",
      "Studying is the only way to pass the exam.",
      "Maria always studies for her exams.",
      "The exam was unusually difficult.",
    ],
    modelAnswer:
      "It assumes Maria is one of the students covered by 'all students who studied' — that her studying puts her in the group described.",
    skillArea: "analysis",
  },
  {
    prompt:
      "A survey finds 70% of people who exercise daily report good sleep, versus 30% of those who never exercise. Which conclusion is best supported?",
    options: [
      "People who exercise daily are more likely to report good sleep than those who never exercise.",
      "Exercise guarantees good sleep for everyone.",
      "Poor sleep is what causes people to stop exercising.",
      "Anyone who wants good sleep must exercise daily.",
    ],
    modelAnswer:
      "Only that daily exercisers are more likely to report good sleep — an association, not a guarantee or a proven cause.",
    skillArea: "inference",
  },
  {
    prompt: "Which source would most strengthen the claim 'this medication is safe'?",
    options: [
      "A large, peer-reviewed clinical trial.",
      "A testimonial from one satisfied customer.",
      "An advertisement produced by the manufacturer.",
      "A popular wellness blog post.",
    ],
    modelAnswer:
      "A large, peer-reviewed clinical trial — independent, systematic evidence is far stronger than a testimonial, an ad, or a blog.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A neighbor insists it rained overnight. You know that if it had rained, the streets would be wet — and stepping outside, you see the streets are not wet. What necessarily follows?",
    options: [
      "It did not rain.",
      "It rained.",
      "The streets are dry for some other reason.",
      "Nothing at all follows.",
    ],
    modelAnswer:
      "It did not rain — if rain would have made the streets wet and they are not wet, then it cannot have rained.",
    skillArea: "deduction",
  },
  {
    prompt:
      "Plants given a new fertilizer grew taller than otherwise identical plants without it, all else held equal. The best-supported conclusion is:",
    options: [
      "The fertilizer probably caused the extra growth.",
      "Taller plants attract more fertilizer.",
      "Fertilizer is required for any plant growth at all.",
      "The result was pure coincidence.",
    ],
    modelAnswer:
      "Because everything else was held equal, the fertilizer probably caused the extra growth.",
    skillArea: "induction",
  },
  {
    prompt:
      "A report notes that ice-cream sales and drowning deaths rise in the same months. A careful reader should infer that:",
    options: [
      "Both may be linked to a third factor, such as hot weather.",
      "Eating ice cream causes drowning.",
      "Drowning incidents cause ice-cream sales.",
      "The data must simply be mistaken.",
    ],
    modelAnswer:
      "That both probably rise because of a shared third factor such as hot weather — correlation doesn't mean one causes the other.",
    skillArea: "inference",
  },
];

// ===========================================================================
// Seed expansion — each (instrument, phase) in all three formats
// ===========================================================================

type BaseContent = {
  instrument: Instrument;
  phase: Phase;
  baseTitle: string;
  items: DiagItem[];
};

const BASE_CONTENT: BaseContent[] = PHASE_ORDER.flatMap((phase) => {
  const subjectItems: Record<Phase, DiagItem[]> = {
    before: SUBJECT_BEFORE,
    third: SUBJECT_THIRD,
    twothirds: SUBJECT_TWOTHIRDS,
    after: SUBJECT_AFTER,
  };
  return [
    {
      instrument: "subject" as const,
      phase,
      baseTitle: `Machine Learning Operations Check — ${PHASE_LABEL[phase]}`,
      items: subjectItems[phase],
    },
    {
      instrument: "general" as const,
      phase,
      baseTitle: `General Reasoning Check — ${PHASE_LABEL[phase]}`,
      items: GENERAL_BLUEPRINT,
    },
  ];
});

const FORMATS: DiagFormat[] = ["mcq", "hybrid", "written"];

export const DIAGNOSTIC_SEED: DiagnosticSeed[] = BASE_CONTENT.flatMap((base) =>
  FORMATS.map((format) => ({
    instrument: base.instrument,
    phase: base.phase,
    format,
    title: `${base.baseTitle} · ${FORMAT_LABEL[format]}`,
    subtitle: PHASE_LABEL[base.phase],
    instructions: instructionsFor(base.instrument, format),
    items: base.items,
  })),
);
