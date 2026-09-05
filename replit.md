# Cryptography: Secrets, Locks, and Digital Trust

**A rigorous but accessible 4-hour introduction to cryptography, codes, and digital trust for adult researchers and professionals.**

---

## Overview

Cryptography: Secrets, Locks, and Digital Trust is a self-paced, single-user web course taught, tutored, drilled, and graded by AI, with built-in academic-integrity enforcement.

The curriculum is a **4-hour intensive with four topics**:

1. **HOUR 1 EVERY CODE EVER BROKEN WAS BROKEN BECAUSE PEOPLE REPEAT THEMSELVES** — Letter counts, stock phrases, weather reports: Enigma fell to habit, not to genius.
2. **HOUR 2 PERFECT SECRECY EXISTS, IS PROVABLE, AND IS WORTHLESS** — Why the unbreakable cipher went unused, and why security is priced, not guaranteed.
3. **HOUR 3 TWO STRANGERS CAN AGREE ON A SECRET WHILE EVERYONE LISTENS** — The one genuinely astonishing idea in the field, and the reason there is an internet.
4. **HOUR 4 NOBODY BREAKS THE MATH — THINGS FALL APART AT THE SEAMS** — Keys, people, sloppy code, and governments: where every real-world break has come from.

Hour 1 uses Linear B to distinguish decipherment from cryptanalysis. Alice Kober tabulated repeated sign groups, triplets, and changing inflected endings, then built a consonant/vowel relation grid without assigning sound values. Michael Ventris tested likely Cretan place-name cribs, including Knossos and Amnisos, and propagated values through the grid. Linear B was an orphaned script recovered from repetition and geographical clues; Hours 2–4 address deliberate concealment from an adversary.

The subject reasoning primer uses concrete cryptography scenarios and asks for the architectural concept and scene detail that explain each case. The general primer applies analysis, inference, evaluation, deduction, and induction.

The course is designed for **researchers and professionals entering the discipline, product and engineering teams, instructors evaluating AI-taught coursework, and researchers studying AI academic integrity**.

---

## What It Does

- **4-Hour Intensive Curriculum** — Four topics with lessons, two homework sets, a timed course test, and a cumulative final exam.
- **Three-Depth Lessons** — Every lesson is available at Short, Medium, or Long length while preserving its examples and learning objectives.
- **Section-Scoped AI Tutor** — Answers stream token by token and remain grounded in the lecture section being read.
- **Adaptive Topic Practice** — Generated scenario problems adjust difficulty after correct and incorrect answers.
- **AI-Graded Assignments** — Roughly half the coursework is multiple choice; most freeform answers are one or two sentences. Every question receives an immediate numeric percentage grade and feedback.
- **Two-Layer AI Detection on Every Submission** — A static text classifier and a diachronic keystroke-pattern detector each produce a verdict with rationale.
- **Diagnostic Reasoning Checks** — Cryptography-case and General Reasoning instruments are available in multiple-choice, hybrid, and written formats; Short, Medium, and Long lengths; and before, one-third, two-thirds, and after phases. They are unlimited, freshly generated, ungraded practice.
- **Live Analytics** — Dashboard KPIs, per-topic mastery, and recent activity expose progress and weak areas.
- **Exact Answer Persistence** — Answers are persisted as exact text before grading.
- **Operator Diagnostics** — System-health and synthetic-student controls verify the database, model integration, detection pipeline, and practice and grading loops. The live answer diagnostic verifies generated, sent, persisted, and grading evidence.

---

## Technical Features

- **Two-Layer AI-Authorship Detection**
  - **Static (GPTZero):** Each submitted answer is sent to GPTZero's `predict/text` endpoint. The final score blends `0.85 × GPTZero + 0.15 × structural heuristic`. If GPTZero is unavailable, an LLM scorer plus heuristic provides the non-blocking fallback.
  - **Diachronic (Keystroke Pattern):** Textareas capture keystroke count, erase count, bulk-insert events, longest bulk insert, rewrite segments, and duration. The scorer evaluates paste-and-rewrite behavior, keystroke-to-output ratios, and implausible sustained input speed.
- **Diagnostic Self-Tests**
  - **System Diagnostic** (`/diagnostics/system`): Checks environment, database round-trip, course-seed integrity, model chat completion, JSON mode, detection pipeline, AI-positive control, and GPTZero connectivity.
  - **Live Answer Diagnostic** (`/diagnostics/live-answer`): Verifies a generated answer, the sent text, exact persisted read-back evidence, and the real grader's numeric percentage.
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
- The app name must remain the literal title **Cryptography: Secrets, Locks, and Digital Trust** everywhere relevant.
- Use plain, descriptive copy. Do not add slogans, jokes, cute framing, or unnecessary claims.
- The “Topics Covered in This Course” list remains a small vertical left-hand rail on the landing page and dashboard, without unit, week, or number markers, and with Course PDF and TXT download buttons beneath it.
- Math keyboards remain present on every freeform answer and tutor input, regardless of whether a prompt appears to require notation. Math-keyboard insertions count as genuine keystrokes rather than bulk insertions.
- Every homework, test, final, practice, and diagnostic question must use a concrete scenario and require reasoned application rather than definition recitation or a one-word answer.
- The YouTube title must remain exactly **Cryptography: Secrets, Locks, and Digital Trust — AI-Powered Course**.
