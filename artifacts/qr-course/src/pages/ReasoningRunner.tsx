import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useParams, useSearch, useLocation, Link } from "wouter";
import {
  useGetReasoningAssessment,
  useStartReasoningAttempt,
  useSubmitReasoningAttempt,
} from "@workspace/api-client-react";
import type {
  ReasoningItem,
  ReasoningResponseInput,
  ReasoningResult,
  ReasoningReviewItem,
  ReasoningMetric,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

type Format = "mcq" | "hybrid" | "written";
type TestLength = "short" | "medium" | "long";

// How many questions each length contains, per instrument. Mirrors the server
// (see LENGTH_COUNTS in api-server/src/lib/reasoning.ts) so the picker can show
// the question count before the student commits.
type Instrument = "subject" | "general";
const LENGTH_COUNTS: Record<Instrument, Record<TestLength, number>> = {
  subject: { short: 4, medium: 8, long: 12 },
  general: { short: 4, medium: 8, long: 12 },
};

const LENGTH_ORDER: TestLength[] = ["short", "medium", "long"];
const LENGTH_LABELS: Record<TestLength, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};

// Reverse-lookup: given how many questions an attempt actually has, name the
// length. Used so the test header can always show the length even when the
// attempt was resumed (no length param around to remember).
function lengthFromCount(
  instrument: Instrument,
  count: number,
): TestLength | null {
  const counts = LENGTH_COUNTS[instrument];
  return (
    LENGTH_ORDER.find((len) => counts[len] === count) ?? null
  );
}

export default function ReasoningRunner() {
  const params = useParams();
  const assessmentId = Number(params.id);
  const search = useSearch();
  const [, setLocation] = useLocation();
  // A length deep-link from the chooser (e.g. /reasoning/12?length=short) starts
  // the test immediately at that length, skipping the in-page picker.
  const rawLength = new URLSearchParams(search).get("length");
  const lengthParam = (["short", "medium", "long"] as const).includes(
    rawLength as never,
  )
    ? (rawLength as TestLength)
    : null;
  const autoStartedRef = useRef(false);

  const { data: assessment, isLoading } = useGetReasoningAssessment(assessmentId);
  const startAttempt = useStartReasoningAttempt();
  const submitAttempt = useSubmitReasoningAttempt();

  const [result, setResult] = useState<ReasoningResult | null>(null);
  const [alreadyPassed, setAlreadyPassed] = useState<{
    feedback: string | null;
    headline: string | null;
    metrics: ReasoningMetric[] | null;
    review: ReasoningReviewItem[] | null;
  } | null>(null);

  // The items to present for THIS attempt. The first take uses the seeded
  // template; each retake returns freshly generated questions of the same kind.
  const [items, setItems] = useState<ReasoningItem[] | null>(null);

  // Whether an attempt has been kicked off (so the auto-resume effect and the
  // length picker don't fight). `forcePicker` forces the length chooser back up
  // after a retake even though the assessment status is still "passed".
  const [began, setBegan] = useState(false);
  const [forcePicker, setForcePicker] = useState(false);

  // Option selections (mcq / hybrid): itemId -> optionIndex
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  // Written answers (written / hybrid): itemId -> text
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);

  const format = (assessment?.format ?? "mcq") as Format;
  const instrument = (assessment?.instrument ?? "general") as Instrument;

  function beginAttempt(length?: TestLength, retake?: boolean) {
    setBegan(true);
    setError(null);
    startAttempt.mutate(
      {
        assessmentId,
        data: {
          ...(length ? { length } : {}),
          ...(retake ? { retake: true } : {}),
        },
      },
      {
        onSuccess: (data) => {
          setItems(data.items);
          setForcePicker(false);
          if (data.status === "submitted") {
            setAlreadyPassed({
              feedback: data.feedback ?? null,
              headline: data.headline ?? null,
              metrics: data.metrics ?? null,
              review: data.review ?? null,
            });
          }
        },
        onError: () => setBegan(false),
      },
    );
  }

  // Return to the length picker from inside a running test. We don't discard the
  // server attempt here — picking a length restarts it (retake) — but we clear
  // local answers so the chooser shows cleanly.
  function changeLength() {
    setBegan(false);
    setItems(null);
    setMcqAnswers({});
    setWrittenAnswers({});
    setError(null);
    setForcePicker(true);
  }

  // Drive the initial screen once the assessment loads:
  // - A length deep-link (?length=) starts immediately at that length. For a
  //   test that's already underway or passed this means a fresh restart, so we
  //   send retake=true; then we strip the query so a refresh resumes (doesn't
  //   restart) and the picker stays available later.
  // - Otherwise a passed attempt auto-loads its review; not_started and
  //   in_progress fall through to the length picker.
  useEffect(() => {
    if (!assessment || began || result || forcePicker || alreadyPassed) return;
    if (lengthParam && !autoStartedRef.current) {
      autoStartedRef.current = true;
      const retake = assessment.status !== "not_started";
      beginAttempt(lengthParam, retake);
      setLocation(`/reasoning/${assessmentId}`, { replace: true });
      return;
    }
    if (!lengthParam && assessment.status === "passed") {
      beginAttempt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment?.id, assessment?.status, lengthParam]);

  // wouter keeps this component mounted when only the :id param changes, so the
  // one-shot guard must reset per assessment or a second deep-link wouldn't start.
  useEffect(() => {
    autoStartedRef.current = false;
  }, [assessmentId]);

  function buildResponses(list: ReasoningItem[]): ReasoningResponseInput[] {
    return list.map((item) => {
      const base: ReasoningResponseInput = { itemId: item.id };
      if (format !== "written") {
        base.selectedIndex = mcqAnswers[item.id] ?? null;
      }
      if (format !== "mcq") {
        base.writtenAnswer = (writtenAnswers[item.id] ?? "").trim() || null;
      }
      return base;
    });
  }

  function validate(list: ReasoningItem[]): string | null {
    for (const item of list) {
      if (format !== "written" && mcqAnswers[item.id] === undefined) {
        return "Please choose an option for every question before submitting.";
      }
      // Only the pure Written format requires text (there's nothing else to
      // grade). Hybrid is graded on the chosen option, so its short
      // justification is optional — never block submission for a missing one.
      if (format === "written" && !(writtenAnswers[item.id] ?? "").trim()) {
        return "Please write a brief answer for every question before submitting.";
      }
    }
    return null;
  }

  function handleRetake() {
    // Bring the length picker back up so the student can pick a new length for
    // the retake instead of silently reusing the previous one.
    setError(null);
    setItems(null);
    setResult(null);
    setAlreadyPassed(null);
    setMcqAnswers({});
    setWrittenAnswers({});
    setBegan(false);
    setForcePicker(true);
  }

  function handleSubmit() {
    if (!items) return;
    const v = validate(items);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    submitAttempt.mutate(
      { assessmentId, data: { responses: buildResponses(items) } },
      { onSuccess: (data) => setResult(data) },
    );
  }

  if (isLoading || !assessment) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  // Length picker — shown before a brand-new attempt, on retake, and for an
  // unfinished attempt (which also gets a "continue" shortcut). Only a passed
  // attempt being reviewed skips this.
  const showPicker =
    (assessment.status === "not_started" ||
      assessment.status === "in_progress" ||
      forcePicker) &&
    !began &&
    !result &&
    !alreadyPassed;
  if (showPicker) {
    const counts = LENGTH_COUNTS[instrument];
    const isResumable = assessment.status === "in_progress";
    // Picking a length starts a fresh attempt. When one is already underway (or
    // after a pass) that means discarding it, so send retake=true.
    const retakeOnPick = forcePicker || isResumable;
    return (
      <Layout>
        <div className="p-8 max-w-2xl mx-auto w-full flex flex-col gap-8">
          <div className="border-b pb-4">
            <h1 className="text-2xl font-serif font-bold text-primary">
              {assessment.title}
            </h1>
            {assessment.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {assessment.subtitle}
              </p>
            )}
          </div>
          {isResumable && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col gap-2">
              <p className="text-sm">
                You have an unfinished attempt at this test.
              </p>
              <div>
                <Button
                  onClick={() => beginAttempt()}
                  disabled={startAttempt.isPending}
                  data-testid="button-continue-attempt"
                >
                  Continue where I left off
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-lg font-semibold">
              {isResumable
                ? "…or start over at a new length"
                : "How long would you like this test?"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick a length — fewer questions for a quick check, more for a
              fuller picture. You can choose differently each time you take it.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LENGTH_ORDER.map((len) => {
              const n = counts[len];
              return (
                <button
                  key={len}
                  type="button"
                  onClick={() => beginAttempt(len, retakeOnPick)}
                  disabled={startAttempt.isPending}
                  className="text-left rounded-lg border border-border hover:border-primary hover:bg-secondary transition-colors p-4 flex flex-col gap-1 disabled:opacity-50"
                  data-testid={`button-length-${len}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{LENGTH_LABELS[len]}</span>
                    {len === "medium" && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        Standard
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {n} {n === 1 ? "question" : "questions"}
                  </span>
                </button>
              );
            })}
          </div>
          {startAttempt.isPending && (
            <p className="text-sm text-muted-foreground">
              Preparing your questions…
            </p>
          )}
          <div>
            <Link href="/reasoning">
              <Button variant="outline" data-testid="button-back-reasoning-picker">
                Back to Assessments
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Still loading the attempt's items (auto-resume, or right after a length pick).
  if (!items && !alreadyPassed && !result) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  // Result / already-passed screen
  if (result || alreadyPassed) {
    const feedback = result?.feedback ?? alreadyPassed?.feedback ?? "";
    const headline = result?.headline ?? alreadyPassed?.headline ?? null;
    const metrics = result?.metrics ?? alreadyPassed?.metrics ?? [];
    const review = result?.review ?? alreadyPassed?.review ?? [];
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary mb-1">{assessment.title}</h1>
              <span className="inline-flex items-center gap-1.5 text-chart-2 font-medium">
                <CheckCircle2 className="w-5 h-5" /> Completed · ungraded practice
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRetake}
                disabled={startAttempt.isPending}
                data-testid="button-retake-reasoning"
              >
                {startAttempt.isPending ? "Starting…" : "Retake assessment"}
              </Button>
              <Link href="/reasoning">
                <Button variant="outline" data-testid="button-back-reasoning">Back to Assessments</Button>
              </Link>
            </div>
          </div>

          {headline && (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="font-serif text-lg">{headline}</p>
            </div>
          )}

          {metrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-md border border-border p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.label}</div>
                  <div className="text-xl font-semibold">{m.value}</div>
                  {m.detail && <div className="text-xs text-muted-foreground mt-1">{m.detail}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
            <h3 className="font-serif font-semibold mb-2">Feedback</h3>
            <p className="text-sm leading-relaxed whitespace-pre-line">{feedback}</p>
          </div>

          {review.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="font-serif font-semibold text-lg">Your answers</h3>
              {review.map((r, i) => (
                <ReviewCard key={r.itemId} item={r} index={i} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-8 pb-28">
        <div className="border-b pb-4">
          <h1 className="text-2xl font-serif font-bold text-primary">{assessment.title}</h1>
          {assessment.subtitle && <p className="text-sm text-muted-foreground mt-1">{assessment.subtitle}</p>}
          {(() => {
            const count = (items ?? []).length;
            const len = lengthFromCount(instrument, count);
            return (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full bg-chart-2/10 text-chart-2 border border-chart-2/30 px-3 py-1 text-xs font-semibold"
                  data-testid="badge-test-length"
                >
                  {len ? `${LENGTH_LABELS[len]} length` : "Custom length"} ·{" "}
                  {count} {count === 1 ? "question" : "questions"}
                </span>
                <button
                  type="button"
                  onClick={changeLength}
                  className="text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
                  data-testid="button-change-length"
                >
                  Change length
                </button>
              </div>
            );
          })()}
          <p className="text-sm text-muted-foreground mt-3">{assessment.instructions}</p>
        </div>

        <div className="flex flex-col gap-10">
          {(items ?? []).map((item, idx) => (
            <Question
              key={item.id}
              index={idx}
              item={item}
              format={format}
              selected={mcqAnswers[item.id]}
              onSelect={(opt) => setMcqAnswers((p) => ({ ...p, [item.id]: opt }))}
              written={writtenAnswers[item.id] ?? ""}
              onWrite={(val) =>
                setWrittenAnswers((p) => ({ ...p, [item.id]: val }))
              }
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="flex justify-end border-t pt-5">
          <Button
            onClick={handleSubmit}
            disabled={submitAttempt.isPending}
            className="bg-chart-2 hover:bg-chart-2/90 text-white"
            data-testid="button-submit-reasoning"
          >
            {submitAttempt.isPending ? "Submitting…" : "Submit Assessment"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

function Question({
  index,
  item,
  format,
  selected,
  onSelect,
  written,
  onWrite,
}: {
  index: number;
  item: ReasoningItem;
  format: Format;
  selected: number | undefined;
  onSelect: (opt: number) => void;
  written: string;
  onWrite: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid={`question-${item.id}`}>
      <h3 className="font-medium whitespace-pre-line leading-relaxed">
        <span className="text-muted-foreground mr-2">{index + 1}.</span>
        {item.prompt}
      </h3>

      {format !== "written" && (
        <div className="flex flex-col gap-2">
          {(item.options ?? []).map((opt, oi) => {
            const active = selected === oi;
            return (
              <button
                key={oi}
                type="button"
                onClick={() => onSelect(oi)}
                className={`text-left px-4 py-3 rounded-md border transition-colors ${
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-secondary"
                }`}
                data-testid={`option-${item.id}-${oi}`}
              >
                <span className="font-mono text-xs text-muted-foreground mr-2">
                  {String.fromCharCode(65 + oi)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {format !== "mcq" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            {format === "hybrid"
              ? "Add a quick note on your reasoning (optional):"
              : "Your answer — a sentence is plenty:"}
          </p>
          <AnswerInput
            draftKey={`reasoning-item-${item.id}`}
            value={written}
            onChange={(val) => onWrite(val)}
            compact
            allowPaste
            placeholder={
              format === "hybrid"
                ? "Optional — a few words on why…"
                : "A sentence in your own words…"
            }
          />
        </div>
      )}
    </div>
  );
}

function ReviewCard({ item, index }: { item: ReasoningReviewItem; index: number }) {
  const options = item.options ?? null;
  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid={`review-item-${item.itemId}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="font-medium whitespace-pre-line">
          <span className="text-muted-foreground mr-2">{index + 1}.</span>
          {item.prompt}
        </p>
        {item.isCorrect === null ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground text-sm font-medium shrink-0">
            <AlertCircle className="w-4 h-4" /> No answer
          </span>
        ) : item.isCorrect ? (
          <span className="inline-flex items-center gap-1 text-chart-2 text-sm font-medium shrink-0">
            <CheckCircle2 className="w-4 h-4" /> Correct
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-destructive text-sm font-medium shrink-0">
            <XCircle className="w-4 h-4" /> Incorrect
          </span>
        )}
      </div>

      {options && (
        <div className="flex flex-col gap-2">
          {options.map((opt, oi) => {
            const isCorrect = oi === item.correctIndex;
            const isSelected = oi === item.selectedIndex;
            const cls = isCorrect
              ? "border-chart-2 bg-chart-2/10"
              : isSelected
                ? "border-destructive bg-destructive/10"
                : "border-border";
            return (
              <div
                key={oi}
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${cls}`}
              >
                <span>{opt}</span>
                <span className="flex items-center gap-2 text-xs shrink-0">
                  {isSelected && <span className="text-muted-foreground">Your answer</span>}
                  {isCorrect && (
                    <span className="inline-flex items-center gap-1 text-chart-2 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct answer
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {item.writtenAnswer && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Your answer
          </div>
          <p className="text-sm whitespace-pre-line">{item.writtenAnswer}</p>
        </div>
      )}

      {item.rationale && (
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {item.rationale}
        </p>
      )}

      {item.modelAnswer && (
        <div className="mt-3 rounded-md border border-chart-2/30 bg-chart-2/5 p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Model answer
          </div>
          <p className="text-sm whitespace-pre-line">{item.modelAnswer}</p>
        </div>
      )}
    </div>
  );
}
