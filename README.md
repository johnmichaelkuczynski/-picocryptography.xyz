# 🔎 Basic AI Math

**A rigorous, self-paced introduction to the mathematics behind modern AI that teaches, tutors, drills, and grades itself — built for researchers and professionals entering the field.**

Basic AI Math is a self-paced, single-user web course on the mathematics behind artificial intelligence — taught, tutored, drilled, and graded entirely by AI, with built-in academic-integrity enforcement. A complete one-unit curriculum builds the subject from first principles, one idea at a time: how AI is, underneath, numbers and arithmetic at scale, from turning words into vectors to teaching a network through backpropagation.

---

## ✨ Features

- **One unit, 8 topics** — a complete syllabus: why AI is really math · numbers as meaning (vectors and embeddings) · measuring likeness (the dot product and distance) · matrices (how a network moves information) · slopes and gradients · gradient descent · probability · backpropagation (the capstone).
- **Three-depth lessons** — every lesson reads at **Short / Medium / Long** length, AI-rewritten while keeping the same examples and learning objectives.
- **Section-scoped AI tutor** — ask about the exact paragraph you're reading; answers stream back token-by-token, grounded in that lecture section.
- **Adaptive practice** — generated problem sets that get harder on a streak and ease off after a miss; per-session difficulty persists. Every question asks you to reason about a concrete scenario, not to recite.
- **AI-graded assignments** — two homework sets, a timed unit test, and a cumulative final, each scored for semantic equivalence with a written rationale and a rolled-up percent score.
- **Two-layer AI-authorship detection** — every submission is screened by a static text classifier (GPTZero) **and** a diachronic keystroke-pattern detector, each with a human-readable verdict.
- **Diagnostic reasoning checks** — two ungraded instruments (AI-math subject reasoning and General Reasoning), each offered in three formats and three lengths, at four points in the journey (before, one-third, two-thirds, and after the course). They are unlimited practice with fresh questions every attempt and never affect the grade (coursework is 100%).
- **Live analytics** — dashboard KPIs (attempts, accuracy, streak), per-topic mastery, and a recent-activity feed.
- **Operator diagnostics** — one-click self-tests that verify the entire stack (database, OpenAI, GPTZero, detection, and the practice/grade loop) before you trust a session.

---

## 🏗️ Architecture

This is a [pnpm](https://pnpm.io/) workspace monorepo. The course runs as several artifacts plus shared libraries:

```
artifacts/
  qr-course/        # React + Vite frontend (the student app)
  api-server/       # Express API: lessons, tutor, practice, grading, detection, diagnostics
lib/
  db/               # Drizzle ORM schema + Postgres connection
  api-spec/         # OpenAPI contract → generated React Query hooks + Zod validators
```

**Contract-first:** a single OpenAPI document is the source of truth. React Query hooks (client) and Zod validators (server) are generated from it, so request/response shapes can't drift.

**Tech stack:** React, Vite, TypeScript, Tailwind, Express, Drizzle ORM, PostgreSQL, OpenAI (tutoring/grading), GPTZero (AI detection), Framer Motion (video).

---

## 🔑 Configuration

The app reads the following secrets/environment variables (managed in the Replit **Secrets** pane):

| Key | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (e.g. a Neon database) |
| `OPENAI_API_KEY` | OpenAI key for the tutor, practice generation, and grading |
| `OPENAI_BASE_URL` | OpenAI-compatible base URL |
| `GPTZERO_API_KEY` | GPTZero key for static AI-authorship detection |
| `SESSION_SECRET` | Server session signing |

---

## 🚀 Running

The app runs through Replit **workflows** (not `pnpm dev` at the root). Each artifact has its own workflow that supplies the `PORT` and base-path it needs.

Typical local checks:

```bash
# Typecheck a package
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/qr-course run typecheck

# Apply the database schema (Drizzle)
pnpm --filter @workspace/db run push

# Regenerate API hooks/validators from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

The API server seeds the course content on startup and self-heals when the content version changes, so a fresh database is populated automatically once `DATABASE_URL` and the schema are in place.

### Authentication

The app has **no login system** — it is a single-user course, and every page is directly accessible.

---

## 🩺 Diagnostics

Open the **Diagnostics** page in the app (or hit the API directly) to run:

- **System diagnostic** (`GET /api/diagnostics/system`) — environment, database round-trip, course-seed integrity, OpenAI chat + JSON mode, the detection pipeline, an AI-positive control sample, and GPTZero connectivity.
- **Synthetic-student diagnostic** (`POST /api/diagnostics/synthetic-run`) — spins up a fake student, runs a practice session, takes and submits a full assignment, and verifies grading + detection + analytics all reflect the run.

---

## 📚 Who it's for

- **Researchers & professionals entering the field** — a complete, rigorous grounding in the mathematics behind AI, with on-demand tutoring and adaptive practice.
- **Instructors & curriculum designers** — a working reference for AI-taught, AI-graded, AI-detection-screened coursework.
- **Academic-integrity researchers** — a live testbed for layered AI-authorship detection (text classification + keystroke behavior).
- **Product & engineering teams** — a reference implementation of contract-first full-stack architecture, streaming AI UX, and self-diagnostic tooling.

---

*Basic AI Math — where the curriculum, the tutor, the grader, and the integrity check all live in one room.*
