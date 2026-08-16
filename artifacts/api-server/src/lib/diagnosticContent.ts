// ---------------------------------------------------------------------------
// Original content for the embedded diagnostic reasoning assessments.
//
// Two instruments, each offered at FOUR time-points (phases) so a student can
// gauge themselves before, during, and after the course:
//   - subject  — AI Math subject-specific reasoning. Realistic short cases
//     about the course material (the math behind AI); the best-supported answer
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
      "Intro level: answerable by a thoughtful newcomer reasoning carefully, BEFORE any lessons. Do not assume prior course knowledge or technical terms. No calculations — reward plain-language reasoning.",
    topicFocus:
      "What 'AI is really math' means and how to think about it: that an AI, however human it sounds, is doing an enormous amount of plain arithmetic on lists of numbers rather than truly understanding; that everything (text, images, sound) is first turned into numbers; that a model is a giant pile of tunable numbers ('weights') that learning adjusts; and that AI is math, not magic — so it has no secret wisdom and can be confidently wrong.",
  },
  third: {
    level:
      "Early course level: covers roughly the first third of the one-day course. Plain language, short realistic cases, no calculations.",
    topicFocus:
      "Most of session 1.1 (Numbers as meaning): AI is really math (inputs become numbers; weights are tunable numbers; learning adjusts them; math not magic); vectors and embeddings (a vector is a list of numbers acting as a location, an embedding places similar-meaning things near each other so nearness IS meaning, and directions can carry meaning like king-man+woman≈queen); and measuring likeness (small distance or a large dot product between vectors signals similarity, as used by search and recommendations).",
  },
  twothirds: {
    level:
      "Mid course level: covers roughly the first two-thirds of the one-day course. Realistic short cases requiring a step of reasoning, no calculations.",
    topicFocus:
      "All of session 1.1 plus the start of session 1.2: AI as math, vectors/embeddings, and measuring likeness (distance is how far apart two vectors are, the dot product checks whether they point the same way, cosine similarity ignores size — used for search and recommendations), PLUS matrices (a grid of numbers that reshapes a vector by taking weighted blends of inputs, so one layer of a network is a matrix and stacking them moves information), slopes and gradients (a loss measures how wrong the model is, and the gradient is the per-dial slope pointing uphill toward more error, so you move the opposite way), and gradient descent (learning by repeated small downhill steps on the error landscape, where the learning-rate step size matters — too big and the model overshoots and bounces).",
  },
  after: {
    level:
      "End-of-course level: covers the whole one-day course. Integrative short cases that apply more than one idea, no calculations.",
    topicFocus:
      "The full one-day course, sessions 1.1-1.2: AI as math, vectors/embeddings, measuring likeness, matrices, slopes/gradients, and gradient descent (learning by repeatedly stepping downhill on the error landscape, where the learning-rate step size matters and you can get stuck in local valleys), PLUS probability (AI assigns probabilities rather than knowing facts, a chatbot predicts the next word, confidence reflects pattern-fit not truth so it can be confidently wrong, and a little randomness/'temperature' adds variety) and backpropagation (the self-teaching loop: a forward pass guesses, the loss scores the error, blame is passed backward to give each weight a gradient, gradient descent nudges them, repeated millions of times).",
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
      ? "Answer each question about the math behind AI — these reward careful reasoning about realistic cases (no calculations), not memorized facts"
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
// SUBJECT — AI Math blueprint cases (best answer keyed FIRST)
// ===========================================================================

const SUBJECT_BEFORE: DiagItem[] = [
  {
    prompt:
      "A reporter asks an AI researcher how a chatbot manages to write a clever poem. The researcher would most likely explain it in terms of:",
    options: [
      "an enormous amount of arithmetic on numbers producing a likely-looking output, not genuine understanding",
      "a tiny conscious mind inside the computer feeling inspired",
      "the computer copying the poem word-for-word from one place",
      "the reporter's personal opinion of poetry",
    ],
    modelAnswer:
      "The course's view is that AI is really math: a chatbot does a huge amount of arithmetic on numbers to produce a likely-looking output, rather than truly understanding or having a mind.",
  },
  {
    prompt:
      "A headline claims 'AI just KNOWS the right answer — it's basically magic.' How would someone who understands AI most likely treat this claim?",
    options: [
      "As an oversimplification, since AI is arithmetic on numbers and can be confidently wrong",
      "As obviously true and needing no evidence",
      "As proof that AI can never make a mistake",
      "As true only for very expensive AI",
    ],
    modelAnswer:
      "It is an oversimplification; AI is math, not magic — it works by arithmetic on numbers, has no secret wisdom, and can be confidently wrong.",
  },
  {
    prompt:
      "A product demo shows one AI system captioning photos, answering questions, and composing music. According to this course, what is actually going on inside it in every one of those cases?",
    options: [
      "A system doing huge amounts of arithmetic on lists of numbers",
      "A private library storing every fact ever written",
      "A computer that feels emotions like a person",
      "A short list of if-then rules written by hand",
    ],
    modelAnswer:
      "At bottom an AI is doing an enormous amount of plain arithmetic on lists of numbers — that's the core 'AI is really math' idea.",
  },
];

const SUBJECT_THIRD: DiagItem[] = [
  {
    prompt:
      "A search engine returns a great match for 'how to fix a flat tire' when you actually typed 'repairing a punctured wheel,' even though the two share almost no words. This is best understood as showing that:",
    options: [
      "both phrases are turned into vectors that land near each other on a meaning map (an embedding)",
      "the engine secretly stored every possible phrasing of every question",
      "the two phrases share spelling the computer happened to notice",
      "the engine guessed randomly and got lucky",
    ],
    modelAnswer:
      "An embedding turns each phrase into a vector (a location), placing similar meanings close together, so differently-worded phrases that mean the same thing land near each other and match.",
    skillArea: "analysis",
  },
  {
    prompt:
      "A music app turns songs into vectors, notices that a new song's vector sits close to ones you love, and recommends it. This best illustrates that:",
    options: [
      "AI finds similar things by measuring likeness between vectors (small distance or a large dot product)",
      "the app has actually listened to and understood every song",
      "recommendations are just whatever songs are newest",
      "the app reads your mind directly",
    ],
    modelAnswer:
      "The app represents songs as vectors and measures likeness (small distance / large dot product) between what you like and other songs, ranking the closest — no real understanding of the audio needed.",
    skillArea: "inference",
  },
  {
    prompt:
      "Someone says, 'A computer can't possibly handle the meaning of words — meaning isn't a number.' Given the course, why would you push back?",
    options: [
      "Because an embedding turns meaning into a location in space, so similar meanings sit close and nearness stands in for meaning",
      "Because computers secretly understand language exactly like people do",
      "Because words don't really have any meaning at all",
      "Because meaning is something that can never be studied",
    ],
    modelAnswer:
      "Embeddings make meaning a location in space: similar-meaning words are placed near each other, so for a machine nearness IS meaning — meaning becomes geometry it can compute with.",
    skillArea: "evaluation",
  },
];

const SUBJECT_TWOTHIRDS: DiagItem[] = [
  {
    prompt:
      "A model's answers are terrible at first, but after training they're good — even though each training step barely changes anything. What does this best illustrate?",
    options: [
      "Gradient descent: repeated small downhill steps on the error landscape slowly drive the loss down",
      "The model suddenly understood the topic in a single moment",
      "Someone hand-set the millions of dials to the right values",
      "Training does nothing; the model was always good",
    ],
    modelAnswer:
      "It shows gradient descent: many tiny downhill steps on the error landscape accumulate, carrying the model from high error to low error even though each step is small.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "During training, a model's error keeps bouncing up and down and never settles into a low value. What is the most likely explanation?",
    options: [
      "The learning rate (step size) is too big, so it overshoots the valley and bounces around",
      "The model has no weights left to adjust",
      "The data was turned into letters instead of numbers",
      "Gradients always cause bouncing and nothing can be done",
    ],
    modelAnswer:
      "A too-large learning rate makes each step overshoot the low point, so the model leaps past the valley and bounces around instead of settling — smaller steps would help.",
    skillArea: "inference",
  },
  {
    prompt:
      "Inside one layer of a neural network, what is really happening to the numbers that flow through it?",
    options: [
      "A matrix reshapes the vector, making each output a weighted blend of the inputs",
      "The layer looks up the answer in a stored table",
      "The layer ponders the meaning the way a person would",
      "Nothing changes; the numbers pass straight through unaltered",
    ],
    modelAnswer:
      "A layer is a matrix that transforms the vector: each output number is a weighted blend of all the inputs (using learned weights), which is how information gets mixed and reshaped.",
    skillArea: "analysis",
  },
];

const SUBJECT_AFTER: DiagItem[] = [
  {
    prompt:
      "A chatbot states a made-up 'fact' in a calm, confident voice, and it turns out to be false. Which explanation fits what the course shows?",
    options: [
      "AI assigns probabilities and predicts likely words; confidence reflects pattern-fit, not truth, so it can be confidently wrong",
      "The chatbot is deliberately lying",
      "A confident AI is always correct, so this can't really happen",
      "It must simply have been hacked",
    ],
    modelAnswer:
      "AI produces probabilities and predicts likely words rather than knowing facts; its confidence reflects how well an answer fits learned patterns, not whether it's true, so confident-but-wrong is expected.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "After a wrong answer, a network adjusts millions of dials, even though no one tells it which ones were at fault. How should this be understood?",
    options: [
      "Backpropagation assigns blame backward to give each weight a gradient, then gradient descent nudges them all",
      "The network randomly changes dials and hopes for the best",
      "A programmer fixes each dial by hand after every mistake",
      "The network actually can't learn from its mistakes at all",
    ],
    modelAnswer:
      "Backpropagation works backward from the error to assign each weight a share of the blame (a gradient), and gradient descent then nudges every weight a small step to reduce the loss.",
    skillArea: "inference",
  },
  {
    prompt:
      "A commentator says, 'AI literally understands and knows the truth — it's a digital mind.' Drawing on the course, the strongest criticism is that:",
    options: [
      "AI is arithmetic on numbers that assigns probabilities; it has no real understanding and can be confidently wrong",
      "AI really is a conscious mind, so the claim is fine",
      "AI knows every truth there is, so the claim is fine",
      "Nothing about AI can ever be studied",
    ],
    modelAnswer:
      "AI is math — arithmetic on numbers that outputs probabilities — not a knowing mind; it has no guaranteed access to truth and can be confidently wrong, so 'understands and knows the truth' overstates it.",
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
      baseTitle: `AI Math Check — ${PHASE_LABEL[phase]}`,
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
