import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  PlayCircle,
  Activity,
  ShieldCheck,
  FileCheck2,
} from "lucide-react";
import {
  useRunLiveAnswerDiagnostic,
  type LiveAnswerDiagnosticResult,
} from "@workspace/api-client-react";

type Step = {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
  error?: string;
};
type RunResult = {
  ok: boolean;
  generatedAt: string;
  steps: Step[];
};

const API = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`.replace(
  /^\/api/,
  "/api",
);

function apiUrl(path: string): string {
  // The api-server is mounted at /api at the proxy level, not under the artifact path.
  return `/api${path}`;
}

function StepRow({ s }: { s: Step }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      {s.ok ? (
        <CheckCircle2 className="w-5 h-5 text-green-700 mt-0.5 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-700 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{s.name}</div>
        {s.detail && (
          <div className="text-xs text-muted-foreground mt-0.5 break-words">{s.detail}</div>
        )}
        {s.error && (
          <div className="text-xs text-red-700 mt-0.5 break-words font-mono">{s.error}</div>
        )}
      </div>
      <div className="text-xs text-muted-foreground tabular-nums shrink-0">{s.ms} ms</div>
    </div>
  );
}

function ResultCard({ title, result }: { title: string; result: RunResult | null }) {
  if (!result) return null;
  const passed = result.steps.filter((s) => s.ok).length;
  const total = result.steps.length;
  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="font-serif text-lg">{title}</div>
        <div
          className={`text-sm font-medium ${
            result.ok ? "text-green-700" : "text-red-700"
          }`}
        >
          {passed}/{total} passed
        </div>
      </div>
      <div className="px-5 py-2">
        {result.steps.map((s, i) => (
          <StepRow key={i} s={s} />
        ))}
      </div>
    </div>
  );
}

export default function Diagnostics() {
  const runLiveAnswer = useRunLiveAnswerDiagnostic();
  const [sysBusy, setSysBusy] = useState(false);
  const [synthBusy, setSynthBusy] = useState(false);
  const [qcBusy, setQcBusy] = useState(false);

  const [sysResult, setSysResult] = useState<RunResult | null>(null);
  const [synthResult, setSynthResult] = useState<RunResult | null>(null);
  const [qcResult, setQcResult] = useState<RunResult | null>(null);
  const [sysError, setSysError] = useState<string | null>(null);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [qcError, setQcError] = useState<string | null>(null);

  const [liveBusy, setLiveBusy] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<LiveAnswerDiagnosticResult | null>(null);

  async function runSystem() {
    setSysBusy(true);
    setSysError(null);
    setSysResult(null);
    try {
      const r = await fetch(apiUrl("/diagnostics/system"));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSysResult(await r.json());
    } catch (e) {
      setSysError(e instanceof Error ? e.message : String(e));
    } finally {
      setSysBusy(false);
    }
  }

  async function runSynthetic() {
    setSynthBusy(true);
    setSynthError(null);
    setSynthResult(null);
    try {
      const r = await fetch(apiUrl("/diagnostics/synthetic-run"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSynthResult(await r.json());
    } catch (e) {
      setSynthError(e instanceof Error ? e.message : String(e));
    } finally {
      setSynthBusy(false);
    }
  }

  async function runQualityControl() {
    setQcBusy(true);
    setQcError(null);
    setQcResult(null);
    try {
      const r = await fetch(apiUrl("/diagnostics/quality-control"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setQcResult(await r.json());
    } catch (e) {
      setQcError(e instanceof Error ? e.message : String(e));
    } finally {
      setQcBusy(false);
    }
  }

  async function handleRunLiveAnswerDiagnostic() {
    setLiveBusy(true);
    setLiveError(null);
    setLiveResult(null);
    try {
      const res = await runLiveAnswer.mutateAsync();
      setLiveResult(res);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : String(error));
    } finally {
      setLiveBusy(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="font-serif text-3xl mb-1">Diagnostics</h1>
          <p className="text-muted-foreground">
            Four self-tests to verify the course app is healthy end-to-end.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl flex items-center gap-2">
                <Activity className="w-5 h-5" /> Diagnostic 1 — System check
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Verifies database connectivity, content seed, OpenAI integration (chat + JSON
                mode), detection pipeline, and the grader. Takes a few seconds.
              </p>
            </div>
            <button
              onClick={runSystem}
              disabled={sysBusy}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
            >
              {sysBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {sysBusy ? "Running..." : "Run system check"}
            </button>
          </div>
          {sysError && (
            <div className="text-sm text-red-700 font-mono">{sysError}</div>
          )}
          <ResultCard title="System check results" result={sysResult} />
        </section>

        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl flex items-center gap-2">
                <Activity className="w-5 h-5" /> Diagnostic 2 — Synthetic student
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Walks a synthetic student through the whole course: reads every lecture,
                starts and submits every assignment (homework, tests, midterm, final), runs
                adaptive practice, asks the AI tutor, and triggers AI + diachronic detection.
                This exercises every endpoint a real student would touch and can take
                several minutes (each grade and generation is an LLM call). The AI detector
                will fire on the synthetic answers — that is the intended behavior.
              </p>
            </div>
            <button
              onClick={runSynthetic}
              disabled={synthBusy}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
            >
              {synthBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {synthBusy ? "Running..." : "Run synthetic student"}
            </button>
          </div>
          {synthError && (
            <div className="text-sm text-red-700 font-mono">{synthError}</div>
          )}
          <ResultCard title="Synthetic student results" result={synthResult} />
        </section>

        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Diagnostic 3 — Answer-key quality control
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Uses OpenAI to independently re-derive the answer to a sample of course
                problems across the entire course and verify that each seeded answer key is a
                legitimate, correct, and unambiguous answer to its prompt. Any key the model
                judges wrong, off-topic, or ambiguous is flagged before a student is ever
                graded against it. Each review is an LLM call, so this can take a minute.
              </p>
            </div>
            <button
              onClick={runQualityControl}
              disabled={qcBusy}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
            >
              {qcBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {qcBusy ? "Running..." : "Run quality control"}
            </button>
          </div>
          {qcError && (
            <div className="text-sm text-red-700 font-mono">{qcError}</div>
          )}
          <ResultCard title="Answer-key quality-control results" result={qcResult} />
        </section>

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl flex items-center gap-2">
                <FileCheck2 className="w-5 h-5" /> Diagnostic 4 — Live Answer Proof
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generates, persists, reads back, and grades a live student answer to verify the entire pipeline.
                Shows exact lengths, hashes, match status, numeric percentage, and every stage of execution.
              </p>
            </div>
            <button
              onClick={handleRunLiveAnswerDiagnostic}
              disabled={liveBusy}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
            >
              {liveBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              {liveBusy ? "Running Proof..." : "Run Live Answer Proof"}
            </button>
          </div>

          {liveError && (
            <div
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800"
            >
              <div className="font-semibold">Diagnostic failed visibly</div>
              <div className="font-mono mt-1 break-words">{liveError}</div>
            </div>
          )}

          {liveResult && (
            <div
              className={`border rounded-lg overflow-hidden ${
                liveResult.ok
                  ? "border-green-300 bg-green-50/40"
                  : "border-red-300 bg-red-50/40"
              }`}
            >
              <div className="px-5 py-3 border-b border-inherit flex flex-wrap items-center justify-between gap-2">
                <div className="font-serif text-lg">Live proof results</div>
                <div
                  className={`inline-flex items-center gap-2 text-sm font-semibold ${
                    liveResult.ok ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {liveResult.ok ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  {liveResult.ok
                    ? "Complete text persisted exactly"
                    : "Persistence mismatch detected"}
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">
                      Generated characters
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {liveResult.generatedLength.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">
                      Persisted characters
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {liveResult.persistedLength.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">
                      Score Percentage
                    </div>
                    <div className="text-lg font-semibold tabular-nums text-chart-1">
                      {liveResult.percentage}%
                    </div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">
                      Temporary data cleanup
                    </div>
                    <div className="text-lg font-semibold">
                      {liveResult.cleanedUp ? "PASS" : "FAIL"}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-medium mb-1">Generated SHA-256</div>
                    <div className="font-mono break-all text-muted-foreground">
                      {liveResult.generatedHash}
                    </div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-medium mb-1">Persisted SHA-256</div>
                    <div className="font-mono break-all text-muted-foreground">
                      {liveResult.persistedHash}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border bg-background p-4">
                  <div className="font-medium text-sm mb-3">Diagnostic Stages</div>
                  <div className="space-y-3">
                    {liveResult.stages.map((stage, idx) => (
                      <div key={idx} className="flex gap-2">
                        {stage.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{stage.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{stage.evidence}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border bg-background p-4">
                  <div className="font-medium text-sm mb-1">
                    Real grader feedback
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {liveResult.feedback}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium text-sm mb-2 text-muted-foreground">
                      Exact generated answer
                    </div>
                    <div className="whitespace-pre-wrap break-words rounded-md border bg-muted/20 p-4 text-sm leading-relaxed max-h-64 overflow-y-auto">
                      {liveResult.generatedAnswer}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm mb-2">
                      Exact persisted database answer (read back before grading)
                    </div>
                    <div className="whitespace-pre-wrap break-words rounded-md border bg-background p-4 text-sm leading-relaxed max-h-64 overflow-y-auto">
                      {liveResult.persistedAnswer}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
