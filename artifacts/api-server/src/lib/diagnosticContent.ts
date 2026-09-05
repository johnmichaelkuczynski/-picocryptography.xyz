// ---------------------------------------------------------------------------
// Original content for the embedded diagnostic reasoning assessments.
//
// Two instruments, each offered at FOUR time-points (phases) so a student can
// gauge themselves before, during, and after the course:
//   - subject  — Cryptography reasoning. Realistic security cases; the best-supported answer
//     is keyed first.
//   - general  — General Reasoning. Genuine reasoning items spanning analysis,
//     inference, evaluation, deduction, and induction (NOT a "docility"/agree-
//     with-authority test).
//
// Each (instrument, phase) is offered in THREE selectable answer formats that
// share the same kind of questions:
//   - mcq     — pick the single best option.
//   - hybrid  — pick the best option AND write a short reasoned note.
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
      "Intro level: answerable by a thoughtful newcomer before lessons. Avoid unexplained vocabulary and reward multi-sentence reasoning from concrete evidence.",
    topicFocus:
      "Everyday secret-message and password cases: repeated symbol patterns, the danger of reusing secret material, the difference between hiding and proving origin, and why implementation details matter.",
  },
  third: {
    level:
      "Early-course level covering Hour 1. Require a short, reasoned application rather than terminology recall.",
    topicFocus:
      "Substitution ciphers, frequency and word-pattern attacks, one-time-pad perfect secrecy, true randomness, key length, secure delivery, and the catastrophic effect of pad reuse.",
  },
  twothirds: {
    level:
      "Mid-course level covering Hours 1–3. Require a concrete diagnosis and justified consequence.",
    topicFocus:
      "Substitution and one-time pads; block-cipher modes, pattern leakage, nonces and authenticated encryption; hashes, salts and password hashing; public key agreement, authentication, encryption and signatures.",
  },
  after: {
    level:
      "End-of-course level covering all four hours. Use concise integrative cases requiring at least two explanatory sentences.",
    topicFocus:
      "The full course: classical pattern leakage and one-time pads; block encryption, nonces and integrity; hashes and password storage; authenticated key agreement, public keys and signatures; weak randomness, side channels and human failures; quantum threats, post-quantum migration, crypto agility and backdoors.",
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
      ? "Answer each Cryptography case — these reward careful application to the scene, not memorized definitions"
      : "Answer each reasoning question — these measure how you think, not what you recall";
  const body =
    format === "mcq"
      ? `${subject} by selecting the single best option.`
      : format === "hybrid"
        ? `${subject} by selecting the best option and adding a two-sentence note connecting the decisive evidence to the conclusion.`
        : `${subject}. No answer options are shown — explain the decisive evidence and its consequence in at least two sentences.`;
  return `${body} This is ungraded practice — take it anytime, as many times as you like; it never affects your course grade. Submitting shows your results with written feedback.`;
}

// ===========================================================================
// SUBJECT — Cryptography blueprint cases (best answer keyed FIRST)
// ===========================================================================

const SUBJECT_BEFORE: DiagItem[] = [
  {
    prompt:
      "A puzzle club replaces each letter with the same secret symbol in every newsletter. After collecting a year of messages, an outsider identifies repeated words and uneven symbol counts; which analysis best explains the risk and the appropriate response?",
    options: [
      "The fixed mapping preserves language patterns across messages, so the outsider can combine counts and word shapes to test guesses. The club should replace substitution with modern randomized encryption rather than merely rearrange the alphabet.",
      "The outsider can only succeed if the club publicly reveals the alphabet. Choosing different symbols while retaining one fixed mapping therefore solves the problem.",
      "Uneven counts prove that the messages were altered in transit. The club should keep the cipher and add a file checksum.",
      "Repeated words reveal only message length, not letter relationships. Removing spaces is therefore a complete repair.",
    ],
    modelAnswer:
      "A fixed substitution preserves frequency and word-shape evidence that accumulates across messages. A new fixed alphabet has the same structural weakness, so the club needs modern randomized encryption.",
  },
  {
    prompt:
      "Two rescue teams possess matching pages of truly random key material, but one team proposes reusing Monday’s page for Tuesday’s message after supplies run low. Which response best evaluates that plan?",
    options: [
      "Reuse destroys the one-time condition and lets an interceptor cancel the repeated key to expose relationships between messages. They should delay, securely obtain fresh pad material, or use a properly authenticated modern protocol.",
      "Reuse remains perfectly secret because each original page was random. They only need to keep the page number hidden.",
      "Reuse is safe when the two messages have different lengths. They should add blank characters to make that difference larger.",
      "The danger is only accidental deletion of the page. Photographing it for backup preserves the mathematical guarantee.",
    ],
    modelAnswer:
      "Using a random pad twice lets ciphertexts cancel the same key and reveal a relation between plaintexts. The teams must never reuse pad material and need a secure alternative when fresh material is unavailable.",
  },
  {
    prompt:
      "A download site encrypts a software installer so visitors cannot read it in transit, but provides no trusted signature or authenticated source. A visitor assumes encryption proves the vendor created the file; which evaluation is best?",
    options: [
      "Confidential transport can hide bytes without proving who supplied them. The visitor also needs an authenticated connection or a signature verified with a vendor key obtained through a trusted binding.",
      "Any encryption proves authorship because only the vendor can create ciphertext. No separate identity check is needed.",
      "A larger encrypted file is harder to forge, so file size supplies the missing trust. The visitor should compare byte counts.",
      "Keeping the encryption algorithm secret proves the source. Publishing verification information would weaken it.",
    ],
    modelAnswer:
      "Secrecy and origin authentication are different guarantees. The visitor needs a trustworthy binding to the vendor and must verify the connection or signature before trusting the installer.",
  },
];

const SUBJECT_THIRD: DiagItem[] = [
  {
    prompt:
      "An archivist attacks a long message encrypted with one secret substitution alphabet. The most common symbol is not E, but repeated double symbols and a recurring three-letter word appear; which approach is best?",
    options: [
      "Treat frequency as probabilistic evidence and combine it with word shapes, repeated letters, and contextual guesses. Test substitutions against the whole message rather than committing to one count.",
      "Declare the most common symbol to be E even when the resulting words fail. Frequency rules are exact for every individual text.",
      "Conclude the cipher is unbreakable because the top count differs from average English. No other language pattern is useful.",
      "Sort the ciphertext symbols alphabetically and read them in that order. Substitution changes positions rather than identities.",
    ],
    modelAnswer:
      "Frequency analysis combines noisy counts with repeated-letter and word-shape constraints. A good hypothesis should make multiple parts of the plaintext coherent, not merely match one average.",
    skillArea: "analysis",
  },
  {
    prompt:
      "A journalist uses a short memorable quotation repeatedly as a supposed one-time pad for reports of varying length. An interceptor sees many ciphertexts; what follows and why?",
    options: [
      "The scheme lacks both true randomness and one-time use, so repeated key structure can be canceled or inferred across reports. A genuine pad must be random, message-length, secret, and never reused.",
      "The quotation is safe because readers do not know which book contains it. Familiar language becomes random after encryption.",
      "Varying report lengths prevent comparison between ciphertexts. Reuse matters only when lengths are exactly equal.",
      "The scheme gains perfect secrecy if punctuation is removed. Pad quality depends only on formatting.",
    ],
    modelAnswer:
      "A repeated quotation is predictable and reused, violating core one-time-pad conditions. Multiple ciphertexts give an attacker exploitable structure rather than perfect secrecy.",
    skillArea: "inference",
  },
  {
    prompt:
      "A museum has enough genuine random pad material for one emergency message. Staff want to copy it into several backups and reuse it for convenience; which policy best preserves the claimed security?",
    options: [
      "Restrict access to the single necessary copy, track exactly which segment is consumed, and destroy it after use. If reliable one-time handling is impractical, choose an authenticated modern cipher instead of weakening the pad rules.",
      "Create many copies because identical random material remains one-time material. More availability cannot affect secrecy.",
      "Reuse is acceptable for messages on different subjects. Meaning, rather than key reuse, determines security.",
      "Store the pad beside the ciphertext so operators cannot lose it. Physical proximity does not alter exposure.",
    ],
    modelAnswer:
      "Perfect secrecy depends on tightly controlled, uniquely consumed key material. Operational convenience that creates copies or reuse defeats the guarantee, so a practical authenticated cipher may be safer.",
    skillArea: "evaluation",
  },
];

const SUBJECT_TWOTHIRDS: DiagItem[] = [
  {
    prompt:
      "A satellite team encrypts map tiles by applying the same block-cipher key independently to every block. Coastlines remain visible in the output; which diagnosis and repair are best?",
    options: [
      "Independent equal blocks produce equal ciphertext blocks, preserving image structure. Use a vetted authenticated-encryption mode with unique nonces and verify tags before accepting data.",
      "The key is necessarily too short because all visible patterns prove brute force. Doubling the same key removes the coastlines.",
      "Images cannot be encrypted securely because neighboring pixels resemble one another. Compressing the ciphertext afterward supplies secrecy.",
      "The map needs a password hash rather than encryption. Hashing would still permit authorized users to recover the original image.",
    ],
    modelAnswer:
      "The block mode leaks equality even if the primitive is strong. Authenticated encryption with correctly managed unique nonces hides repetition and detects modification.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A forum salts each password but computes a single fast SHA-256 hash. After theft, attackers guess common passwords offline at high speed; which conclusion and change are strongest?",
    options: [
      "Salts prevent shared precomputed results but do not make each guess expensive. Move to a tuned memory-hard password-hashing function while retaining unique salts and upgrading records safely.",
      "The salt failed because it was stored beside the hash. Hiding one shared salt is the only required repair.",
      "SHA-256 is cryptographically broken whenever it is used with a password. Encrypting all passwords with one reversible key is safer.",
      "Offline guessing can be stopped by adding a login rate limit. The attacker must still use the forum’s login page.",
    ],
    modelAnswer:
      "A salt provides uniqueness, not computational cost. A memory-hard password function slows each offline candidate while unique salts continue to prevent reuse of work across accounts.",
    skillArea: "inference",
  },
  {
    prompt:
      "A chat app performs unauthenticated public-key agreement on hostile Wi-Fi and then encrypts messages with the derived key. Users never verify identities; what attack remains and what must change?",
    options: [
      "An active intermediary can establish separate secrets with each user and relay readable messages. Bind the agreement to verified identities through trusted certificates, signatures, or an explicit key-verification process.",
      "Only passive listening remains because any public-key agreement authenticates both ends. Increasing symmetric key length completes the design.",
      "The public values must be hidden before agreement begins. Sending them through encryption solves the original delivery problem without authentication.",
      "The app should reuse one session key forever so users recognize it. Key age supplies identity proof.",
    ],
    modelAnswer:
      "Unauthenticated agreement protects against passive observation but not an active middle person. The protocol must bind the exchanged keys to identities the users actually trust.",
    skillArea: "analysis",
  },
];

const SUBJECT_AFTER: DiagItem[] = [
  {
    prompt:
      "A door controller uses a respected encryption algorithm, but keys come from the installation timestamp and its response time reveals how many tag bytes match. Which assessment best directs the incident response?",
    options: [
      "Attackers can search the small timestamp-derived key space and exploit timing leakage without defeating the cipher’s mathematics. Replace keys from a cryptographic random source, deploy vetted constant-time verification, and investigate past exposure.",
      "A respected cipher makes key generation and comparison behavior irrelevant. The team should merely rename the algorithm in documentation.",
      "Timing proves only that the controller is slow, not that secrets can leak. Faster hardware is the complete repair.",
      "Installation timestamps are unpredictable because clocks advance continuously. Reusing the same generation method for new keys is safe.",
    ],
    modelAnswer:
      "Predictable randomness and secret-dependent timing create practical attacks around a sound primitive. Response requires new unpredictable keys, constant-time vetted code, and an exposure investigation.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A vendor signs updates correctly, but an attacker steals the private key from a developer laptop and publishes malware with valid signatures. Which response best reflects what failed?",
    options: [
      "The signature mathematics still verifies, but the operational trust claim has collapsed because the attacker controls the signing identity. Revoke the key, block affected releases, investigate, and move signing to restricted protected storage with audited access.",
      "Valid verification proves the malware came from the legitimate vendor, so no incident occurred. Private-key location cannot change signature meaning.",
      "Encrypt the malware after signing it so attackers cannot distribute it. Confidentiality restores the compromised signing identity.",
      "Publish the stolen private key so customers can compare it. Wider key access strengthens non-forgeability.",
    ],
    modelAnswer:
      "Signatures authenticate control of a private key, so theft lets the attacker forge the vendor’s authority. The vendor must revoke and replace that trust anchor and harden the signing process.",
    skillArea: "inference",
  },
  {
    prompt:
      "A thirty-year archive is offered an unpublished quantum-proof cipher and a universal government recovery key. Which plan best manages the actual risks?",
    options: [
      "Inventory long-lived cryptography, prioritize harvest-now-decrypt-later exposure, and stage standardized post-quantum migration with agility and testing. Reject unreviewed algorithms and recognize that a universal recovery key creates a high-value systemic access path.",
      "Deploy the unpublished cipher immediately because any quantum label outranks public review. Add the recovery key later without changing risk.",
      "Do nothing until a quantum computer publicly decrypts current traffic. Long-lived ciphertext collected today cannot be affected later.",
      "Replace only symmetric encryption with the vendor product because quantum attacks affect all algorithms identically. Public-key migration can wait indefinitely.",
    ],
    modelAnswer:
      "Long confidentiality horizons justify planned adoption of reviewed post-quantum standards, not panic purchases. Crypto agility supports migration, while a universal backdoor adds an enduring target and failure mode.",
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
      "A school report says, “Every student in Room 4 who attended the review passed. Maria attended a review, so she passed.” Which analysis best identifies what the principal must check before accepting the conclusion?",
    options: [
      "The principal must check that Maria was in Room 4 and attended the review covered by the report. Without that link, the general statement may describe a different group.",
      "The principal must prove that review attendance is the only possible way to pass. Otherwise no student’s result can be inferred.",
      "The principal should assume Maria always attends reviews because she attended one. A repeated habit is already established.",
      "The principal should investigate whether the exam was difficult. Difficulty alone determines whether this deduction is valid.",
    ],
    modelAnswer:
      "The conclusion requires Maria to belong to the exact group covered by the first statement. Attending some review does not establish that she was a Room 4 student at the specified review.",
    skillArea: "analysis",
  },
  {
    prompt:
      "A neighborhood survey finds that 70% of daily exercisers report good sleep, compared with 30% of non-exercisers. The mayor wants to claim exercise guarantees sleep improvement; which advice best applies the evidence?",
    options: [
      "Report that daily exercise is associated with more self-reported good sleep in this sample. Do not claim a guarantee or cause without ruling out selection, measurement, and other differences.",
      "State that exercise guarantees good sleep because 70% is a majority. The remaining participants do not affect that conclusion.",
      "State that poor sleep causes people to stop exercising because the groups differ. The direction of cause follows from the percentages.",
      "Require every resident with poor sleep to exercise daily because no other explanation is possible. A survey establishes the necessary treatment.",
    ],
    modelAnswer:
      "The survey supports an association in the sampled reports, not a universal guarantee. It does not by itself establish causal direction or eliminate confounding factors.",
    skillArea: "inference",
  },
  {
    prompt: "A clinic is deciding whether to adopt a new medication. It has a manufacturer advertisement, one patient testimonial, a wellness post, and a large peer-reviewed controlled trial; which evaluation should guide the committee?",
    options: [
      "Give the controlled trial the most weight because it systematically compares many patients and has undergone expert review. Then inspect its methods, adverse-event data, and applicability to the clinic’s patients.",
      "Give the testimonial the most weight because firsthand satisfaction rules out population-level harms. One vivid experience is more reliable than a comparison.",
      "Give the advertisement the most weight because the manufacturer knows the product best. Its financial interest increases independence.",
      "Give the wellness post the most weight because popularity is evidence of methodological quality. Reader count substitutes for controlled data.",
    ],
    modelAnswer:
      "The large controlled trial is the strongest listed source because it offers systematic comparative evidence and review. The committee should still evaluate its methods and relevance rather than treating publication as automatic proof.",
    skillArea: "evaluation",
  },
  {
    prompt:
      "A park manager’s tested rule says that if it rained overnight, the uncovered sensor strip will be wet at dawn. The strip is dry and functioning normally; which reasoning should guide the manager’s report?",
    options: [
      "Conclude that it did not rain under the stated conditions. Rain would imply a wet functioning strip, and the observed dry strip rules that possibility out.",
      "Conclude that it rained because the manager expected rain. Expectations override the conditional observation.",
      "Conclude that the strip dried for another reason even though the scenario rules that out. Any imagined exception defeats deduction.",
      "Conclude that nothing follows because conditional statements never support conclusions. The strip’s state is irrelevant.",
    ],
    modelAnswer:
      "Given the stated reliable rule and functioning strip, rain would require wetness. The dry reading therefore supports the deductive conclusion that it did not rain.",
    skillArea: "deduction",
  },
  {
    prompt:
      "A gardener randomly gives half of otherwise comparable plants a new fertilizer while holding light and water constant. The treated plants grow taller; which conclusion and next step are best supported?",
    options: [
      "The controlled comparison supports the fertilizer as the likely cause of the extra growth in this trial. Replication across more plants and conditions would test how broadly the effect holds.",
      "The taller plants must have caused the earlier fertilizer assignment. Random assignment permits outcomes to travel backward in time.",
      "The trial proves no plant can grow without this fertilizer. A difference in height establishes absolute necessity.",
      "The result must be coincidence because induction never supports causal conclusions. Controls and random assignment add no evidence.",
    ],
    modelAnswer:
      "Random assignment and controlled conditions make the fertilizer the best-supported cause of the observed difference. Repetition would strengthen confidence and reveal whether the result generalizes.",
    skillArea: "induction",
  },
  {
    prompt:
      "A city analyst notices that ice-cream sales and drowning incidents both rise in the same months. A council member proposes restricting ice cream to prevent drownings; which response best evaluates the pattern?",
    options: [
      "Investigate a shared factor such as hot weather, which can increase swimming and ice-cream purchases. The correlation alone does not show that restricting one will reduce the other.",
      "Adopt the restriction because simultaneous increases prove ice cream causes drowning. No mechanism or comparison is needed.",
      "Increase swimming restrictions only after ice-cream sales fall because drowning causes purchases. Reversing the proposed direction establishes causation.",
      "Discard the data because correlated trends are always errors. A third factor cannot produce two real changes.",
    ],
    modelAnswer:
      "A common cause such as hot weather plausibly explains both trends. The observed correlation does not establish that ice-cream sales cause drowning, so the policy needs stronger causal evidence.",
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
      baseTitle: `Cryptography Check — ${PHASE_LABEL[phase]}`,
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
