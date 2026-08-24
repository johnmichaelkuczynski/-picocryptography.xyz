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
const SEED_CONTENT_VERSION = "2026-08-24-machine-learning-operations-v1";

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
    slug: "model-to-product",
    title: "From model to product",
    weekNumber: 1,
    blurb:
      "Move a trained model out of a notebook and into a reproducible, versioned service with dependable data, features, packaging, and deployment.",
    lectureTitle: "From model to product",
    body: `# From model to product

A working notebook proves that a model can run in one environment on one snapshot of data. A working product must repeat that result with new data, under real traffic, after people and dependencies change. **MLOps** closes this gap by treating data, code, models, and deployment as one operated system.

The first dependency is the **data pipeline**: where training examples come from, how they are cleaned and labeled, and what happens when a source changes. Teams must version **code, data, and model artifacts** together so a prediction can be traced back to the exact materials that produced it. Reproducibility means the same versioned inputs and environment can recreate the result months later.

Production inputs can differ from training inputs. This **training-serving skew** often appears when a column is calculated differently online, a category is encoded differently, or a feature arrives late. Shared feature definitions and a **feature store** can reduce duplicated calculations and keep training and serving aligned.

Deployment may mean scheduled batch scoring, a real-time endpoint, or a model embedded inside an application. Each form needs packaging, dependency control, validation, and rollback. A fraud model that scored perfectly in testing can still fail immediately if a production database column means something different from the training column; the operational system, not the notebook score, determines whether the model works.`,
    bodyMedium: `# From model to product

## A notebook is an experiment, not a service

A notebook usually depends on a particular machine, manually prepared data, hidden state, and an informal sequence of cells. A production service must accept defined inputs, return predictions consistently, handle failures, meet latency and cost targets, and be deployable again by someone other than the original author. The gap is not just software packaging; it is the loss of all the assumptions that made the experiment work.

## Data pipelines are part of the model

Training data comes from operational databases, event streams, files, labels, and joins. Sources change: fields are renamed, units shift, timestamps arrive late, and labels are corrected. A robust pipeline validates schemas, records lineage, checks missingness and ranges, and fails visibly instead of silently training on changed meaning.

## Version code, data, and model together

A model file alone cannot explain a prediction. The team also needs the code revision, training-data snapshot or query, feature definitions, configuration, dependencies, and evaluation results. A model registry can connect these artifacts to an approved release. **Reproducibility** means a future team can rebuild or closely recreate the model from those recorded inputs, rather than hoping an old notebook still runs.

## Prevent training-serving skew

Training-serving skew occurs when the model sees one representation during training and another in production. For example, a fraud team may train on a field measured in dollars while the production service receives cents. Offline accuracy remains excellent while live predictions become useless. Shared transformation code, contract tests, feature validation, and comparison of offline and online feature distributions expose the mismatch.

## Package and deploy for the actual use

**Batch scoring** is suitable when predictions can be computed on a schedule. A **real-time endpoint** supports interactive decisions but adds strict latency and availability requirements. An **embedded model** can reduce network latency but makes device compatibility and update distribution important. In every case, package dependencies, expose health and prediction contracts, record versions, and retain a safe rollback path.

## Why feature stores exist

When teams repeatedly compute the same customer-age, account-risk, or activity features, definitions drift. A feature store centralizes reusable definitions and can serve consistent offline training values and online prediction values. It does not automatically fix bad data, but it reduces duplicated logic and makes ownership and freshness explicit.`,
    bodyLong: `# From model to product

## The experiment-to-service gap

A notebook answers a narrow question: can this algorithm learn something useful from this prepared dataset in this environment? A product must answer a larger one: can an organization deliver the prediction repeatedly, safely, and economically as data and software change? Production adds input contracts, concurrency, latency, availability, security, observability, deployment, and ownership. It also removes the researcher's ability to repair every run manually.

The first production design task is to write down the prediction contract. Define when a prediction is requested, which entity it concerns, which features are required, how missing values are handled, what the output means, how quickly it must arrive, and what the application does when scoring fails. This contract determines whether batch, real-time, or embedded deployment is appropriate.

## Data pipelines and lineage

Training data is produced, not found. Operational tables, event logs, human labels, third-party feeds, and feature calculations are combined into a training set. Every step can change meaning. A source team may rename a field, switch a unit, backfill history, alter a join key, or delay an event. If a pipeline silently accepts the change, a model can train successfully on the wrong problem.

Production pipelines therefore need schema checks, range and null checks, freshness expectations, label-quality checks, and lineage. Lineage links each model version to the source snapshots, queries, transformations, and approvals that created it. Failures should stop or quarantine a run rather than publishing an apparently valid artifact.

## Three linked version histories

MLOps versions **code, data, and models** together. Code includes preprocessing, feature logic, training, evaluation, and serving. Data versioning may use immutable snapshots, table versions, timestamps, or reproducible queries. Model artifacts include learned parameters plus metadata such as metrics, training configuration, dependency versions, and intended input schema.

A registry gives each candidate a stable identity and lifecycle: trained, evaluated, approved, deployed, retired. Reproducibility does not require every nondeterministic training run to produce identical floating-point weights; it requires enough recorded information to rerun the process, explain differences, and reconstruct the release decision.

## Training-serving skew

The most dangerous failure can occur when the model is correct for the data it was trained on but receives different data in production. Common causes include duplicated transformation code, different default values, timezone differences, stale features, inconsistent category encoding, and fields whose names stayed constant while their business meaning changed.

Imagine a fraud model trained on the amount field from an analytics table where values are dollars. The live transaction service sends that field in cents. Offline testing remains excellent because the training and test split share the same interpretation. On launch, nearly every amount is one hundred times larger than expected. Input schema checks alone may not catch this because the type is still numeric. Contract tests, unit metadata, distribution comparisons, and shared feature transformations are needed.

## Packaging and deployment choices

Batch scoring writes predictions on a schedule and is operationally simpler, but its answers can become stale. A real-time endpoint makes decisions at request time and must handle traffic spikes, timeouts, dependency failures, and strict latency budgets. An embedded model runs inside another application or device, reducing network dependence while complicating hardware compatibility, release distribution, and telemetry.

Whichever pattern is used, the artifact must be packaged with pinned dependencies and an explicit input/output contract. Deployment should record the model, code, feature, and configuration versions. Smoke tests should verify that the service can load the artifact and score representative inputs. A release should support shadowing, canaries, and rollback rather than replacing the previous model irreversibly.

## Feature consistency and feature stores

A feature store exists because independently recomputing common features produces inconsistent definitions and wasted work. It can centralize ownership, transformation logic, freshness, lineage, and access. The strongest systems support both offline retrieval for training and low-latency online retrieval for serving while preserving point-in-time correctness.

A feature store is not a cure for weak governance. Teams still need to know whether a feature is legally and ethically appropriate, whether it leaks future information into training, and whether it will be available at prediction time. Its value is operational consistency: the same named feature should mean the same thing wherever the model uses it.

## End-to-end production readiness

Before release, a team should be able to answer: Which data and code produced this model? Can the build be repeated? Do online features match offline definitions? What input distributions are expected? Which deployment pattern meets the product need? How will the team detect a bad release and restore the prior version? A high offline score is evidence about a model candidate. A reproducible, observable, reversible delivery process is evidence that it can become a product.`,
  },
  {
    slug: "keeping-it-running",
    title: "Keeping it running",
    weekNumber: 1,
    blurb:
      "Operate deployed models through prediction monitoring, drift detection, retraining decisions, controlled releases, cost and latency management, and auditable incident response.",
    lectureTitle: "Keeping it running",
    body: `# Keeping it running

A model service can be healthy while its predictions are becoming wrong. MLOps monitoring therefore goes beyond uptime and error rates to watch inputs, features, prediction distributions, confidence, latency, cost, and—when it finally arrives—outcome quality.

**Data drift** means the input distribution changed. **Concept drift** means the relationship between inputs and the desired outcome changed. Neither automatically proves the model is failing, but both are reasons to investigate. Because ground truth may arrive days or months later, teams also monitor leading indicators such as feature ranges, missingness, score distributions, business overrides, and disagreement with a shadow model.

Retraining can be scheduled, triggered by evidence, or deliberately avoided when labels are weak or change risk is high. A candidate should not replace production automatically: compare it through offline evaluation, shadow deployment, canaries, or A/B tests, and preserve rollback.

Operations must balance quality with latency and cost. Incidents require an audit trail showing which code, data, feature, model, and configuration versions were deployed, when they changed, and who approved them. A recommendation system can decay for six weeks without any server failing; prediction monitoring and delayed-outcome evaluation are what reveal that it is gradually wrong.`,
    bodyMedium: `# Keeping it running

## Monitor predictions, not only servers

Traditional service metrics—uptime, CPU, memory, request failures—show whether the endpoint is available. They do not show whether predictions remain useful. Model monitoring adds input schema and freshness, feature distributions, prediction rates and score distributions, latency, cost, override rates, and later, outcome metrics such as precision or revenue impact.

## Drift and delayed truth

**Data drift** occurs when live inputs differ from the training distribution. **Concept drift** occurs when the mapping from inputs to outcomes changes, such as fraudsters adopting new behavior. A drift alert is diagnostic evidence, not automatic proof of quality loss. Segment-level checks matter because a harmful change in one region or customer group can disappear inside an average.

Ground truth often arrives late. A loan default may take months; a recommendation may need days of engagement. Before labels arrive, monitor proxies: missing values, unseen categories, feature freshness, prediction confidence, score distributions, human overrides, and disagreement between current and shadow models. When labels arrive, join them to the original prediction and evaluate the exact version that made it.

## Decide when to retrain

Scheduled retraining is predictable but may waste resources or learn from noisy labels. Triggered retraining responds to drift or quality evidence but can automate a reaction to a broken data pipeline. Never retraining favors stability but accepts decay. The correct policy states what evidence opens a candidate run, which labels are mature enough, which tests the candidate must pass, and who approves release.

## Release without a blind replacement

A **shadow deployment** receives live inputs without controlling decisions. A **canary** sends a small share of real decisions to the candidate. An **A/B test** compares user or business outcomes across randomized groups when experimentation is appropriate. Each needs predefined success and safety metrics, sample-size logic, segment checks, stop conditions, and rollback.

## Cost, latency, and incidents

Accuracy is only one constraint. A larger model may improve a metric while missing the product's latency budget or multiplying compute cost. Monitor tail latency, throughput, hardware utilization, and cost per prediction alongside quality.

Incident response starts with containment: stop the harmful release, roll back, or switch to a safe fallback. Then reconstruct the event from lineage and deployment records. The audit trail should answer who deployed what, when, from which data and code, under which approval, and which predictions were affected.`,
    bodyLong: `# Keeping it running

## The service can be up while the model is wrong

A conventional dashboard can show green lights for an endpoint whose predictions have quietly lost value. MLOps observability therefore links system performance to model behavior. Infrastructure metrics include availability, errors, saturation, and latency. Data metrics include schema, freshness, missingness, ranges, categories, and feature distributions. Model metrics include score distributions, confidence or margin, prediction rates, calibration, segment performance, and eventual outcome quality. Business metrics show whether the prediction still improves the decision it was built to support.

Monitoring needs a baseline and an owner. Compare live traffic with a relevant training or recent-production window, not with an arbitrary universal threshold. Record alerts by model and feature version. Route each alert to someone who can investigate both the pipeline and the model, because a shifted distribution may reflect a real-world change, a software bug, or a source-data outage.

## Data drift, concept drift, and harmless change

Data drift means the statistical distribution of inputs changed. Concept drift means the relationship between inputs and the target changed. A new customer population can create data drift; changing fraud tactics can create concept drift. Sometimes a feature changes while predictive performance remains stable. Sometimes performance collapses without a dramatic global drift metric because the failure is concentrated in a small but important segment.

For this reason, drift is a signal to investigate rather than a complete retraining policy. Examine individual features, joint behavior where practical, prediction distributions, slices, and downstream outcomes. Check whether the feature pipeline itself changed before concluding that the world changed.

## Ground truth arrives late

Many systems cannot measure correctness at prediction time. Chargebacks, medical outcomes, churn, and defaults mature slowly. The monitoring system must retain the prediction ID, timestamp, feature or data reference, model version, and decision context so later labels can be joined correctly.

Leading indicators help during the delay. Watch schema failures, missingness, freshness, unknown categories, out-of-range values, score concentration, confidence shifts, override rates, downstream rejection, and disagreement with rules or shadow models. These indicators can reveal risk early, but they remain proxies. When ground truth arrives, calculate outcome metrics by model version and important segment, and revise the earlier diagnosis.

## Retraining is a governed decision

There are three common approaches. Scheduled retraining offers operational regularity but may produce unnecessary candidates. Triggered retraining responds to drift, new data, or degraded outcomes but can amplify a data-quality incident. Manual or rare retraining maximizes control but risks stale behavior.

A sound policy separates training from deployment. A trigger may start a pipeline, but the resulting candidate must still pass data validation, reproducibility checks, offline quality and fairness gates, latency and cost tests, and comparison with the current champion. Labels must be mature enough for the intended target. Approval and rollback criteria must be explicit.

## Shadow, canary, A/B, and rollback

A shadow model scores copied live traffic but does not affect users. This reveals latency, feature availability, and prediction differences safely, though it cannot measure the behavioral effect of changed decisions. A canary exposes a limited share of real traffic, containing harm while measuring real operations. An A/B test randomizes eligible units to estimate causal product impact, but it requires ethical and statistical justification.

Before any release, define the primary metric, guardrail metrics, segment checks, minimum evidence, maximum duration, and automatic stop conditions. Keep the previous model and its compatible serving path available. Rollback should restore not only the model artifact but also compatible code, feature definitions, and configuration.

## Cost and latency are model-quality constraints

A model that is slightly more accurate but too slow for the decision point is not better in practice. Measure median and tail latency, throughput, queueing, warm-up, feature-fetch time, and hardware utilization. Track cost per thousand predictions or per successful business outcome. Batch workloads can often trade freshness for efficiency; real-time systems must budget every dependency.

Optimization choices—smaller models, quantization, batching, caching, fewer features, or specialized hardware—can change accuracy and behavior. Treat them as new candidates and evaluate them under the same release process rather than as invisible infrastructure edits.

## Incident response and auditability

When harm is plausible, contain first: pause scoring, route to the previous version, fall back to a deterministic rule, or require human review. Preserve evidence. Identify the affected model, code, feature, data, and configuration versions; the deployment time; the population exposed; and the downstream decisions made.

An audit trail should connect every prediction to a release and every release to approved artifacts and tests. After containment, determine whether the cause was source data, transformation, skew, model drift, serving code, configuration, or an operational dependency. Correct the system and add a test or monitor that would detect the same class of failure earlier.

## A system that became gradually wrong

Consider a recommendation system whose accuracy decays for six weeks. The endpoint stays available, latency is stable, and no exception appears. User interests shifted after a seasonal event, but the team watched only uptime. A strong response reconstructs prediction and outcome metrics by week and segment, checks input and concept drift, validates the feature pipeline, and compares the current model with a shadow candidate. Retraining begins only after label and pipeline quality are confirmed. The candidate is evaluated, canaried, and released with rollback thresholds. Nothing was 'broken' in the traditional server sense; operating the model required measuring whether it was still right.`,
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
    title: "Homework 1 — From model to product",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering Session 1. Explain each concrete case in 3–5 reasoned sentences. Definitions and one-word answers do not receive credit.",
    problems: [
      {
        topicSlug: "model-to-product",
        prompt:
          "Northstar Bank's fraud model scored well in a notebook, but the production service flags nearly every transaction after launch. The training table stored `amount` in dollars while the live service sends cents. Diagnose the failure and explain which controls should have caught it before release. (3–5 sentences.)",
        correctAnswer:
          "This is training-serving skew: the same feature name has different units offline and online. The team should share or contract-test feature transformations, record unit metadata, validate expected ranges, and compare online feature distributions with training data before routing decisions to the model. The release should remain reversible so the previous model or a safe rule can be restored immediately.",
        explanation:
          "Full credit identifies training-serving skew and connects shared feature definitions, semantic validation, distribution checks, and rollback to the observed unit mismatch.",
      },
      {
        topicSlug: "model-to-product",
        prompt:
          "Priya can rerun her churn notebook only on the original laptop because it depends on a local CSV, an unrecorded package version, and cells executed out of order. Design the minimum versioning and packaging record her team needs to reproduce the model six months later. (3–5 sentences.)",
        correctAnswer:
          "The team must version the training code and preprocessing, identify an immutable data snapshot or reproducible query, record configuration and random seeds, pin the execution environment and dependencies, and register the resulting model with its evaluation metadata. The training sequence should become an automated pipeline rather than hidden notebook state. These links make the release traceable and allow a future rerun to explain any differences.",
        explanation:
          "Full credit connects code, data, environment, configuration, and model artifacts instead of treating the saved model file as sufficient.",
        hint: "What information exists only on Priya's laptop, and how would another person reconstruct it?",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2 — Keeping it running",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering Session 2. Connect each observed failure to an architectural change in 3–5 reasoned sentences. Definitions and one-word answers do not receive credit.",
    problems: [
      {
        topicSlug: "keeping-it-running",
        prompt:
          "Harbor Media's recommendation API has perfect uptime, but six-week-old engagement labels now show that recommendation quality has steadily declined. Explain why the existing monitoring missed the problem and specify what the team should monitor while future ground truth is still delayed. (3–5 sentences.)",
        correctAnswer:
          "Uptime measures service availability, not prediction usefulness. The team should retain prediction IDs and model versions for later label joins, then monitor input and feature freshness, missingness, drift, score distributions, segment behavior, human overrides, and disagreement with a shadow model as leading indicators. Once engagement labels mature, it should calculate quality by release and segment to distinguish real concept drift from a pipeline problem.",
        explanation:
          "Full credit distinguishes service health from model quality and combines leading indicators with versioned delayed-outcome evaluation.",
      },
      {
        topicSlug: "keeping-it-running",
        prompt:
          "Mateo's team automatically retrains and deploys whenever a drift alert fires. A broken upstream feed shifts a feature distribution, triggering a new model trained on corrupted data. Redesign the policy so drift leads to investigation without turning a data incident into a release. (3–5 sentences.)",
        correctAnswer:
          "A drift alert should open an investigation or candidate-training run, not authorize deployment. The policy should first validate source freshness, schema, ranges, lineage, and label maturity, then train a versioned candidate and compare it with the current model on quality, segments, latency, and cost. The candidate should pass approval and shadow or canary gates with stop conditions and rollback available.",
        explanation:
          "Full credit separates drift detection, data validation, retraining, and deployment approval while preserving controlled rollout and rollback.",
      },
    ],
  },
  {
    kind: "test",
    title: "Course Test — Machine Learning Operations",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 15,
    instructions:
      "Timed. 15 minutes. Covers both sessions. Analyze each concrete engineering case in 4–6 sentences. Definitions and unsupported one-line recommendations do not receive credit. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "model-to-product",
        prompt:
          "Atlas Logistics wants the same arrival-time model to score nightly warehouse records and answer real-time checkout requests. Design a deployment plan that distinguishes the two serving modes while keeping features and versions consistent. (4–6 sentences.)",
        correctAnswer:
          "Use a scheduled batch job for warehouse records and a low-latency endpoint for checkout, but package both from the same approved model artifact and transformation code. Define shared feature contracts or feature-store definitions so offline and online values match, while allowing each path its own freshness and latency expectations. Record code, data, model, feature, and configuration versions for every run or request. Test representative inputs in both paths, monitor skew, and retain compatible rollback versions.",
        explanation:
          "Full credit chooses appropriate serving modes while preserving shared feature semantics, traceable versions, validation, monitoring, and rollback.",
      },
      {
        topicSlug: "keeping-it-running",
        prompt:
          "A lender's new risk model improves overall accuracy but doubles p99 latency and performs worse for a small regional segment. Design a release decision that accounts for quality, segment risk, latency, and evidence strength. (4–6 sentences.)",
        correctAnswer:
          "Do not approve the candidate from aggregate accuracy alone. Compare the candidate and current model on a versioned evaluation set with regional slices, define acceptable quality and p99 latency thresholds before release, and estimate whether the slower response still fits the decision point. Use shadow traffic to validate features and performance, then a limited canary only if safety and segment gates pass. Monitor guardrails and roll back if either regional quality or latency crosses its stop condition.",
        explanation:
          "Full credit rejects aggregate-only approval and connects slice evaluation, operational budgets, staged rollout, stop conditions, and rollback.",
      },
      {
        topicSlug: "keeping-it-running",
        prompt:
          "A hospital's readmission model shows a sharp input shift after a coding-system update, but outcome labels will not mature for 90 days. Explain how the team should investigate and contain risk without claiming that drift alone proves the model is inaccurate. (4–6 sentences.)",
        correctAnswer:
          "First verify whether the coding change altered feature meaning, mapping, missingness, or freshness rather than assuming concept drift. Compare affected and unaffected segments, inspect feature and score distributions, run contract tests, and score live cases with the prior or a shadow model for disagreement. Because labels are delayed, use these indicators as provisional evidence and increase human review or roll back if the change can affect decisions. Preserve prediction and version records so mature outcomes can later test the diagnosis.",
        explanation:
          "Full credit treats drift as an investigation signal, checks the pipeline, uses provisional leading indicators, contains risk, and plans delayed-outcome validation.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final — Machine Learning Operations",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 25,
    instructions:
      "Timed cumulative final. 25 minutes. Analyze each end-to-end case in 5–7 sentences connecting multiple course decisions. Definitions and unsupported labels do not receive credit. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "model-to-product",
        prompt:
          "A retailer is moving a demand-forecasting model from one analyst's notebook into a service used by purchasing teams. Trace a production-ready path from source data to deployed batch forecasts, connecting lineage, reproducibility, feature consistency, packaging, validation, and release controls. (5–7 sentences.)",
        correctAnswer:
          "Automate extraction and feature preparation from versioned or reproducible source data with schema, freshness, and range checks plus recorded lineage. Version training and preprocessing code, configuration, dependencies, feature definitions, and the resulting model in a registry with evaluation results. Rebuild the model in a clean environment to test reproducibility and compare batch features with the definitions used during training. Package a pinned artifact and prediction contract, then run smoke tests and shadow forecasts against the current purchasing process. Release only after quality, segment, runtime, and cost gates pass, recording the deployed versions and retaining a compatible rollback or safe baseline forecast.",
        explanation:
          "Full credit gives a coherent path from governed data and reproducible training through consistent serving, validation, traceable release, and rollback.",
      },
      {
        topicSlug: "keeping-it-running",
        prompt:
          "After a seasonal promotion, a recommendation model's inputs shift, click-through falls, inference cost rises, and nobody can identify which model or feature code served the affected users. Diagnose the operational failures and give a safe recovery and improvement plan. (5–7 sentences.)",
        correctAnswer:
          "Contain the incident by restoring the last known-good release or a safe fallback and by preserving affected prediction records. Separate a likely seasonal data or concept shift from pipeline errors by checking feature freshness, distributions, score changes, segment outcomes, and delayed labels. The cost increase requires tracing feature fetches, model runtime, hardware use, traffic, and retries by version. The missing lineage is itself a control failure: every prediction must identify model, code, feature, data or training, and configuration versions. Validate any retrained candidate on current slices and operational budgets, then shadow or canary it with stop conditions and rollback. Add prediction-quality, cost, and lineage-completeness monitors so another gradual failure becomes visible earlier.",
        explanation:
          "Full credit integrates containment, drift and pipeline diagnosis, cost analysis, prediction-level lineage, governed retraining, staged release, and improved monitoring.",
      },
    ],
  },
];

type SeedPrimer = Omit<SeedTopic, "bodyMedium" | "bodyLong">;

const REASONING_PRIMERS: SeedPrimer[] = [
  {
    slug: "reasoning-primer-subject",
    title: "How to reason about MLOps cases",
    weekNumber: 1,
    blurb:
      "Diagnostic primer: applying Machine Learning Operations concepts to concrete production failures.",
    lectureTitle: "Primer: How to reason about MLOps cases",
    body: `# How to reason about MLOps cases

This primer prepares you for the **Machine Learning Operations** diagnostic. It is ungraded, fresh on every attempt, and asks you to apply the two sessions rather than recite terms.

## It tests application, not memorization

A question gives a short scene: a notebook cannot be reproduced, live features use different units, prediction quality decays while uptime stays green, or a drift alert triggers unsafe automatic deployment. Name the MLOps idea that explains the failure and point to the scene detail that decides it.

## What the questions reward

- **Naming the right idea** — distinguish data-pipeline failure, weak lineage, training-serving skew, data or concept drift, delayed ground truth, unsafe retraining, and weak release controls.
- **Using evidence from the scene** — point to the detail in the situation that supports your answer, rather than answering from a general impression.
- **Choosing the right operating layer** — decide whether the remedy belongs in data validation, feature consistency, reproducibility, monitoring, retraining governance, deployment, or incident response.

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

This short primer prepares you for the **General Reasoning** diagnostic — an ungraded, fresh-attempt check of five genuine reasoning skills. The skills remain domain-general, with MLOps examples showing how they guide engineering judgment.

## The five skills

- **Analysis** separates model behavior from data and serving behavior. A score shift caused by a changed unit is different from a model that learned the wrong relationship.
- **Inference** distinguishes what a signal proves from what it merely suggests. Data drift justifies investigation; by itself it does not prove accuracy declined.
- **Evaluation** asks whether evidence supports a decision. An average that hides a failing region cannot justify a broad rollout.
- **Deduction** identifies architectural guarantees. If every prediction records its deployed model version, an incident can be traced to a release.
- **Induction** generalizes cautiously from samples. A successful shadow test supports limited confidence; representative outcomes over time support a stronger forecast.

## A recurring trap: things that move together

Most wrong answers sound plausible but outrun the evidence. Keep apart what facts show, what architecture guarantees, what you assume, and what is only possible. A drift alert suggests a lead to investigate; versioned feature and outcome traces are stronger evidence of the mechanism.

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
    .where(eq(topicsTable.slug, "model-to-product"));
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
        "Seed: stale course content detected — replacing with Machine Learning Operations",
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
