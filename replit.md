# 🔎 AI Math Level 1

**A Rigorous, One-Day Intensive Introduction to the Mathematics Behind Modern AI That Teaches, Tutors, and Proofs Itself — Built for Researchers and Professionals Entering the Field**

---

## 🧩 Overview

AI Math Level 1 is a self-paced, single-user web course on the mathematics behind artificial intelligence — taught, tutored, drilled, and graded entirely by AI, with built-in academic-integrity enforcement. A complete one-day intensive curriculum builds the subject from first principles, one idea at a time, rather than leaning on heavy formulas.

It turns the question *how does a chatbot actually work?* into one product: read each lesson at the depth you want, ask a tutor scoped to the exact section you're on, drill questions whose difficulty adapts to you in real time, and submit homework, a course test, and a final that are AI-graded with feedback and screened for AI-generated answers. The material is concrete and built up step by step — it explains how AI is, underneath, numbers and arithmetic at huge scale, from turning words into vectors to teaching a network through backpropagation.

The curriculum is organized into **one intensive day with 2 topics** (two sessions): 1.1 Numbers as meaning — why AI is really math (everything becomes numbers, weights, vectors and embeddings, measuring likeness with the dot product and distance); and 1.2 How AI learns — from matrices to backpropagation (matrices, loss and gradients, gradient descent, probability, backpropagation).

Designed for **researchers and professionals entering the discipline, instructors evaluating AI-taught coursework, and researchers studying AI academic integrity**, AI Math Level 1 pairs a real curriculum with two layers of AI-authorship detection — surfacing not just *whether* the writing looks AI-generated, but whether the *act of producing it* did.

---

## 🧠 What It Does

- **One-Day Intensive Curriculum** — A complete condensed syllabus across 2 topics in two sessions. The day ships with lessons, two homework sets, a timed course test, and a cumulative final exam.
- **Three-Depth Lessons** — Every lesson is available at **Short / Medium / Long** length, AI-rewritten while preserving the same examples and learning objectives. Skim the concept, expand it on demand, or read the deeper cut.
- **Section-Scoped AI Tutor** — Ask a question about the paragraph you're reading and the answer streams back token-by-token, grounded in that exact lecture section. Suggested starter questions are pre-generated per lecture.
- **Adaptive Topic Practice** — Generated problem sets that move difficulty up after a streak and down after a miss, with explanations on every answer. Per-session difficulty persists, so each drill picks up where the last one left off.
- **AI-Graded Assignments** — Homework, the course test, and the final are scored by an LLM grader that judges semantic equivalence to a model answer, returns per-problem correctness *plus* a written rationale, then rolls up to a percent score on the attempt.
- **Two-Layer AI Detection on Every Submission** — Each submitted answer is screened by both a static text classifier (GPTZero) and a diachronic keystroke-pattern detector. Each verdict ships with a human-readable rationale.
- **Diagnostic Reasoning Checks** — Two instruments (AI-math subject reasoning; and General Reasoning across analysis, inference, evaluation, deduction, and induction), each offered in three formats (multiple choice, hybrid, or written) and three lengths, at four points in the journey (before, one-third, two-thirds, and after the course). They are ungraded practice — takeable anytime, unlimited, with freshly generated questions every attempt — and never affect the grade (coursework is 100%).
- **Live Analytics** — Dashboard KPIs (attempts, accuracy, streak), per-topic mastery percentages, and a recent-activity feed — so progress, weak spots, and momentum are all visible at a glance.
- **Operator Diagnostics** — One-click self-tests (system health and synthetic-student end-to-end run) verify the entire stack — database, OpenAI integration, GPTZero, detection pipeline, and the practice/grade loop — before you trust a session.

---

## ⚙️ Technical Features

- **Two-Layer AI-Authorship Detection** —
  - **Static (GPTZero):** Every submitted answer is sent to GPTZero's `predict/text` endpoint; the per-document AI probability is blended `0.85 × GPTZero + 0.15 × structural-heuristic` for the final score. If GPTZero is unavailable, the system silently falls back to an LLM scorer plus heuristic — submissions never block.
  - **Diachronic (Keystroke Pattern):** The student textarea captures keystroke count, erase count, bulk-insert events, longest bulk insert, rewrite segments, and total duration. A scorer penalizes paste-then-reword behavior, low keystroke-to-output ratios, and impossibly sustained typing speeds — catching AI use even when the final text is reworded enough to pass GPTZero.
- **Diagnostic Self-Tests** —
  - **System Diagnostic** (`/diagnostics/system`): Ordered checks — environment, database round-trip, course-seed integrity, OpenAI chat completion, OpenAI JSON mode, detection pipeline, AI-positive control sample, and GPTZero connectivity. Each step returns pass/fail, timing, and a raw error string.
  - **Synthetic-Student Diagnostic** (`/diagnostics/synthetic-run`): Spins up a fake student, runs a practice session (wrong → adjust ↓ → right → adjust ↑), takes a full assignment attempt, submits it, and verifies grading + detection + analytics all reflect the run. End-to-end stack proof in one click.
- **Contract-First API** — A single OpenAPI document is the source of truth; React Query hooks for the UI and Zod validators for the server are generated from it. Request and response shapes can't drift between client and server because both come from the same spec.
- **Streaming AI Tutor** — Token-by-token Server-Sent-Event streaming for tutor answers, with a section-scoped system prompt so responses stay grounded in the lecture the student is reading.
- **Adaptive Practice Engine** — Per-session difficulty (1–4 continuous) adjusts after each attempt; the next-problem generator takes the current difficulty and the topic as input, so the question pool is generated on demand instead of pre-baked.
- **Operator Console** — A dedicated Diagnostics page in the student app surfaces both self-tests with one-click execution, per-step pass/fail rows, and raw error output for debugging.
- **Living README** — This README plus a companion `BLUEPRINT.md` architecture document are kept in lock-step with the code — short-form and long-form views of the same truth.

---

## 📊 Designed For

- **Researchers & Professionals Entering the Field:** A complete, rigorous grounding in the mathematics behind AI delivered with on-demand tutoring and adaptive practice — no instructor required.
- **Instructors & Curriculum Designers:** A working reference for what AI-taught, AI-graded, AI-detection-screened coursework actually looks like end-to-end.
- **Academic-Integrity Researchers:** A live testbed for layered AI-authorship detection that combines text-based classification with behavioral keystroke evidence.
- **Product & Engineering Teams:** A reference implementation of contract-first full-stack architecture, streaming AI UX, and self-diagnostic operator tooling in a Replit pnpm monorepo.

---

## 💡 Core Idea

AI Math Level 1 reframes an AI-taught course as a *closed accountability loop*.

It doesn't just teach the material and grade the homework — it **teaches**, **tutors**, **drills**, **grades**, **detects misuse**, and **proves the whole pipeline still works** with a single click. The result is a self-paced course that students can actually trust to be fair, and that instructors can actually trust to be honest.

**AI Math Level 1 — where the curriculum, the tutor, the grader, and the integrity check all live in one room.**

---

## 👤 User preferences

- The user prefers to **convert the existing app in place** (e.g. replacing the prior course content/branding with the new subject) rather than create a standalone clone — keep all functionality and format intact when making content/branding changes.
- The course audience is **adults** — typically PhD students and professors entering a new discipline — **never** children. Do not use "baby", "child"/"children", "kid"/"kid-friendly", "middle schooler", "grown-ups", or "friendly" framing, and do not lead with "no math!"/"no coding" claims. Describe it as a **basic/foundational but substantial and rigorous** course, emphasizing the depth and wealth of its content.
- **App name** must always be the most literal, utilitarian name possible (e.g. "Data Analytics", "Ethics", "Formal Logic", "Basic AI") — **never** goofy, funny, or cute. Use that name consistently in the README, the video, and everywhere else relevant.
- **No "fun" blurbs or "cool" marketing slogans — EVER.** All user-facing copy (landing page, dashboard, footers, badges, headlines) must be plain and descriptive, stating what the course is and covers. No witty taglines, no "AI isn't magic" style hooks, no clever footer lines.
- **Topics list configuration**: the "Topics Covered in This Course" list must appear as a small vertical left-hand rail (top-left, small font, no unit/week/number meta-markers) on BOTH the landing page and the dashboard, with Download Course (PDF/TXT) buttons beneath it.
- **YouTube description title** must ALWAYS follow exactly the format `<App Name> — AI-Powered Course` (e.g. "AI Math Level 1 — AI-Powered Course"). No extra descriptors, taglines, or "options" — just `<App Name> — AI-Powered Course`.
