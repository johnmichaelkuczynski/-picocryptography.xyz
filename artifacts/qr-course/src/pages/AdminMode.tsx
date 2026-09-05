import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  useListAssignments,
  useGetAssignment,
  useRunGraderLab,
  GraderLabResult,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useAdminMode } from "@/lib/adminMode";

type Source = "problem" | "custom";

export default function AdminMode() {
  const [adminMode, setAdminMode] = useAdminMode();

  const [source, setSource] = useState<Source>("problem");
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [problemId, setProblemId] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [result, setResult] = useState<GraderLabResult | null>(null);

  const { data: assignments } = useListAssignments();
  const { data: assignment } = useGetAssignment(assignmentId ?? 0, {
    query: { enabled: !!assignmentId, queryKey: ["assignment", assignmentId] },
  });
  const runLab = useRunGraderLab();

  const canRun =
    source === "problem"
      ? problemId != null
      : customPrompt.trim().length > 0 && customAnswer.trim().length > 0;

  const handleRun = () => {
    const data =
      source === "problem"
        ? { problemId }
        : { prompt: customPrompt, correctAnswer: customAnswer };
    runLab.mutate(
      { data },
      {
        onSuccess: (r) => setResult(r),
      },
    );
  };

  if (!adminMode) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
          <h1 className="text-3xl font-serif font-bold text-primary">
            Administrator
          </h1>
          <p className="text-muted-foreground">
            Administrator mode is off. Turn it on to disable AI detection on your
            submissions, enable pasting in answer boxes, and use the Grader Lab.
          </p>
          <div>
            <Button onClick={() => setAdminMode(true)} data-testid="button-enable-admin">
              Enable administrator mode
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">
              Grader Lab
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Generate a spread of candidate answers for a question — correct ones
              written as fragments or ALL CAPS, wrong ones written as polished
              sentences, and more — then see exactly how the grader scores each.
              No AI detection runs here.
            </p>
          </div>
          <Button variant="outline" onClick={() => setAdminMode(false)}>
            Turn off admin mode
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSource("problem")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                source === "problem"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-secondary"
              }`}
              data-testid="tab-problem"
            >
              Pick a real problem
            </button>
            <button
              onClick={() => setSource("custom")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                source === "custom"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-secondary"
              }`}
              data-testid="tab-custom"
            >
              Custom question
            </button>
          </div>

          {source === "problem" ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Assignment</span>
                <select
                  className="border border-input rounded-md p-2 bg-background"
                  value={assignmentId ?? ""}
                  onChange={(e) => {
                    setAssignmentId(e.target.value ? Number(e.target.value) : null);
                    setProblemId(null);
                  }}
                  data-testid="select-assignment"
                >
                  <option value="">Select an assignment…</option>
                  {(assignments ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      Hour {a.weekNumber} — {a.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Problem</span>
                <select
                  className="border border-input rounded-md p-2 bg-background"
                  value={problemId ?? ""}
                  onChange={(e) =>
                    setProblemId(e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={!assignment}
                  data-testid="select-problem"
                >
                  <option value="">Select a problem…</option>
                  {(assignment?.problems ?? []).map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      Problem {idx + 1}: {p.prompt.slice(0, 60)}
                      {p.prompt.length > 60 ? "…" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Question</span>
                <textarea
                  className="border border-input rounded-md p-3 bg-background min-h-[80px]"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="The exact question stem…"
                  data-testid="input-custom-prompt"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Model / correct answer</span>
                <textarea
                  className="border border-input rounded-md p-3 bg-background min-h-[80px]"
                  value={customAnswer}
                  onChange={(e) => setCustomAnswer(e.target.value)}
                  placeholder="The reference answer the grader compares against…"
                  data-testid="input-custom-answer"
                />
              </label>
            </div>
          )}

          <div>
            <Button
              onClick={handleRun}
              disabled={!canRun || runLab.isPending}
              data-testid="button-run-lab"
            >
              {runLab.isPending ? "Generating & grading…" : "Run grader lab"}
            </Button>
          </div>
        </div>

        {runLab.isError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
            Something went wrong running the grader lab. Try again.
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="text-sm font-semibold mb-1">Question</div>
              <div className="text-sm mb-3">
                <MarkdownRenderer content={result.prompt} />
              </div>
              <div className="text-sm font-semibold mb-1">Model answer</div>
              <div className="text-sm">
                <MarkdownRenderer content={result.correctAnswer} />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {result.cases.filter((c) => c.match).length} of {result.cases.length}{" "}
              cases graded as expected.
            </div>

            <div className="flex flex-col gap-3">
              {result.cases.map((c, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${
                    c.match
                      ? "border-chart-2/40 bg-chart-2/5"
                      : "border-destructive/50 bg-destructive/5"
                  }`}
                  data-testid={`case-${c.kind}`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <div className="font-medium">{c.label}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-secondary border border-border font-mono">
                        {c.kind}
                      </span>
                      <span>
                        expected:{" "}
                        <strong>{c.expectedCorrect ? "correct" : "wrong"}</strong>
                      </span>
                      <span>
                        graded:{" "}
                        <strong
                          className={
                            c.gradedCorrect ? "text-chart-2" : "text-destructive"
                          }
                        >
                          {c.gradedCorrect ? "correct" : "wrong"}
                        </strong>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          c.match
                            ? "bg-chart-2/15 text-chart-2"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {c.match ? "MATCH" : "MISMATCH"}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-semibold">Answer: </span>
                    <span className="font-mono whitespace-pre-wrap">
                      {c.answer || "(blank)"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold">Grader said: </span>
                    {c.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
