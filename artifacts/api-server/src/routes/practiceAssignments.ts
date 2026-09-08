import { Router, type IRouter } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  problemsTable,
  topicsTable,
  practiceSessionsTable,
  practiceProblemsTable,
  practiceAttemptsTable,
} from "@workspace/db";
import {
  GeneratePracticeAssignmentResponse,
  GradePracticeAssignmentBody,
  GradePracticeAssignmentResponse,
} from "@workspace/api-zod";
import { chatJson } from "../lib/ai";
import { gradePracticeEssay, GradingUnavailableError } from "../lib/grading";
import { getAccessIdentity } from "../lib/access";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

function isValidReasoningProblem(problem: {
  prompt: string;
  correctAnswer: string;
  type?: string;
  options?: string[] | null;
}): boolean {
  const prompt = problem.prompt.trim();
  const answer = problem.correctAnswer.trim();
  const sentenceCount = answer.split(/[.!?]+(?:\s|$)/).filter(Boolean).length;
  return (
    ((problem.type === "multiple_choice" &&
      problem.options?.length === 4 &&
      problem.options.includes(problem.correctAnswer)) ||
      (prompt.length >= 30 && answer.length >= 20 && sentenceCount >= 1)) &&
    !/\b(define|what (?:is|are) .+ called|what does .+ mean|difference between)\b/i.test(
      prompt,
    )
  );
}

// Generate a fresh, never-graded PRACTICE version of a graded assignment.
// Each call produces a brand-new set of problems modeled on the source
// assignment (same topics, same kind, same reasoning-answer format) — so the
// student can drill infinitely many practice homeworks / tests / midterms /
// finals before sitting the real one.
router.post(
  "/assignments/:assignmentId/practice",
  async (req, res): Promise<void> => {
    const identity = getAccessIdentity(req);
    const assignmentId = parseIdParam(req.params.assignmentId);
    if (!Number.isFinite(assignmentId)) {
      res.status(400).json({ error: "invalid assignmentId" });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId));
    if (!assignment) {
      res.status(404).json({ error: "assignment not found" });
      return;
    }

    const sourceProblems = await db
      .select({
        prompt: problemsTable.prompt,
        correctAnswer: problemsTable.correctAnswer,
        topicId: problemsTable.topicId,
        topicTitle: topicsTable.title,
        position: problemsTable.position,
      })
      .from(problemsTable)
      .leftJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
      .where(eq(problemsTable.assignmentId, assignmentId))
      .orderBy(asc(problemsTable.position));

    if (sourceProblems.length === 0) {
      res.status(404).json({ error: "assignment has no problems" });
      return;
    }

    // Cap how many we generate per set to keep generation snappy; mirror the
    // real assignment's length up to the cap.
    const templates = sourceProblems.slice(0, 10);

    let generated: Array<{
      prompt: string;
      correctAnswer: string;
      explanation: string;
      type: "multiple_choice" | "freeform";
      options: string[] | null;
    }> = [];
    try {
      const out = await chatJson<{
        problems: Array<{
          prompt: string;
          correctAnswer: string;
          explanation: string;
          type: "multiple_choice" | "freeform";
          options: string[] | null;
        }>;
      }>(
        `Write exactly ${templates.length} new self-contained scenario questions for this cryptography ${assignment.kind}. Use approximately 50% multiple choice (alternate by position), each with exactly four concise options and correctAnswer exactly equal to one option. Other questions must be short freeform: at least 60% answerable in one sentence, most remaining in two, rarely three; never demand sentence counts. Keep prompts and answers short. Respond as strict JSON: {"problems":[{"prompt":string,"correctAnswer":string,"explanation":string,"type":"multiple_choice"|"freeform","options":string[4]|null}]}.`,
        JSON.stringify({
          assignmentKind: assignment.kind,
          assignmentTitle: assignment.title,
          templates: templates.map((t, i) => ({
            number: i + 1,
            topic: t.topicTitle ?? "cryptography",
            promptStyleExample: t.prompt,
            modelAnswerExample: t.correctAnswer,
          })),
        }),
      );
      generated = Array.isArray(out?.problems) ? out.problems : [];
    } catch {
      generated = [];
    }

    const validGenerated =
      generated.length === templates.length &&
      generated.every(
        (problem, index) =>
          isValidReasoningProblem(problem) &&
          problem.type === (index % 2 === 0 ? "multiple_choice" : "freeform"),
      );
    if (!validGenerated) {
      res.status(502).json({
        error: "Practice generation did not produce the required balanced short-answer set. Please retry.",
        retryable: true,
      });
      return;
    }

    const finalProblems = templates.map((t, i) => {
      const g = generated[i]!;
      return {
        topicId: t.topicId,
        prompt: g.prompt.trim(),
        correctAnswer: g.correctAnswer.trim(),
        type: g.type,
        options: g.options,
        explanation:
          (g.explanation ?? "").trim() ||
          "Apply the relevant cryptographic concept to the scenario.",
      };
    });

    const [session] = await db
      .insert(practiceSessionsTable)
      .values({
        weekNumber: assignment.weekNumber,
        topicId: null,
        assignmentId: assignment.id,
        mode: "assignment",
        tutorEnabled: true,
        focusOnWeaknesses: false,
        difficulty: 2.5,
        ownerId: identity.ownerId,
        userId: identity.userId,
      })
      .returning();
    if (!session) {
      res.status(500).json({ error: "failed to create practice session" });
      return;
    }

    const inserted = await db
      .insert(practiceProblemsTable)
      .values(
        finalProblems.map((p) => ({
          sessionId: session.id,
          topicId: p.topicId,
          prompt: p.prompt,
          type: p.type,
          options: p.options,
          correctAnswer: p.correctAnswer,
          explanation: p.explanation,
          difficulty: 2.5,
        })),
      )
      .returning();

    const topicTitleById = new Map(
      templates.map((t) => [t.topicId, t.topicTitle ?? null]),
    );

    res.json(
      GeneratePracticeAssignmentResponse.parse({
        sessionId: session.id,
        assignmentId: assignment.id,
        title: assignment.title,
        kind: assignment.kind,
        instructions: assignment.instructions ?? null,
        problems: inserted.map((p) => ({
          id: p.id,
          prompt: p.prompt,
          topicId: p.topicId,
          topicTitle: topicTitleById.get(p.topicId) ?? null,
          type: p.type as "multiple_choice" | "freeform",
          options: p.options,
        })),
      }),
    );
  },
);

// Grade every answer in a practice-assignment set and return rich coaching
// feedback per problem. Practice is never penalized — the score is purely
// informational so the student can see if they're ready for the real thing.
router.post(
  "/practice/assignment-sessions/:sessionId/grade",
  async (req, res): Promise<void> => {
    const identity = getAccessIdentity(req);
    const sessionId = parseIdParam(req.params.sessionId);
    if (!Number.isFinite(sessionId)) {
      res.status(400).json({ error: "invalid sessionId" });
      return;
    }
    const parsed = GradePracticeAssignmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [session] = await db
      .select()
      .from(practiceSessionsTable)
      .where(
        and(
          eq(practiceSessionsTable.id, sessionId),
          identity.userId == null
            ? and(
                isNull(practiceSessionsTable.userId),
                eq(practiceSessionsTable.ownerId, identity.ownerId),
              )!
            : eq(practiceSessionsTable.userId, identity.userId),
        ),
      );
    if (!session) {
      res.status(404).json({ error: "session not found" });
      return;
    }
    if (session.mode !== "assignment") {
      res
        .status(400)
        .json({ error: "session is not an assignment practice session" });
      return;
    }

    const problems = await db
      .select()
      .from(practiceProblemsTable)
      .where(eq(practiceProblemsTable.sessionId, sessionId))
      .orderBy(asc(practiceProblemsTable.id));

    const answerByProblem = new Map(
      parsed.data.answers.map((a) => [a.problemId, a]),
    );

    let results;
    try {
      results = await Promise.all(
        problems.map(async (problem) => {
        const submitted = answerByProblem.get(problem.id);
        const answer = submitted?.answer ?? "";
        const graded = await gradePracticeEssay({
          prompt: problem.prompt,
          correctAnswer: problem.correctAnswer,
          userAnswer: answer,
          type: problem.type as "multiple_choice" | "freeform",
        });

        await db.insert(practiceAttemptsTable).values({
          sessionId,
          problemId: problem.id,
          topicId: problem.topicId,
          answer,
          correct: graded.correct,
          difficulty: problem.difficulty,
          trace: submitted?.trace ?? null,
        });

        return {
          problemId: problem.id,
          prompt: problem.prompt,
          correct: graded.correct,
          percentage: graded.percentage,
          userAnswer: answer,
          correctAnswer: problem.correctAnswer,
          feedback: graded.feedback,
        };
        }),
      );
    } catch (error) {
      if (error instanceof GradingUnavailableError) {
        res.status(503).json({ error: error.message, retryable: true, graded: false });
        return;
      }
      throw error;
    }

    const total = results.length;
    const score = results.filter((r) => r.correct).length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    res.json(
      GradePracticeAssignmentResponse.parse({
        score,
        total,
        percent,
        results,
      }),
    );
  },
);

export default router;
