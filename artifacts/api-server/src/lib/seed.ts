import { db } from "@workspace/db";
import {
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
  seedMetaTable,
} from "@workspace/db";
import { eq, sql, and, like, notInArray } from "drizzle-orm";
import { logger } from "./logger";

// Content version of the seeded curriculum. BUMP THIS whenever the TOPICS or
// ASSIGNMENTS content below changes. On boot, seedIfEmpty compares this against
// the value stored in seed_meta; a mismatch forces a full re-seed, so content
// edits self-heal in every environment (including a republished production)
// without a manual database wipe.
const SEED_CONTENT_VERSION = "2026-08-23-generative-ai-integration-v1";

type SeedTopic = {
  slug: string;
  title: string;
  weekNumber: number;
  blurb: string;
  lectureTitle: string;
  body: string;
  bodyMedium: string;
  bodyLong: string;
};

const TOPICS: SeedTopic[] = [
  {
    slug: "models-as-tools",
    title: "Models as tools",
    weekNumber: 1,
    blurb:
      "Understand the real model API—prompt in, tokens out—and the integration layer needed to turn probabilistic text into dependable software.",
    lectureTitle: "Models as tools: what a generative model actually gives you",
    body: `# Models as tools

A generative-model API has a narrow contract: your application sends a prompt and receives generated tokens. It does not automatically remember earlier calls, verify facts, retry failures, or guarantee a schema. Messages usually carry **system**, **user**, and **assistant** roles; roles help organize instructions and history, but your application must send the relevant history on every request.

The **context window** is a per-request token budget, not long-term memory. Input instructions, examples, retrieved documents, conversation history, and output all compete for that budget. **Temperature** and **top-p** adjust sampling, while **stop sequences** can end generation; none makes an answer true.

Software needs more than prose. **Structured output** constrains a response to a schema, and **tool calling** lets a model request that your code perform an action. Your code still validates arguments, authorizes and executes the action, and returns results. **Streaming** improves perceived responsiveness but does not reduce total generation work. Latency and token-based pricing must be estimated from expected input and output volume.

A chat-window demo often breaks in production because the chat product supplied state, retries, and presentation around the model. A reliable integration layer must supply those capabilities, plus validation, error handling, and observability.`,
    bodyMedium: `# Models as tools: the API surface

## Prompt in, tokens out

The model service accepts messages and generates tokens. That is the dependable boundary. A fluent answer is not a database record, verified decision, or durable conversation. The application owns everything around generation.

## Roles, context, and controls

A **system** message establishes standing behavior, a **user** message supplies the current request, and **assistant** messages represent prior model turns or examples. Role separation helps, but it is not a security boundary: untrusted text can still attempt to override instructions.

Models are stateless between API calls. To continue a conversation, the integration resends selected history. All resent history, instructions, examples, retrieved passages, and expected output occupy the finite **context window**. Treat it as a budget: trim, summarize, or retrieve selectively rather than assuming the model remembers.

**Temperature** broadens or narrows sampling; **top-p** limits sampling to a cumulative-probability set; **stop sequences** halt output at chosen boundaries. These are generation controls, not truth or safety controls. Changing several at once also makes behavior harder to evaluate.

## From text to software

Free-form prose is fragile input to downstream code. **Structured output** requests data matching a declared schema. The integration must still parse and validate it. **Function/tool calling** is a request from the model to invoke a named capability with arguments—not execution itself. Your loop receives the request, validates and authorizes it, runs trusted code, appends the result, and asks the model what to do next.

## Performance and economics

**Streaming** sends partial tokens as they arrive, improving time-to-first-visible-text while the full response may take just as long. Latency also includes network time, model queueing, tool calls, and retries. Pricing is generally token-based: estimate input tokens plus capped output tokens, multiply by per-token rates, then by traffic and retry assumptions.

## Why demos fail

A support reply that works in a hosted chat can fail through an API because no history was resent, a malformed response broke the parser, or a transient error had no retry. Production therefore needs a state store, prompt assembly, schema validation, bounded retries, fallbacks, logging, and cost controls.`,
    bodyLong: `# Models as tools: what a generative model actually gives you

## Start with the honest contract

A generative model is a probabilistic text component. An API request supplies messages; the response supplies generated tokens and metadata. The model does not inherently preserve conversation state, query your private systems, guarantee factuality, or ensure that its output can be consumed safely by code. Good architecture begins by refusing to attribute those integration capabilities to the model.

## Messages and instruction hierarchy

Chat APIs commonly expose **system**, **user**, and **assistant** roles. System content describes the application's intended behavior. User content carries a person's request and often untrusted material. Assistant content can replay earlier turns or provide demonstrations. Clear roles improve consistency, but prompt text remains data processed by a model rather than an enforceable permissions system. Authorization must live in code.

Every request is effectively fresh. A conversational feature must decide which earlier turns to resend. Blindly appending everything eventually overflows the **context window**, the finite token allowance shared by input and output. Instructions, examples, history, retrieved documents, and tool results all consume it. Budget explicitly: reserve output space, discard irrelevant turns, summarize cautiously, and retrieve only useful evidence. A context window is working space, not memory.

## The actual generation knobs

**Temperature** changes how strongly generation favors the highest-probability tokens. Lower values tend to be steadier; higher values tend to diversify output. **Top-p** samples from the smallest token set whose cumulative probability reaches the chosen threshold. **Stop sequences** terminate generation when a boundary appears. These knobs influence variation and length; they do not verify facts, enforce business rules, or eliminate nondeterminism. For controlled experiments, change one setting at a time and record model and prompt versions.

## Structured output and tools

Text becomes usable software data through an explicit output contract. A JSON schema can require fields, types, and allowed values. Still validate server-side because output can be incomplete, semantically wrong, or incompatible with business constraints.

Tool calling bridges language and capabilities. The model emits a proposed tool name and arguments. The application checks that the tool is allowed, validates arguments, applies user authorization and rate limits, performs the operation, records the result, and feeds that result back. This creates a loop: model request → trusted execution → tool result → model continuation. Put iteration limits and duplicate-action protections around the loop.

## Streaming, latency, and cost

Streaming improves perceived latency by rendering tokens incrementally. It complicates moderation and schema handling because partial output may be invalid until complete. End-to-end latency includes prompt preparation, retrieval, model generation, tools, retries, and validation. Measure each span rather than blaming a single model call.

Token pricing turns prompt design into system economics. Estimate input from fixed instructions, examples, average history, and retrieved chunks; add the maximum or expected output; apply model rates; then multiply by requests, retries, and tool-loop iterations. A prompt edit that doubles repeated context can double a large part of the bill. Set output caps and usage budgets before launch.

## Production anatomy

Suppose a team prototypes a support helper in a chat window. The hosted interface remembers turns and gracefully displays prose. In production, separate API calls have no conversation state, an occasional non-JSON sentence crashes a parser, and a timeout leaves the user waiting. The missing piece is not simply a 'better prompt.' The integration must assemble state, separate trusted instructions from untrusted content, validate schemas, retry only safe operations with backoff, offer a fallback, and record latency, token use, failures, and model versions. The model supplies generation; the system supplies reliability.`,
  },
  {
    slug: "building-with-generation",
    title: "Building with generation",
    weekNumber: 1,
    blurb:
      "Engineer prompts, retrieval, tools, evaluation, guardrails, and operations into a grounded generative feature that holds up after launch.",
    lectureTitle: "Building with generation: wiring a model into a real system",
    body: `# Building with generation

**Prompt engineering** is interface engineering: state instructions, include representative examples, and define an output contract. Then test the contract under realistic load instead of trusting a polished demo.

**Retrieval-augmented generation (RAG)** grounds answers in your documents. The system chunks documents, creates embeddings, retrieves nearby chunks with vector search, and places the best passages in context. Retrieval can find the correct document but the wrong passage, so chunking and ranking matter.

An **agent** repeats a controlled tool-use loop: the model proposes a call, code validates and executes it, and the result returns to the model. Limit iterations and permissions. Evaluate nondeterministic behavior with a representative **golden set**, repeat runs, regression tests, and carefully calibrated human or LLM judges.

Production guardrails include schema and business-rule validation, bounded retries, fallbacks, prompt-injection defenses, PII handling, and cost/rate limits. Deployment also needs caching, observability, and model-version pinning. A shipped help-center assistant therefore retrieves approved passages, generates a cited answer, validates it, and either returns it or falls back safely.`,
    bodyMedium: `# Building with generation

## Prompts are engineered interfaces

A robust prompt separates stable instructions, variable user data, examples, and an explicit output contract. Examples should cover common and difficult cases, not merely the happy path. Put rules that software can enforce—field types, permissions, maximum amounts—in code as well as prose. Test long inputs, conflicting instructions, empty retrieval, and malformed outputs.

## Retrieval-augmented generation

RAG connects generation to an owned knowledge source. Ingestion splits documents into **chunks**, computes **embeddings**, and stores vectors with source metadata. At request time, the question is embedded, **vector search** selects similar chunks, and those passages ground the prompt. Chunk boundaries can separate a rule from its exception; retrieving the right document is not enough if ranking selects the wrong passage. Tune chunk size and overlap, preserve metadata, and require citations that can be checked.

## Agents and tools

An agent is a loop around model tool requests. Code validates arguments, enforces permissions, executes a tool, and returns its result. The model may then answer or request another tool. Restrict the tool set, cap iterations, detect repeated calls, make side effects idempotent where possible, and require confirmation for consequential actions.

## Evaluation and guardrails

A nondeterministic component needs a representative **golden set** of inputs and expected qualities, repeated trials, and regression checks for prompt or model changes. Exact matching works for strict fields; rubric-based human review or **LLM-as-judge** can assess open text, but judges must be calibrated against human decisions and protected from seeing untrusted instructions as commands.

Guardrails form layers: input screening, prompt-injection isolation, retrieval controls, PII minimization, output/schema validation, bounded retries, fallback behavior, and rate/cost limits. A retry is useful for transient or repairable failures, not a license for an agent to loop forever.

## Deployment

Cache only when freshness and personalization allow it. Log request IDs, prompt/model versions, retrieval sources, token use, latency, validation failures, and tool traces without leaking sensitive content. Pin model versions and roll changes out against eval gates.

A support assistant's path is: user question → access check → retrieve help-center chunks → build prompt → generate a cited structured answer → verify citations and policy constraints → return or escalate.`,
    bodyLong: `# Building with generation: wiring a model into a real system

## Prompt engineering as engineering

Treat a prompt like a versioned program interface. Stable instructions define the task and boundaries; user content is clearly delimited as data; examples demonstrate edge cases; and the output contract states fields, types, allowed values, and what to do when evidence is missing. Avoid relying on vague requests such as 'be accurate.' If code can enforce a rule, enforce it there. Test prompts with realistic lengths, adversarial text, missing context, multilingual inputs, and simultaneous requests.

## Grounding with retrieval

Retrieval-augmented generation supplies relevant private or current evidence at request time. During ingestion, documents are cleaned, split into **chunks**, embedded, and stored in a vector index with titles, permissions, dates, and source links. During a request, the system embeds the query, performs similarity or hybrid search, reranks candidates, and inserts selected passages into the model context.

Chunking is an architectural choice. Tiny chunks lose surrounding conditions; huge chunks waste context and dilute the relevant sentence. Overlap can preserve continuity but duplicates evidence. Metadata filters prevent cross-tenant or obsolete material from being retrieved. A result can name the correct document yet quote the wrong passage, so evaluate retrieval separately from generation with recall and passage-relevance cases. Require abstention when evidence is absent and verify citations against the supplied text.

## Tool use and agents

Tool calling makes a model a planner over trusted capabilities, not the executor. The integration publishes narrow tool schemas; the model proposes a call; code validates types and business rules, checks the user's authorization, executes the tool, records a result, and supplies that result for the next turn. This loop can combine search, account lookup, and ticket creation.

Loops create risks: repeated calls, escalating cost, duplicate side effects, and prompt injection arriving through tool results. Limit steps and wall-clock time, deduplicate calls, use idempotency keys, sanitize results, expose least-privilege tools, and place human confirmation before irreversible actions. A looping agent usually needs control-flow protection, not merely friendlier wording.

## Evaluating a nondeterministic component

Build a **golden set** representing common requests, edge cases, safety cases, and previously observed failures. Define measurable criteria before comparing systems: factual grounding, completeness, citation validity, schema success, latency, and cost. Run multiple samples because one pass hides variance. Use deterministic assertions for schemas and citations, human review for high-stakes nuance, and **LLM-as-judge** for scale only after calibrating its rubric and agreement with humans. Blind judges to system identity where possible, and never let text being judged rewrite the judging instructions.

Every prompt, retrieval, guardrail, and model update should run as a regression candidate against the set. Compare quality and operational metrics, not one attractive answer. A demo demonstrates possibility; repeated representative tests provide evidence of reliability.

## Layered guardrails

Validation checks syntax, semantic constraints, citations, and business rules. Bounded retries can repair malformed JSON or transient service errors; retry prompts should include the specific failure and stop after a small limit. Fallbacks may use a simpler model, a deterministic workflow, cached approved copy, or human escalation.

Prompt injection is untrusted content attempting to redirect the model. Delimit retrieved and user text, tell the model to treat it as evidence rather than instructions, restrict tools independently in code, and validate the final action. Minimize **PII**, redact logs, apply retention policies, and avoid sending data the provider does not need. Rate limits, token caps, per-user quotas, and circuit breakers contain cost and abuse.

## Operating the feature

Caching can reduce latency and cost for stable, non-personalized requests, but keys must include relevant model, prompt, locale, and knowledge versions; stale policy answers can be worse than a miss. **Observability** should trace retrieval, generation, validation, tools, retries, latency, and tokens under a request ID while protecting sensitive text. **Model version pinning** prevents an upstream model change from silently altering production behavior. Release a new version through evals, canaries, and rollback criteria.

## End-to-end: a help-center support assistant

A user asks whether a recent purchase is refundable. The service authenticates the user and filters knowledge by region and product. It embeds the question, retrieves policy chunks, and reranks the passage containing the applicable window and exception. Prompt assembly includes trusted instructions, the question as untrusted data, and only those passages. The model returns a structured answer with citations and an uncertainty field. Code validates the schema, checks that each claim is supported by cited text, and ensures the assistant did not promise an unauthorized action. If evidence is weak or validation still fails after a bounded repair, the system escalates. Traces record versions, passages, token cost, and latency. That integration—not generation alone—is the shipped feature.`,
  },
];

type SeedAssignment = {
  kind: "homework" | "test" | "midterm" | "final";
  title: string;
  weekNumber: number;
  isTimed: boolean;
  timeLimitMinutes: number | null;
  instructions: string;
  problems: Array<{
    topicSlug: string;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>;
};

const ASSIGNMENTS: SeedAssignment[] = [
  {
    kind: "homework",
    title: "Homework 1 — Models as tools",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering Session 1. Explain each concrete case in 3–5 reasoned sentences. Definitions and one-word answers do not receive credit.",
    problems: [
      {
        topicSlug: "models-as-tools",
        prompt:
          "A travel app sends only the newest user message to a model API, although its chat-window prototype appeared to remember earlier preferences. Diagnose why production ignores the user's budget and explain what the integration should send without overflowing the context window. (3–5 sentences.)",
        correctAnswer:
          "API calls are stateless, so the model receives no earlier budget preference unless the application resends it. The hosted chat supplied history management that the raw API does not. The integration should assemble system instructions, the relevant preference, and selected recent turns while reserving context tokens for output. It can summarize or omit irrelevant history because the context window is a per-request budget, not memory.",
        explanation:
          "Full credit diagnoses stateless calls, distinguishes a context budget from memory, and proposes selective history assembly.",
      },
      {
        topicSlug: "models-as-tools",
        prompt:
          "A billing service asks a model for an account ID and refund amount, then issues the refund from whatever prose arrives. Redesign the flow using structured output or tool calling and identify what must remain in application code. (3–5 sentences.)",
        correctAnswer:
          "The model should return a schema-constrained proposal or request a narrow refund tool rather than emit executable prose. Code must validate fields, authenticate the user, enforce policy and authorization, and confirm consequential action before execution. A tool call is only a request; trusted code performs it and returns the result. Invalid output should trigger a bounded repair or safe fallback, not a refund.",
        explanation:
          "Full credit separates model proposals from execution and covers validation, authorization, and bounded failure handling.",
        hint: "Which responsibilities need deterministic enforcement by trusted code?",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2 — Building with generation",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering Session 2. Connect each observed failure to an architectural change in 3–5 reasoned sentences. Definitions and one-word answers do not receive credit.",
    problems: [
      {
        topicSlug: "building-with-generation",
        prompt:
          "A help-center assistant retrieves the correct returns-policy document but quotes a paragraph about exchanges instead of the nearby refund exception. Identify where the RAG pipeline is failing and propose changes that distinguish retrieval quality from generation quality. (3–5 sentences.)",
        correctAnswer:
          "The system has document recall but poor passage selection, likely due to chunk boundaries or ranking. Adjust chunk size and overlap so exceptions stay with governing rules, preserve headings as metadata, and rerank candidates. A retrieval test set should measure whether the right passage appears independently of the answer, while generation tests require claims and citations supported by supplied chunks. Prompting cannot recover evidence that was never selected.",
        explanation:
          "Full credit diagnoses passage retrieval/chunking, proposes concrete retrieval improvements, and evaluates retrieval separately from generation.",
      },
      {
        topicSlug: "building-with-generation",
        prompt:
          "A calendar agent calls create_event with identical arguments six times after a timeout, producing duplicate meetings and a large bill. Explain why a prompt reminder is inadequate and design controls for the agent loop. (3–5 sentences.)",
        correctAnswer:
          "Prompt wording cannot guarantee control over a probabilistic loop or duplicate side effects after an ambiguous timeout. The orchestrator should cap iterations and elapsed time, detect repeated calls, and use idempotency keys so a retry creates at most one event. It should validate and authorize arguments, retry only under a bounded policy, and fall back or request confirmation when the result is unknown. Tool, token, latency, and stop-reason traces make the failure diagnosable.",
        explanation:
          "Full credit moves guarantees into the orchestrator and covers loop limits, idempotency, bounded retries/fallbacks, and observability.",
      },
    ],
  },
  {
    kind: "test",
    title: "Course Test — Generative AI Integration",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 15,
    instructions:
      "Timed. 15 minutes. Covers both sessions. Analyze each concrete engineering case in 4–6 sentences. Definitions and unsupported one-line recommendations do not receive credit. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "models-as-tools",
        prompt:
          "A news-summary API sometimes emits commentary around JSON, feels slow, and costs twice the estimate after full article history is appended. Propose an integration plan addressing output reliability, perceived latency, context, and cost. (4–6 sentences.)",
        correctAnswer:
          "Use a structured-output schema, validate the completed response, and apply a bounded repair or fallback. Stream partial output or progress for perceived speed, while recognizing that final schema parsing may await completion. Select or summarize relevant material and reserve output tokens instead of appending all history. Estimate instructions, context, output caps, traffic, and retries against token rates, then monitor actual use. Pin prompt and model versions so quality, latency, and cost changes are attributable.",
        explanation:
          "Full credit integrates schema validation, streaming tradeoffs, context budgeting, and token-cost estimation and monitoring.",
      },
      {
        topicSlug: "building-with-generation",
        prompt:
          "A team ships a support prompt globally after five handpicked examples look better; complaints then rise for Spanish users and rare account cases. Design an evaluation process that would have produced stronger evidence before deployment. (4–6 sentences.)",
        correctAnswer:
          "Five handpicked examples show possibility, not reliability. Build a versioned golden set stratified by language, common requests, rare states, safety cases, and prior failures, with grounding, completeness, schema, latency, and cost criteria. Run repeated trials because output varies, using deterministic checks and calibrated human or LLM judges for open text. Compare candidate and current versions blindly and require thresholds for important slices, not only an average. Canary pinned versions with monitoring and rollback criteria.",
        explanation:
          "Full credit rejects demo-based generalization and proposes representative sliced golden sets, repeated testing, regression comparison, and controlled rollout.",
      },
      {
        topicSlug: "building-with-generation",
        prompt:
          "A retrieved web page tells a support assistant to ignore policy and call an account tool with another customer's ID. Explain how this crosses the RAG and agent layers and specify layered defenses. (4–6 sentences.)",
        correctAnswer:
          "The retrieved instruction is prompt injection: untrusted evidence is trying to become a command and exploit a tool. Restrict retrieval to trusted permission-filtered sources and delimit passages as data, but do not rely on prompting alone. Code must validate tool arguments, enforce user and tenant authorization, expose least-privilege tools, and confirm consequential actions. Add iteration and rate limits plus output/action validation, and log PII-safe retrieval and tool traces. Refuse or escalate when checks fail.",
        explanation:
          "Full credit traces injection from retrieval into tools and gives layered source, prompt, authorization, validation, privacy, and containment defenses.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final — Generative AI Integration",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 25,
    instructions:
      "Timed cumulative final. 25 minutes. Analyze each end-to-end case in 5–7 sentences connecting multiple course decisions. Definitions and unsupported labels do not receive credit. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "building-with-generation",
        prompt:
          "A university is launching an assistant grounded in its official help center that may open support tickets. Trace a safe, testable request from question to final answer, connecting retrieval, generation, tool use, validation, evaluation, and operations. (5–7 sentences.)",
        correctAnswer:
          "The service authenticates the student, embeds the question, permission-filters and reranks help-center chunks, and places the best passages in a bounded prompt. The model returns a structured cited answer and either abstains or proposes a narrow ticket tool call when evidence is insufficient. Code validates schema and citations, enforces authorization and PII rules, and validates arguments before idempotent execution with confirmation where needed. Bounded retries repair transient or formatting failures; persistent uncertainty escalates to a human. A representative golden set with repeated runs measures grounding, tool safety, latency, and cost before release. Pinned versions, safe caching, rate limits, and traces of retrieval, tokens, validation, and tools support canaries and rollback.",
        explanation:
          "Full credit gives a coherent architecture connecting grounded retrieval, structured generation, controlled tools, guardrails, evaluation, and operations.",
      },
      {
        topicSlug: "models-as-tools",
        prompt:
          "After a prompt edit, an insurance assistant's monthly cost triples, answers slow down, and cached replies sometimes expose another customer's details. Diagnose likely causes and give a safe remediation and rollout plan. (5–7 sentences.)",
        correctAnswer:
          "The edit may repeat more instructions, examples, history, or output, increasing billed tokens and generation latency; retries or tool steps may amplify both. Compare token and latency traces by pinned version, cap output, and trim or retrieve context. Streaming improves perceived responsiveness but does not remove total work. Cross-customer leakage means the cache key omitted identity or authorization context, so disable and purge it immediately. Cache only non-personalized content or isolate by complete tenant, user, policy, locale, prompt, model, and knowledge versions with expiry. Run quality, privacy, latency, and cost regressions, then canary under budgets and rollback thresholds.",
        explanation:
          "Full credit connects context and retries to cost and latency, treats streaming accurately, fixes cache isolation, and proposes versioned evaluation plus safe rollout.",
      },
    ],
  },
];

type SeedPrimer = Omit<SeedTopic, "bodyMedium" | "bodyLong">;

const REASONING_PRIMERS: SeedPrimer[] = [
  {
    slug: "reasoning-primer-subject",
    title: "How to reason about integration cases",
    weekNumber: 1,
    blurb:
      "Diagnostic primer: applying generative AI integration concepts to concrete system failures.",
    lectureTitle: "Primer: How to reason about integration cases",
    body: `# How to reason about integration cases

This primer prepares you for the **Generative AI Integration** diagnostic. It is ungraded, fresh on every attempt, and asks you to apply the two sessions rather than recite terms.

## It tests application, not memorization

A question gives a short scene: a chatbot invents a refund policy, an agent repeats a tool call, retrieval finds the right document but wrong passage, or costs triple after a prompt edit. Name the concept that explains the failure and point to the scene detail that decides it.

## What the questions reward

- **Naming the right idea** — distinguish stateless API behavior, context pressure, output-contract failure, retrieval/chunking, unsafe tool loops, weak evaluation, guardrail gaps, and operational failures.
- **Using evidence from the scene** — point to the detail in the situation that supports your answer, rather than answering from a general impression.
- **Avoiding the universal prompt fix** — decide whether the remedy belongs in prompting, retrieval, validation, authorization, loop control, evaluation, or deployment operations.

## How to do this activity well

1. **Read the situation first**, then ask which topic it belongs to.
2. **Find the detail that decides it** — what in the scene makes one answer better than another.
3. For written items, **give the core idea in a sentence or two** — clear and correct beats long and padded.

Take it as often as you like; the questions are freshly generated every time, and there is no penalty for any answer.`,
  },
  {
    slug: "reasoning-primer-general",
    title: "Core reasoning skills",
    weekNumber: 1,
    blurb:
      "Diagnostic primer: analysis, inference, evaluation, deduction, and induction.",
    lectureTitle: "Primer: Core reasoning skills",
    body: `# Core reasoning skills

This short primer prepares you for the **General Reasoning** diagnostic — an ungraded, fresh-attempt check of five genuine reasoning skills. The skills remain domain-general, with AI-system examples showing how they guide engineering judgment.

## The five skills

- **Analysis** separates what a system was given from what it produced. If a policy was absent from retrieved context, that matters differently from a model ignoring supplied policy.
- **Inference** distinguishes what an output proves from what it merely suggests. One good answer shows capability on one input, not production reliability.
- **Evaluation** asks whether evidence supports a decision. An eval missing rare and multilingual cases cannot justify a global launch even if its average is high.
- **Deduction** identifies architectural guarantees. If code rejects every unauthorized tool call, that action is blocked regardless of what the model requests.
- **Induction** generalizes cautiously from samples. A handful of demonstrations is weak evidence about varied real traffic; representative repeated tests support a stronger forecast.

## A recurring trap: things that move together

Most wrong answers sound plausible but outrun the evidence. Keep apart what facts show, what architecture guarantees, what you assume, and what is only possible. A prompt edit preceding a cost increase suggests a lead to investigate; token traces are stronger evidence of the mechanism.

## How to do this activity well

1. Find the **point** (conclusion) first, then the reasons.
2. Ask which of the five skills the question is testing (a hidden-assumption question is analysis; a "what follows" question is inference or deduction; a "how good is this reasoning" question is evaluation).
3. Pick the option that follows **only** from what you were given — not the one that merely sounds true or appealing.

Take it as often as you like; the questions are freshly generated every time, and it never affects your grade.`,
  },
];

// Insert any teaching-to-the-test primer lectures whose slug is not yet present.
// Safe to run on every boot: it only adds what is missing.
export async function seedReasoningPrimersIfMissing(): Promise<void> {
  const currentSlugs = REASONING_PRIMERS.map((p) => p.slug);
  // Remove any obsolete primer topics from earlier diagnostic models (their
  // lectures cascade-delete), so renamed/retired primers self-heal instead of
  // stranding stale content in existing or republished databases.
  const stale = await db
    .delete(topicsTable)
    .where(
      and(
        like(topicsTable.slug, "reasoning-primer-%"),
        notInArray(topicsTable.slug, currentSlugs),
      ),
    )
    .returning({ slug: topicsTable.slug });
  if (stale.length > 0) {
    logger.info(
      { removed: stale.map((s) => s.slug) },
      "Reasoning primers: removed obsolete primers",
    );
  }
  let added = 0;
  for (let i = 0; i < REASONING_PRIMERS.length; i++) {
    const t = REASONING_PRIMERS[i]!;
    const existing = await db
      .select({ id: topicsTable.id })
      .from(topicsTable)
      .where(eq(topicsTable.slug, t.slug));
    if (existing.length > 0) continue;
    const [inserted] = await db
      .insert(topicsTable)
      .values({
        slug: t.slug,
        title: t.title,
        weekNumber: t.weekNumber,
        blurb: t.blurb,
        position: 900 + i,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert primer ${t.slug}`);
    await db.insert(lecturesTable).values({
      topicId: inserted.id,
      weekNumber: t.weekNumber,
      title: t.lectureTitle,
      body: t.body,
    });
    added += 1;
  }
  if (added > 0) {
    logger.info({ added }, "Reasoning primers seeded");
  } else {
    logger.info("Reasoning primers: already present, skipping");
  }
}

export async function seedIfEmpty(): Promise<void> {
  // Detect the current curriculum marker. If present and version-matched, the
  // marker topic; if present and the content version matches, the content is
  // current and we skip. This makes the seed self-healing across environments:
  // a database that still holds older content (e.g. a previous curriculum) is
  // detected and replaced on boot.
  const markerTopic = await db
    .select({ id: topicsTable.id })
    .from(topicsTable)
    .where(eq(topicsTable.slug, "models-as-tools"));
  // Read the stored content version. Tolerate the seed_meta table not yet
  // existing (e.g. a boot that races ahead of schema migration): treat that as
  // "no version recorded", which forces a reseed once the table is present.
  let currentVersion: string | null = null;
  try {
    const storedVersion = await db
      .select({ value: seedMetaTable.value })
      .from(seedMetaTable)
      .where(eq(seedMetaTable.key, "content_version"));
    currentVersion = storedVersion[0]?.value ?? null;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Seed: seed_meta unavailable, treating version as unset");
    currentVersion = null;
  }
  if (markerTopic.length > 0 && currentVersion === SEED_CONTENT_VERSION) {
    logger.info("Seed: course content present and current, skipping");
    return;
  }
  if (markerTopic.length > 0) {
    logger.warn(
      { storedVersion: currentVersion, expected: SEED_CONTENT_VERSION },
      "Seed: course content present but out of date — re-seeding with the current curriculum",
    );
  }

  // No current content. Either the database is empty (fresh) or it still holds
  // an older curriculum. Do the (optional) wipe and the full reseed in a SINGLE
  // transaction so the marker topic only ever becomes visible once the entire
  // curriculum has committed. A crash mid-seed rolls back, so the next boot
  // retries instead of leaving partial content that the marker check would
  // wrongly treat as healthy. TRUNCATE also takes an ACCESS EXCLUSIVE lock, so
  // concurrent readers never observe a half-empty course during the replace
  // window. The diagnostic tables are truncated here too so the (non
  // version-gated) diagnostic seed repopulates them with the current content on
  // the same boot.
  await db.transaction(async (tx) => {
    const existing = await tx.execute(sql`select count(*)::int as n from topics`);
    const row = (existing.rows[0] ?? {}) as { n?: number };
    if ((row.n ?? 0) > 0) {
      logger.warn(
        "Seed: stale course content detected — replacing with Generative AI Integration",
      );
      await tx.execute(
        sql`TRUNCATE TABLE answers, attempts, practice_attempts, practice_problems, practice_sessions, problems, assignments, lectures, topics, diagnostic_responses, diagnostic_attempts, diagnostic_items, diagnostic_assessments RESTART IDENTITY CASCADE`,
      );
    } else {
      logger.info("Seed: populating course content");
    }

    // Topics + lectures
    const slugToTopicId = new Map<string, number>();
    for (let i = 0; i < TOPICS.length; i++) {
      const t = TOPICS[i]!;
      const [inserted] = await tx
        .insert(topicsTable)
        .values({
          slug: t.slug,
          title: t.title,
          weekNumber: t.weekNumber,
          blurb: t.blurb,
          position: i,
        })
        .returning();
      if (!inserted) throw new Error(`Failed to insert topic ${t.slug}`);
      slugToTopicId.set(t.slug, inserted.id);
      await tx.insert(lecturesTable).values({
        topicId: inserted.id,
        weekNumber: t.weekNumber,
        title: t.lectureTitle,
        body: t.body,
        bodyMedium: t.bodyMedium,
        bodyLong: t.bodyLong,
      });
    }

    // Assignments + problems
    for (let i = 0; i < ASSIGNMENTS.length; i++) {
      const a = ASSIGNMENTS[i]!;
      const [inserted] = await tx
        .insert(assignmentsTable)
        .values({
          kind: a.kind,
          title: a.title,
          weekNumber: a.weekNumber,
          position: i,
          isTimed: a.isTimed,
          timeLimitMinutes: a.timeLimitMinutes,
          instructions: a.instructions,
        })
        .returning();
      if (!inserted) throw new Error(`Failed to insert assignment ${a.title}`);
      for (let p = 0; p < a.problems.length; p++) {
        const prob = a.problems[p]!;
        const topicId = slugToTopicId.get(prob.topicSlug);
        if (!topicId) throw new Error(`Unknown topic slug ${prob.topicSlug}`);
        await tx.insert(problemsTable).values({
          assignmentId: inserted.id,
          topicId,
          position: p,
          prompt: prob.prompt,
          correctAnswer: prob.correctAnswer,
          explanation: prob.explanation,
          hint: prob.hint ?? null,
        });
      }
    }

    // Stamp the content version last, inside the same transaction, so the
    // marker check on the next boot only treats the course as "current" once
    // the entire curriculum has committed.
    await tx
      .insert(seedMetaTable)
      .values({ key: "content_version", value: SEED_CONTENT_VERSION })
      .onConflictDoUpdate({
        target: seedMetaTable.key,
        set: { value: SEED_CONTENT_VERSION, updatedAt: new Date() },
      });
  });

  logger.info(
    { topics: TOPICS.length, assignments: ASSIGNMENTS.length, version: SEED_CONTENT_VERSION },
    "Seed complete",
  );
}
