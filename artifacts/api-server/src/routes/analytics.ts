import { Router, type IRouter } from "express";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Request } from "express";
import {
  db,
  topicsTable,
  attemptsTable,
  practiceAttemptsTable,
  practiceSessionsTable,
  assignmentsTable,
} from "@workspace/db";
import {
  GetAnalyticsSummaryResponse,
  GetTopicAnalyticsResponse,
  GetRecentActivityResponse,
  GenerateReportResponse,
} from "@workspace/api-zod";
import { chatJson } from "../lib/ai";
import { getAccessIdentity } from "../lib/access";

const router: IRouter = Router();

type StrengthLabel = "strong" | "solid" | "developing" | "weak" | "untested";
function labelFor(accuracy: number, attempts: number): StrengthLabel {
  if (attempts === 0) return "untested";
  if (accuracy >= 0.9) return "strong";
  if (accuracy >= 0.75) return "solid";
  if (accuracy >= 0.5) return "developing";
  return "weak";
}

function ownedAttemptCondition(req: Request) {
  const identity = getAccessIdentity(req);
  return {
    identity,
    condition:
      identity.userId == null
        ? and(
            isNull(attemptsTable.userId),
            eq(attemptsTable.ownerId, identity.ownerId),
          )!
        : eq(attemptsTable.userId, identity.userId),
  };
}

async function topicStats(req: Request) {
  const { identity } = ownedAttemptCondition(req);
  const topics = await db
    .select()
    .from(topicsTable)
    .orderBy(asc(topicsTable.position));
  const stats = await db.execute(sql`
    select pa.topic_id, count(*)::int as n,
           avg(case when pa.correct then 1.0 else 0.0 end) as acc
    from practice_attempts pa
    join practice_sessions ps on ps.id = pa.session_id
    where (${identity.userId}::int is null and ps.user_id is null
           and ps.owner_id = ${identity.ownerId})
       or (${identity.userId}::int is not null and ps.user_id = ${identity.userId})
    group by pa.topic_id
  `);
  const byId = new Map<number, { n: number; acc: number }>();
  for (const r of stats.rows as Array<{ topic_id: number; n: number; acc: number }>) {
    byId.set(Number(r.topic_id), { n: Number(r.n), acc: Number(r.acc) });
  }
  return topics.map((t) => {
    const s = byId.get(t.id);
    const attempts = s?.n ?? 0;
    const accuracy = attempts === 0 ? 0 : s!.acc;
    return {
      topicId: t.id,
      topicTitle: t.title,
      weekNumber: t.weekNumber,
      attempts,
      accuracy: Number(accuracy.toFixed(3)),
      strengthLabel: labelFor(accuracy, attempts),
    };
  });
}

router.get("/analytics/summary", async (req, res) => {
  const owner = ownedAttemptCondition(req);
  const submitted = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.status, "submitted"), owner.condition));
  const officialAverage =
    submitted.length === 0
      ? 0
      : submitted.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / submitted.length;

  const practiceResult = await db.execute(sql`
    select pa.* from practice_attempts pa
    join practice_sessions ps on ps.id = pa.session_id
    where (${owner.identity.userId}::int is null and ps.user_id is null
           and ps.owner_id = ${owner.identity.ownerId})
       or (${owner.identity.userId}::int is not null and ps.user_id = ${owner.identity.userId})
  `);
  const practice = practiceResult.rows as Array<{
    correct: boolean;
    createdAt?: Date;
    created_at?: Date;
  }>;
  const practiceCorrect = practice.filter((p) => p.correct).length;
  const practiceAccuracy =
    practice.length === 0 ? 0 : (practiceCorrect / practice.length) * 100;

  const days = new Set<string>();
  for (const p of practice)
    days.add(new Date(p.createdAt ?? p.created_at!).toISOString().slice(0, 10));
  for (const a of submitted)
    if (a.submittedAt) days.add(new Date(a.submittedAt).toISOString().slice(0, 10));

  // streak: consecutive days ending today
  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streakDays++;
    else if (i > 0) break;
  }

  const topics = await topicStats(req);
  const tested = topics.filter((t) => t.attempts > 0);
  tested.sort((a, b) => b.accuracy - a.accuracy);
  const strongest = tested[0]?.topicTitle ?? null;
  const weakest = tested[tested.length - 1]?.topicTitle ?? null;

  res.json(
    GetAnalyticsSummaryResponse.parse({
      officialAverage: Number(officialAverage.toFixed(2)),
      practiceAccuracy: Number(practiceAccuracy.toFixed(2)),
      attemptsCount: submitted.length,
      practiceCount: practice.length,
      streakDays,
      strongestTopic: strongest,
      weakestTopic: weakest,
    }),
  );
});

router.get("/analytics/topics", async (req, res) => {
  const rows = await topicStats(req);
  res.json(GetTopicAnalyticsResponse.parse(rows));
});

router.get("/analytics/activity", async (req, res) => {
  const owner = ownedAttemptCondition(req);
  const recentPractice = await db
    .select({
      id: practiceAttemptsTable.id,
      createdAt: practiceAttemptsTable.createdAt,
      correct: practiceAttemptsTable.correct,
      topicId: practiceAttemptsTable.topicId,
    })
    .from(practiceAttemptsTable)
    .innerJoin(
      // Ownership is inherited from the session.
      practiceSessionsTable,
      eq(practiceAttemptsTable.sessionId, practiceSessionsTable.id),
    )
    .where(
      owner.identity.userId == null
        ? and(
            isNull(practiceSessionsTable.userId),
            eq(practiceSessionsTable.ownerId, owner.identity.ownerId),
          )!
        : eq(practiceSessionsTable.userId, owner.identity.userId),
    )
    .orderBy(desc(practiceAttemptsTable.id))
    .limit(20);
  const topics = await db.select().from(topicsTable);
  const topicById = new Map(topics.map((t) => [t.id, t.title]));

  const recentAttempts = await db
    .select({
      id: attemptsTable.id,
      submittedAt: attemptsTable.submittedAt,
      scorePercent: attemptsTable.scorePercent,
      assignmentId: attemptsTable.assignmentId,
    })
    .from(attemptsTable)
    .where(and(eq(attemptsTable.status, "submitted"), owner.condition))
    .orderBy(desc(attemptsTable.id))
    .limit(20);
  const assignments = await db.select().from(assignmentsTable);
  const aById = new Map(assignments.map((a) => [a.id, a.title]));

  const items = [
    ...recentPractice.map((p) => ({
      id: p.id,
      kind: "practice" as const,
      title: `Practice — ${topicById.get(p.topicId) ?? "Topic"}`,
      at: p.createdAt.toISOString(),
      score: p.correct ? 100 : 0,
      topicTitle: topicById.get(p.topicId) ?? null,
    })),
    ...recentAttempts.map((a) => ({
      id: a.id + 1_000_000,
      kind: "assignment" as const,
      title: aById.get(a.assignmentId) ?? "Assignment",
      at: (a.submittedAt ?? new Date()).toISOString(),
      score: a.scorePercent ?? null,
      topicTitle: null,
    })),
  ].sort((x, y) => y.at.localeCompare(x.at));

  res.json(GetRecentActivityResponse.parse(items.slice(0, 30)));
});

router.post("/analytics/report", async (req, res) => {
  const owner = ownedAttemptCondition(req);
  const topics = await topicStats(req);
  const submitted = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.status, "submitted"), owner.condition));
  const officialAverage =
    submitted.length === 0
      ? 0
      : submitted.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / submitted.length;

  const tested = topics.filter((t) => t.attempts > 0);
  tested.sort((a, b) => a.accuracy - b.accuracy);
  const weakest = tested.slice(0, 3).map((t) => t.topicTitle);
  const strongest = tested.slice(-3).reverse().map((t) => t.topicTitle);

  let narrative = "";
  let recommendations: string[] = [];
  try {
    const out = await chatJson<{ narrative: string; recommendations: string[] }>(
      "You are an academic advisor for the course Cryptography: Secrets, Locks, and Digital Trust, covering substitution ciphers, one-time pads, block encryption, hashes and passwords, key agreement, public keys and signatures, implementation failures, quantum risk, and backdoors. Write a 2-paragraph, encouraging but honest narrative summary, then list 3 concrete next-step recommendations. Strict JSON: {\"narrative\": string, \"recommendations\": string[]}.",
      JSON.stringify({
        officialAverage,
        attempts: submitted.length,
        weakestTopics: weakest,
        strongestTopics: strongest,
        perTopic: topics,
      }),
    );
    narrative = out.narrative;
    recommendations = out.recommendations ?? [];
  } catch {
    narrative =
      tested.length === 0
        ? "You haven't accumulated enough graded work yet to draw conclusions. Try a practice session or finish a homework, then regenerate this report."
        : `You're averaging ${officialAverage.toFixed(
            1,
          )}% on official assignments. Your strongest area so far is ${
            strongest[0] ?? "n/a"
          }; your weakest is ${weakest[0] ?? "n/a"}.`;
    recommendations =
      weakest.length > 0
        ? weakest.map((w) => `Run a focused practice session on ${w}.`)
        : ["Open a homework and start with a small set of problems."];
  }

  res.json(
    GenerateReportResponse.parse({
      generatedAt: new Date().toISOString(),
      narrative,
      strengths: strongest,
      weaknesses: weakest,
      recommendations,
    }),
  );
});

export default router;
