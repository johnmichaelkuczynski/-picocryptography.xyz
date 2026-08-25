// ---------------------------------------------------------------------------
// Original content for the embedded diagnostic reasoning assessments.
//
// Two instruments, each offered at FOUR time-points (phases) so a student can
// gauge themselves before, during, and after the course:
//   - subject  — Cloud Architecture reasoning. Realistic short cases about
//     cloud systems; the best-supported answer
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
      "Basic cloud boundaries: renting infrastructure changes who operates the hardware but not the customer's responsibility for configuration; compute, storage, network, and identity solve different problems; storage types are not interchangeable; public exposure and broad permissions create risk. Use simple cases that reward practical judgment without requiring jargon.",
  },
  third: {
    level:
      "Early course level: covers Session 1 fundamentals. Keep cases brief and one-sentence-friendly.",
    topicFocus:
      "Session 1 fundamentals: renting rather than owning; compute, storage, network, and identity primitives; virtual machines, containers, and serverless functions; object, block, and file storage; managed relational and key-value databases; regions and availability zones; VPCs or virtual networks, subnets, security groups, IAM, and least privilege.",
  },
  twothirds: {
    level:
      "Mid-course level: covers all of Session 1 and early Session 2. Use short cases requiring one clear diagnostic step.",
    topicFocus:
      "All Session 1 concepts, including compute and storage selection, managed databases, geography, networking, and identity; plus early Session 2 concepts: scaling up versus out, load balancing, statelessness, designing for failure, redundancy, backups, RTO, and RPO.",
  },
  after: {
    level:
      "End-of-course level: covers both sessions. Use concise integrative cases, still answerable in one sentence.",
    topicFocus:
      "The full course: compute, storage, network, and identity choices; regions and availability zones; horizontal scaling and statelessness; failure design, redundancy, backups, RTO, and RPO; cloud cost; managed services versus self-hosting and lock-in; infrastructure as code; logs, metrics, and traces; encryption, secrets, least privilege, and shared responsibility.",
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
      ? "Answer each Cloud Architecture case — these reward careful reasoning from the scene, not memorized definitions"
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
// SUBJECT — Cloud Architecture blueprint cases (best answer keyed FIRST)
// ===========================================================================

const SUBJECT_BEFORE: DiagItem[] = [
  {
    prompt:
      "A small company moves its application to the cloud and assumes the provider now controls who can read its data; what is the best correction?",
    options: [
      "The provider operates the underlying infrastructure, while the customer still configures identities, access, data protection, and the application",
      "The provider automatically makes every customer permission safe",
      "Moving to the cloud removes the need to manage credentials",
      "Only application code matters after migration",
    ],
    modelAnswer:
      "Cloud changes the ownership boundary, but the customer still owns access configuration, application security, and data protection under shared responsibility.",
  },
  {
    prompt:
      "A media company stores millions of complete video files on expensive disks attached to one virtual machine; which change best fits the access pattern?",
    options: [
      "Move the durable videos to object storage and let compute instances access them independently",
      "Buy a larger attached disk and keep the same single-machine dependency",
      "Put every video inside a relational database row",
      "Rename the disk so it is easier to identify",
    ],
    modelAnswer:
      "Whole durable files fit object storage, which separates data durability and scale from one replaceable compute instance.",
  },
  {
    prompt:
      "A payroll service's cloud role can read every bucket and secret even though it uses one database and one export bucket; which response best reduces the risk?",
    options: [
      "Grant only the specific database and bucket actions the workload requires",
      "Keep administrator access because the application is inside the cloud account",
      "Make the role public so access failures are less likely",
      "Use a longer role name without changing its permissions",
    ],
    modelAnswer:
      "Least privilege limits the workload identity to required resources and actions, reducing the blast radius of misuse or compromise.",
  },
];

const SUBJECT_THIRD: DiagItem[] = [
  {
    prompt:
      "A team chooses serverless functions for a continuously running video encoder that often needs two hours and custom operating-system packages; what should be investigated first?",
    options: [
      "Whether the function's duration, runtime, and packaging limits conflict with the workload, and whether containers or VMs fit better",
      "Whether the function can be given a more descriptive name",
      "Whether object storage should be renamed block storage",
      "Whether all compute options have identical control and limits",
    ],
    modelAnswer:
      "The workload needs long execution and custom runtime control, so the team should compare the serverless constraints with container or VM compute.",
    skillArea: "analysis",
  },
  {
    prompt:
      "An application and its database are both placed in one availability zone even though the design diagram lists two zones; what follows?",
    options: [
      "A failure of that zone can still remove both application and data service despite the diagram",
      "Naming a second zone automatically creates redundancy",
      "A second region is guaranteed without extra configuration",
      "The database becomes public only because it is in one zone",
    ],
    modelAnswer:
      "Resilience depends on where the actual resources and dependencies run, not on the number of zones shown in a diagram.",
    skillArea: "inference",
  },
  {
    prompt:
      "A public web server needs to read one private bucket, but the team plans to embed an account-wide access key in its source code; which change is best?",
    options: [
      "Use a workload identity with short-lived, bucket-specific permissions and keep secrets out of source code",
      "Commit the key in an encrypted-looking filename",
      "Make every bucket public so the key is unnecessary",
      "Give the server permanent administrator credentials",
    ],
    modelAnswer:
      "A workload identity with least privilege avoids a long-lived embedded secret and restricts the server to the bucket it actually needs.",
    skillArea: "evaluation",
  },
];

const SUBJECT_TWOTHIRDS: DiagItem[] = [
  {
    prompt:
      "A load-balanced shopping site stores carts in each web server's local memory; after scaling out, customers sometimes lose carts; which conclusion is best?",
    options: [
      "The web tier is not truly stateless, so cart state should move to a shared data service",
      "The load balancer must always send every user to the largest server",
      "Horizontal scaling guarantees local state will be synchronized",
      "A larger server name will preserve carts",
    ],
    modelAnswer:
      "Local session state makes instances non-interchangeable; shared durable state is required for reliable horizontal scaling.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A database backup job reports success every night, but the business promises one-hour recovery and nobody has attempted a restore; which conclusion is strongest?",
    options: [
      "The recovery promise is unproven until a restore is completed and timed against the one-hour target",
      "A successful backup job guarantees every restore will finish within one hour",
      "Redundant web servers make database restores unnecessary",
      "The backup filename determines the recovery time",
    ],
    modelAnswer:
      "Backup creation proves a copy exists, not that the team can restore consistent data within the stated RTO.",
    skillArea: "inference",
  },
  {
    prompt:
      "A service needs no more than ten minutes of data loss after a failure; what must its recovery design demonstrate?",
    options: [
      "Backups or replication and restore procedures can recover to a point no more than ten minutes old",
      "The application server can reboot within ten minutes",
      "The provider advertises high durability for a different service",
      "The team can recreate the network diagram from memory",
    ],
    modelAnswer:
      "The ten-minute requirement is an RPO and must be supported by the data-protection interval and verified recovery procedure.",
    skillArea: "analysis",
  },
];

const SUBJECT_AFTER: DiagItem[] = [
  {
    prompt:
      "A team manually creates production networks and identities in the console, and nobody can reproduce or review the changes after an incident; which fix is most reliable?",
    options: [
      "Define the infrastructure as versioned code with reviewed plans, controlled application, and recorded state",
      "Ask one administrator to remember every click",
      "Permit emergency console changes without reconciliation",
      "Record only the final resource names in a document",
    ],
    modelAnswer:
      "Infrastructure as code makes the environment reproducible, reviewable, and auditable instead of depending on undocumented console actions.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A product launch survives on two stateless web instances, but every request still depends on one database in one zone; what evidence is missing from the team's high-availability claim?",
    options: [
      "A tested failure path showing the data tier remains available or recovers within the required objective when that zone fails",
      "A screenshot showing two web-server icons",
      "A larger web-server instance in the same zone",
      "A guarantee that load balancing duplicates the database",
    ],
    modelAnswer:
      "Redundant compute does not remove the single-zone database dependency; the availability claim needs a tested data-tier failure and recovery path.",
    skillArea: "inference",
  },
  {
    prompt:
      "During an incident, the team has application logs but cannot tell whether time is spent in the web tier, queue, or database; what control is missing?",
    options: [
      "Correlated metrics and distributed traces that show latency and request flow across services",
      "More unstructured log lines without request identifiers",
      "A policy to delete old telemetry during incidents",
      "A brighter dashboard background",
    ],
    modelAnswer:
      "Metrics reveal where latency changes and traces connect one request's path across services, filling the gap left by isolated logs.",
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
      baseTitle: `Cloud Architecture Check — ${PHASE_LABEL[phase]}`,
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
