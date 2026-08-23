import { Link } from "wouter";
import {
  BarChart3,
  BookOpen,
  MessagesSquare,
  Target,
  ClipboardCheck,
  ShieldCheck,
  Search,
  Download,
} from "lucide-react";
import TopicsRail, { pdfUrl, txtUrl } from "@/components/TopicsRail";

const features = [
  {
    icon: BookOpen,
    title: "Three-Depth Lessons",
    body: "Read any topic Short, Medium, or Long — same ideas, your pace.",
  },
  {
    icon: MessagesSquare,
    title: "Section-Scoped Tutor",
    body: "Ask about the exact passage you're on and get a live, grounded answer.",
  },
  {
    icon: Target,
    title: "Adaptive Practice",
    body: "Questions that get harder on a streak and ease off after a miss.",
  },
  {
    icon: ClipboardCheck,
    title: "AI-Graded Work",
    body: "Homework, a course test, and a final — each with written feedback.",
  },
  {
    icon: ShieldCheck,
    title: "Built-In Integrity",
    body: "Every submission is screened for AI authorship, with a clear verdict.",
  },
  {
    icon: BarChart3,
    title: "One Intensive Day, 2 Topics",
    body: "From the generative-model API surface through a production integration.",
  },
];

const topics = [
  {
    session: "Morning session",
    title: "Models as tools: what a generative model actually gives you",
  },
  {
    session: "Afternoon session",
    title: "Building with generation: wiring a model into a real system",
  },
];

function CourseEntryButton({
  label,
  className,
  testId,
}: {
  label: string;
  className: string;
  testId: string;
}) {
  return (
    <Link href="/dashboard">
      <button className={className} data-testid={testId}>
        {label}
      </button>
    </Link>
  );
}

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Search className="w-4 h-4" />
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight">
            Generative AI Integration
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CourseEntryButton
            label="Enter the course"
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            testId="button-enter-course"
          />
        </div>
      </header>

      <main className="flex-1 flex items-start">
        <div className="hidden lg:block pl-6 pt-6">
          <TopicsRail />
        </div>
        <div className="flex-1 min-w-0">
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary leading-tight mb-8">
            A one-day intensive course on integrating generative AI into real systems.
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CourseEntryButton
              label="Start the course"
              className="inline-flex items-center px-6 py-3 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              testId="button-cta-start"
            />
            <a
              href={pdfUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-base font-medium border border-border hover:bg-secondary transition-colors"
              data-testid="button-download-pdf"
            >
              <Download className="w-5 h-5" />
              Download the course (PDF)
            </a>
            <a
              href={txtUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-base font-medium border border-border hover:bg-secondary transition-colors"
              data-testid="button-download-txt"
            >
              <Download className="w-5 h-5" />
              TXT
            </a>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-card p-6 flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-primary">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-24">
          <h2 className="text-center font-serif font-semibold text-xl mb-2">
            Topics Covered in This Course
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-6">
            One intensive day, two topics — every lecture readable free online, or{" "}
            <a href={pdfUrl} className="underline hover:text-foreground" data-testid="link-download-pdf">
              download the course as a PDF
            </a>{" "}
            (short lectures plus sample homework and exams).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topics.map((t) => (
              <div
                key={t.title}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  {t.session}
                </div>
                <div className="font-medium">{t.title}</div>
              </div>
            ))}
          </div>
        </section>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        Generative AI Integration
      </footer>
    </div>
  );
}
