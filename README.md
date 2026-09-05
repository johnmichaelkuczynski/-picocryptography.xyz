# 🚀 Cryptography: Secrets, Locks, and Digital Trust

<div align="center">

### A rigorous but accessible 4-hour introduction to codes, ciphers, and digital trust.

<strong>Learn how machines keep secrets, the idea that made the internet possible, and where it all breaks.</strong>

<br />
<br />

[![Course](https://img.shields.io/badge/course-4--hour%20intensive-2563EB?style=for-the-badge&logo=bookstack&logoColor=white)](#-the-learning-journey)
[![Lessons](https://img.shields.io/badge/lessons-short%20%7C%20medium%20%7C%20long-7C3AED?style=for-the-badge&logo=readme&logoColor=white)](#-learn-at-your-pace)
[![Access](https://img.shields.io/badge/access-no%20account%20required-059669?style=for-the-badge&logo=checkmarx&logoColor=white)](#-built-for-real-learning)
[![Stack](https://img.shields.io/badge/stack-react%20%2B%20typescript-F97316?style=for-the-badge&logo=react&logoColor=white)](#-under-the-hood)

</div>

<br />

![Cryptography course preview](screenshots/cloud-architecture-home.jpg)

> **The hard part of cryptography isn't just the math.**
> It's the human layer, the bad dice, and the leaky clocks.

---

## ✨ Why this course?

Cryptography: Secrets, Locks, and Digital Trust is a **4-hour web course taught, tutored, drilled, and graded by AI**. It turns cryptography concepts into a structured learning experience with concrete cases, adaptive practice, grounded tutoring, and built-in academic-integrity screening.

## 🧭 The learning journey

| Hour | Summary |
| --- | --- |
| 🔏 **HOUR 1 EVERY CODE EVER BROKEN WAS BROKEN BECAUSE PEOPLE REPEAT THEMSELVES** | Letter counts, stock phrases, weather reports: Enigma fell to habit, not to genius. |
| 💻 **HOUR 2 PERFECT SECRECY EXISTS, IS PROVABLE, AND IS WORTHLESS** | Why the unbreakable cipher went unused, and why security is priced, not guaranteed. |
| 🌐 **HOUR 3 TWO STRANGERS CAN AGREE ON A SECRET WHILE EVERYONE LISTENS** | The one genuinely astonishing idea in the field, and the reason there is an internet. |
| 💥 **HOUR 4 NOBODY BREAKS THE MATH — THINGS FALL APART AT THE SEAMS** | Keys, people, sloppy code, and governments: where every real-world break has come from. |

Hour 1 also distinguishes decipherment from cryptanalysis. Alice Kober tabulated Linear B's repeated sign groups, triplets, and changing inflected endings, then built a consonant/vowel relation grid without assigning sound values. Michael Ventris tested likely Cretan place-name cribs, including Knossos and Amnisos, and propagated their values through that structure. Linear B was an orphaned script recovered through internal repetition and geographical clues; Hours 2–4 concern deliberate concealment from an adversary.

### The reasoning primers

Two ungraded primers make the course more than a checklist:

- 🧪 **How to reason about cryptography cases** — identify the cryptographic idea that decides a concrete security failure.
- 🧠 **Core reasoning skills** — practice analysis, inference, evaluation, deduction, and induction in a domain-neutral format.

---

## 🎯 Built for real learning

<table>
<tr>
<td width="50%">

### 📚 Learn at your pace

Every lecture is available in **Short, Medium, or Long** depth while keeping the same examples and learning objectives.

</td>
<td width="50%">

### 💬 Ask a grounded tutor

The section-scoped AI tutor streams answers grounded in the exact lecture passage on screen.

</td>
</tr>
<tr>
<td width="50%">

### 🧩 Practice adaptively

Generated scenario problems adjust difficulty based on recent answers, so practice responds to the learner.

</td>
<td width="50%">

### ✍️ Reason, do not recite

Roughly half the coursework is multiple choice. Most freeform responses take one or two sentences, while still requiring reasoned application to concrete cases.

</td>
</tr>
<tr>
<td width="50%">

### 🏁 See what you know

Two homework sets, a timed course test, and a cumulative final give every question an immediate numeric percentage grade with feedback.

</td>
<td width="50%">

### 🛡️ Protect assessment integrity

Every submission is checked by both a static text detector and diachronic keystroke-pattern analysis.

</td>
</tr>
</table>

## 📦 What is included

- **A 4-hour intensive** organized around four core topics
- **Three lecture depths**: Short, Medium, and Long
- **Section-scoped AI tutoring** with streamed responses
- **Adaptive topic practice** with persistent difficulty
- **Four graded checkpoints**: two homework sets, a course test, and a final
- **Ungraded diagnostic checks** across multiple formats, lengths, and course phases
- **Exact text answer persistence** before grading, with a live answer diagnostic that verifies generated, sent, persisted, and grading evidence
- **Live analytics** for KPIs, topic mastery, activity, and weak areas
- **Free PDF and TXT course downloads** with no sign-in
- **A built-in product walkthrough video**

## 👥 Designed for

| Audience | Takeaway |
| --- | --- |
| 🔬 **Researchers and professionals entering cryptography** | A foundational but substantial introduction compressed into a focused 4-hour experience. |
| 🛠️ **Product and engineering teams** | A shared language for codes, ciphers, and digital trust. |
| 🎓 **Instructors and curriculum designers** | A working example of AI-taught, AI-graded coursework with integrity controls. |
| 🔎 **Academic-integrity researchers** | A live demonstration of layered authorship screening in an educational product. |

## ⚙️ Under the hood

- **Contract-first API** — OpenAPI is the source of truth; React Query hooks and Zod validators are generated from the same contract.
- **Streaming tutor** — Server-Sent Events deliver section-scoped tutor responses token by token.
- **Adaptive practice engine** — Per-session difficulty persists and changes after correct and incorrect attempts.
- **Two-layer detection** — GPTZero-backed text detection is blended with structural signals, while keystroke analysis evaluates paste-and-rewrite behavior and sustained input patterns.
- **Diagnostic self-tests** — Operator controls verify the database, course seed, model completion, JSON mode, detection pipeline, practice loop, grading loop, analytics, and live generated/sent/persisted/grading evidence.
- **Auto-reseeded curriculum** — A content marker detects a subject change and replaces stale course material transactionally.

## 🧑‍💻 Run it locally

This is a pnpm workspace with separate artifacts for the course, API server, and walkthrough video.

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/qr-course run dev
```

The course and API require the environment variables documented in the deployment setup. Secrets are never committed to the repository.

## 🌈 The promise

> **Understand the secrets, locks, and trust that run the internet.**

Cryptography: Secrets, Locks, and Digital Trust gives learners a practical mental model for digital security and encryption.

<div align="center">

### Ready to move from “it's magic” to “this is how it works”?

**Start with the course. Build the habit of asking what the evidence actually proves.**

</div>
