# Cloud Architecture (AWS/Azure)

**A rigorous, one-day introduction to designing reliable, secure cloud architectures with AWS and Azure for adult researchers and professionals.**

---

## Overview

Cloud Architecture (AWS/Azure) is a self-paced, single-user web course taught, tutored, drilled, and graded by AI, with built-in academic-integrity enforcement.

The curriculum has **one intensive day with four topics**:

1. **The building blocks** — Renting instead of owning; compute, storage, network, and identity; virtual machines, containers, serverless functions, databases, regions, availability zones, virtual networks, subnets, and least-privilege access.
2. **Designing for real use** — Scaling, load balancing, statelessness, failure design, redundancy, backup, cost, managed services, infrastructure as code, observability, encryption, secrets, and the shared responsibility model.
3. **How to reason about cloud-architecture cases** — A concrete deployment scenario asks which architectural idea decides the outcome.
4. **Core reasoning skills** — Analysis, inference, evaluation, deduction, and induction in a domain-neutral format.

The subject reasoning primer uses concrete deployment scenarios and asks for the architectural concept and scene detail that explain each case. The general primer applies analysis, inference, evaluation, deduction, and induction.

The course is designed for **researchers and professionals entering the discipline, product and engineering teams, instructors evaluating AI-taught coursework, and researchers studying AI academic integrity**.

---

## What It Does

- **One-Day Intensive Curriculum** — Four topics with lessons, two homework sets, a timed course test, and a cumulative final exam.
- **Three-Depth Lessons** — Every lesson is available at Short, Medium, or Long length while preserving its examples and learning objectives.
- **Section-Scoped AI Tutor** — Answers stream token by token and remain grounded in the lecture section being read.
- **Adaptive Topic Practice** — Generated scenario problems adjust difficulty after correct and incorrect answers.
- **AI-Graded Assignments** — Homework, course-test, and final answers receive semantic grading, per-problem correctness, and written rationale.
- **Two-Layer AI Detection on Every Submission** — A static text classifier and a diachronic keystroke-pattern detector each produce a verdict with rationale.
- **Diagnostic Reasoning Checks** — Integration-case and General Reasoning instruments are available in multiple-choice, hybrid, and written formats; Short, Medium, and Long lengths; and before, one-third, two-thirds, and after phases. They are unlimited, freshly generated, ungraded practice.
- **Live Analytics** — Dashboard KPIs, per-topic mastery, and recent activity expose progress and weak areas.
- **Operator Diagnostics** — System-health and synthetic-student controls verify the database, model integration, detection pipeline, and practice and grading loops.

---

## Technical Features

- **Two-Layer AI-Authorship Detection**
  - **Static (GPTZero):** Each submitted answer is sent to GPTZero's `predict/text` endpoint. The final score blends `0.85 × GPTZero + 0.15 × structural heuristic`. If GPTZero is unavailable, an LLM scorer plus heuristic provides the non-blocking fallback.
  - **Diachronic (Keystroke Pattern):** Textareas capture keystroke count, erase count, bulk-insert events, longest bulk insert, rewrite segments, and duration. The scorer evaluates paste-and-rewrite behavior, keystroke-to-output ratios, and implausible sustained input speed.
- **Diagnostic Self-Tests**
  - **System Diagnostic** (`/diagnostics/system`): Checks environment, database round-trip, course-seed integrity, model chat completion, JSON mode, detection pipeline, AI-positive control, and GPTZero connectivity.
  - **Synthetic-Student Diagnostic** (`/diagnostics/synthetic-run`): Runs practice difficulty adjustment, assignment submission, grading, detection, and analytics verification.
- **Contract-First API** — OpenAPI is the source of truth. React Query hooks and Zod validators are generated from the same contract.
- **Streaming AI Tutor** — Server-Sent Events stream section-scoped tutor responses.
- **Adaptive Practice Engine** — Per-session difficulty persists and controls on-demand problem generation.
- **Operator Console** — The Diagnostics page exposes self-tests, status rows, timings, and raw errors.
- **Living Documentation** — This file, `README.md`, and `BLUEPRINT.md` describe the same product and architecture at different levels.

---

## User Preferences

- Convert the existing app in place when changing subjects. Preserve its routes, components, page structure, topic rail, download buttons, math keyboards, course mechanics, diagnostic controls, visual design, and functionality.
- The audience is adults, typically researchers, professionals, PhD students, and professors entering a new discipline. Describe the course as foundational, substantial, and rigorous.
- The app name must remain the literal title **Cloud Architecture (AWS/Azure)** everywhere relevant.
- Use plain, descriptive copy. Do not add slogans, jokes, cute framing, or unnecessary claims.
- The “Topics Covered in This Course” list remains a small vertical left-hand rail on the landing page and dashboard, without unit, week, or number markers, and with Cloud Architecture PDF and TXT download buttons beneath it.
- Math keyboards remain present on every freeform answer and tutor input, regardless of whether a prompt appears to require notation. Math-keyboard insertions count as genuine keystrokes rather than bulk insertions.
- Every homework, test, final, practice, and diagnostic question must use a concrete scenario and require reasoned application rather than definition recitation or a one-word answer.
- The YouTube title must remain exactly **Cloud Architecture (AWS/Azure) — AI-Powered Course**.