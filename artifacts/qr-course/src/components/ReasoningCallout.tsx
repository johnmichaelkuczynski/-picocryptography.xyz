import React from "react";
import { useListReasoningAssessments } from "@workspace/api-client-react";
import type { ReasoningAssessmentSummary } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Scale, Brain, CheckCircle2 } from "lucide-react";

type Phase = "before" | "third" | "twothirds" | "after";
type Instrument = "subject" | "general";

const HEADINGS: Record<Phase, string> = {
  before: "Optional warm-up: diagnostic checks",
  third: "One-third through: diagnostic checks",
  twothirds: "Two-thirds through: diagnostic checks",
  after: "After the course: diagnostic checks",
};

const BLURBS: Record<Phase, string> = {
  before:
    "Try a quick check before you begin — entirely optional, ungraded, and retakeable as often as you like.",
  third: "Check in on your reasoning a third of the way through. Ungraded practice.",
  twothirds: "Check in again two-thirds of the way through. Ungraded practice.",
  after: "Take a check after the course to see your growth. Ungraded practice.",
};

const INSTRUMENT_LABELS: Record<Instrument, string> = {
  subject: "Integration Cases",
  general: "General Reasoning",
};

// One row per instrument. Each instrument has three format versions; the row
// links to the chooser (/reasoning) where the student picks a format and length.
function Row({
  instrument,
  versions,
}: {
  instrument: Instrument;
  versions: ReasoningAssessmentSummary[];
}) {
  const Icon = instrument === "subject" ? Scale : Brain;
  const done = versions.some((v) => v.status === "passed");
  const inProgress = versions.some((v) => v.status === "in_progress");
  return (
    <Link href="/reasoning">
      <div
        className="flex items-center justify-between gap-4 p-3 rounded-md border border-border bg-background hover:bg-secondary/50 cursor-pointer"
        data-testid={`callout-reasoning-${instrument}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">
            {INSTRUMENT_LABELS[instrument]}
          </span>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-xs text-chart-2 font-medium shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        ) : (
          <Button size="sm" variant="default" className="shrink-0">
            {inProgress ? "Resume" : "Begin"}
          </Button>
        )}
      </div>
    </Link>
  );
}

export function ReasoningCallout({ phase }: { phase: Phase }) {
  const { data } = useListReasoningAssessments();
  const items = (data ?? []).filter((a) => a.phase === phase);
  if (items.length === 0) return null;

  const instruments: Instrument[] = ["subject", "general"];
  const grouped = instruments
    .map((inst) => ({
      instrument: inst,
      versions: items.filter((a) => a.instrument === inst),
    }))
    .filter((g) => g.versions.length > 0);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif font-semibold">{HEADINGS[phase]}</h3>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Ungraded
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{BLURBS[phase]}</p>
        <div className="flex flex-col gap-2">
          {grouped.map((g) => (
            <Row key={g.instrument} instrument={g.instrument} versions={g.versions} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
