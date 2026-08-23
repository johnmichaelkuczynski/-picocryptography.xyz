import { useEffect, useState } from "react";
import { Download } from "lucide-react";

const base = import.meta.env.BASE_URL;
export const pdfUrl = `${base}api/course/download-pdf`;
export const txtUrl = `${base}api/course/download-txt`;

/** Strip numbering like "1.1 " from a lecture/topic title. */
function plainTitle(title: string): string {
  return title.replace(/^\s*\d+(\.\d+)*\s*[-–—:.]?\s*/, "").trim();
}

type OverviewWeek = { lectures?: Array<{ title: string }> };
type Overview = { weeks?: OverviewWeek[] };

const COURSE_TOPIC_TITLES = [
  "Models as tools: what a generative model actually gives you",
  "Building with generation: wiring a model into a real system",
];

export function useCourseTopicTitles(): string[] {
  const [titles, setTitles] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`${base}api/course/overview`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<Overview>) : null))
      .then((data) => {
        if (cancelled || !data?.weeks) return;
        const list = data.weeks.flatMap(
          (w) => w.lectures?.map((l) => plainTitle(l.title)) ?? [],
        );
        setTitles(
          list.map(
            (title, index) => COURSE_TOPIC_TITLES[index] ?? plainTitle(title),
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return titles;
}

/**
 * Small, unobtrusive vertical list of every topic covered in the course,
 * meant to sit at the top-left of the Landing page and Dashboard.
 * No unit/week meta-markers — just the plain topic titles.
 */
export default function TopicsRail() {
  const titles = useCourseTopicTitles();
  if (titles.length === 0) return null;

  return (
    <aside
      className="w-56 shrink-0 rounded-lg border border-border bg-card p-4"
      data-testid="topics-rail"
    >
      <h2 className="font-serif font-bold text-base mb-0.5">
        Topics Covered in This Course
      </h2>
      <p className="text-[11px] text-muted-foreground mb-3">
        {titles.length} topics
      </p>
      <ul className="space-y-2.5">
        {titles.map((t) => (
          <li
            key={t}
            className="text-sm font-medium leading-snug text-foreground"
            data-testid={`topics-rail-item`}
          >
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-1.5">
        <a
          href={pdfUrl}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          data-testid="rail-download-pdf"
        >
          <Download className="w-3.5 h-3.5" />
          Download Course (PDF)
        </a>
        <a
          href={txtUrl}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-secondary transition-colors"
          data-testid="rail-download-txt"
        >
          <Download className="w-3.5 h-3.5" />
          Download Course (TXT)
        </a>
        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
          Every lecture (short version) plus practice homework and exam
          problems.
        </p>
      </div>
    </aside>
  );
}
