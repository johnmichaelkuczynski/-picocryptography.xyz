// ---------------------------------------------------------------------------
// Original content for the embedded diagnostic reasoning assessments.
//
// Two instruments, each offered at FOUR time-points (phases) so a student can
// gauge themselves before, during, and after the course:
//   - subject  — Generative AI Integration reasoning. Realistic short cases
//     about model APIs and production integration; the best-supported answer
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
      "Basic boundaries of a generative feature: the API returns generated text rather than verified truth or durable memory; a production application must supply conversation state, validation, authorization, retries, and safe failure behavior. Use simple cases such as invented policy, forgotten preferences, or malformed output.",
  },
  third: {
    level:
      "Early course level: covers Session 1 fundamentals through context and generation controls. Keep cases brief and one-sentence-friendly.",
    topicFocus:
      "The model API contract (prompt/messages in, tokens out), system/user/assistant roles, stateless calls, context windows as finite per-request budgets rather than memory, and temperature/top-p/stop sequences as generation controls that do not ensure truth.",
  },
  twothirds: {
    level:
      "Mid-course level: covers all of Session 1 and early Session 2. Use short cases requiring one clear diagnostic step.",
    topicFocus:
      "All Session 1 concepts including structured output, tool calling, streaming, latency, token pricing, and the integration layer; plus prompt contracts and RAG using chunking, embeddings, vector search, grounding, and the distinction between finding a document and finding the right passage.",
  },
  after: {
    level:
      "End-of-course level: covers both sessions. Use concise integrative cases, still answerable in one sentence.",
    topicFocus:
      "The full course: model API and context limits; output/tool contracts; streaming, latency, and cost; robust prompts; RAG; controlled agent loops; golden sets, repeated regression tests, and calibrated LLM-as-judge; validation, bounded retries, fallbacks, prompt injection, PII, rate/cost limits; caching, observability, model pinning, and end-to-end grounded support assistants.",
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
      ? "Answer each Generative AI Integration case — these reward careful reasoning from the scene, not memorized definitions"
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
// SUBJECT — Generative AI Integration blueprint cases (best answer keyed FIRST)
// ===========================================================================

const SUBJECT_BEFORE: DiagItem[] = [
  {
    prompt:
      "A support bot confidently invents a refund rule that is absent from company policy; which response best addresses the immediate risk?",
    options: [
      "Check its answer against approved policy evidence and withhold or escalate unsupported claims",
      "Trust it because confident wording signals verified knowledge",
      "Raise temperature so it offers more varied policies",
      "Ask customers to decide whether the policy sounds official",
    ],
    modelAnswer:
      "Generated confidence is not verification, so the system should ground and validate the answer, then abstain or escalate when policy support is absent.",
  },
  {
    prompt:
      "A prototype remembers a user's address in one chat, but separate production API calls do not; what is the best explanation?",
    options: [
      "The chat product managed history, while the raw model call has no durable conversation state",
      "Production models intentionally forget all addresses for politeness",
      "A higher temperature would restore the missing address",
      "The model can only remember data entered on weekends",
    ],
    modelAnswer:
      "The raw API call is stateless; the application must persist and selectively resend relevant state.",
  },
  {
    prompt:
      "A model returns a refund amount in an eloquent paragraph that billing code cannot safely consume; what should the team add?",
    options: [
      "A schema-constrained response plus code validation before any action",
      "More adjectives so the paragraph sounds decisive",
      "A longer conversation with no output contract",
      "Automatic execution whenever the prose contains a number",
    ],
    modelAnswer:
      "The application needs structured output and validation because fluent text is not a safe software contract.",
  },
];

const SUBJECT_THIRD: DiagItem[] = [
  {
    prompt:
      "A long chat suddenly loses its earliest requirement after a large document is added; which diagnosis best fits?",
    options: [
      "History, document text, instructions, and output compete for a finite context budget",
      "The system role permanently stores only the newest requirement",
      "Temperature erased a database record",
      "Streaming prevents the model from reading early messages",
    ],
    modelAnswer:
      "The context window is finite working space, so added documents can displace or crowd out earlier relevant content.",
    skillArea: "analysis",
  },
  {
    prompt:
      "A developer lowers temperature, but the bot still cites a nonexistent policy; what follows?",
    options: [
      "Sampling controls can reduce variation but cannot guarantee factual truth",
      "Low temperature verifies every cited fact",
      "Top-p is the only possible cause of hallucination",
      "A stop sequence would supply the missing policy",
    ],
    modelAnswer:
      "Temperature changes token sampling, not grounding or verification, so evidence and validation are still required.",
    skillArea: "inference",
  },
  {
    prompt:
      "A system instruction says to be concise, while a user asks for a poem; why are message roles useful here?",
    options: [
      "They distinguish standing application instructions from the current request, though code must still enforce security",
      "They make user content physically unable to influence behavior",
      "They give the model durable memory between API calls",
      "They eliminate the need to resend relevant history",
    ],
    modelAnswer:
      "Roles organize instruction priority and conversation turns, but they are not a security or memory boundary.",
    skillArea: "evaluation",
  },
];

const SUBJECT_TWOTHIRDS: DiagItem[] = [
  {
    prompt:
      "Retrieval finds the correct policy file but returns a chunk containing the wrong exception; what should be investigated first?",
    options: [
      "Chunk boundaries, metadata, ranking, and passage-level retrieval evaluation",
      "Only the color of the chat interface",
      "Whether temperature can recreate the missing passage",
      "Whether the user typed the exact document title",
    ],
    modelAnswer:
      "Document recall succeeded but passage retrieval failed, so chunking and ranking should be tested independently of generation.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A streaming endpoint shows words quickly but the complete answer still takes ten seconds; which conclusion is strongest?",
    options: [
      "Streaming improved perceived time to first text, not necessarily total generation latency",
      "Streaming guarantees lower token cost",
      "The context window has become permanent memory",
      "Structured output can no longer be validated",
    ],
    modelAnswer:
      "Streaming delivers partial tokens sooner but does not guarantee faster completion or less model work.",
    skillArea: "inference",
  },
  {
    prompt:
      "A model asks to call issue_refund with valid JSON; what must happen before money moves?",
    options: [
      "Code must validate arguments, authorize the user and policy, then execute the tool",
      "The model's request itself executes the refund",
      "The JSON schema proves the refund is permitted",
      "A high top-p setting should approve the transaction",
    ],
    modelAnswer:
      "Tool calling proposes an action; trusted application code retains validation, authorization, and execution.",
    skillArea: "analysis",
  },
];

const SUBJECT_AFTER: DiagItem[] = [
  {
    prompt:
      "An agent repeats the same tool call after every result until costs spike; which fix is most reliable?",
    options: [
      "Enforce iteration limits, repeated-call detection, idempotency, and a bounded fallback in code",
      "Ask the model more politely not to loop",
      "Increase its context window without any limit",
      "Cache every tool result across all users",
    ],
    modelAnswer:
      "Agent control flow belongs in the orchestrator, which must cap loops and prevent duplicate side effects.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A new prompt passes ten favorite examples but fails rare users after launch; what evidence was missing?",
    options: [
      "A representative golden set, repeated regression runs, and slice-level deployment criteria",
      "A single more enthusiastic LLM judge",
      "Proof that any ten successes guarantee reliability",
      "A higher temperature in the demonstration",
    ],
    modelAnswer:
      "Handpicked successes do not support broad reliability; representative repeated evaluation and calibrated judging are needed.",
    skillArea: "inference",
  },
  {
    prompt:
      "A cached assistant answer exposes one customer's details to another; which response best addresses the architecture?",
    options: [
      "Disable the unsafe cache and key any safe cache by all privacy, authorization, and version context",
      "Hide the leaked name in the interface but keep the cache",
      "Raise rate limits so future replies arrive faster",
      "Let the model decide which users may share entries",
    ],
    modelAnswer:
      "Caching must never cross authorization boundaries; personalized data requires complete isolation or no shared cache.",
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
      baseTitle: `Generative AI Integration Check — ${PHASE_LABEL[phase]}`,
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
