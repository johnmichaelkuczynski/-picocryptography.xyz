import { Link } from "wouter";
import {
  BarChart3,
  BookOpen,
  MessagesSquare,
  Target,
  ClipboardCheck,
  ShieldCheck,
  Search,
  LogIn,
  LogOut,
} from "lucide-react";
import { useAuth, loginUrl } from "@/lib/auth";

function LandingAuthControls() {
  const { authenticated, user, logout, isLoading } = useAuth();

  if (isLoading) return null;

  if (authenticated) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden sm:inline text-sm text-muted-foreground max-w-[12rem] truncate"
          title={user?.email ?? undefined}
          data-testid="text-landing-user-email"
        >
          {user?.email ?? user?.displayName ?? user?.username ?? "Account"}
        </span>
        <button
          onClick={() => void logout()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-secondary transition-colors"
          data-testid="button-landing-sign-out"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <a
      href={loginUrl}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-secondary transition-colors"
      data-testid="button-landing-sign-in"
    >
      <LogIn className="w-4 h-4" />
      Sign in with Google
    </a>
  );
}

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
    body: "Homework, a unit test, and a final — each with written feedback.",
  },
  {
    icon: ShieldCheck,
    title: "Built-In Integrity",
    body: "Every submission is screened for AI authorship, with a clear verdict.",
  },
  {
    icon: BarChart3,
    title: "One Unit, 8 Topics",
    body: "From why AI is really math all the way to how it teaches itself.",
  },
];

const topics = [
  { n: "1.1", title: "Why AI is really math (the idea behind the machine)" },
  { n: "1.2", title: "Numbers as meaning: vectors and embeddings" },
  { n: "1.3", title: "Measuring likeness: the dot product and distance" },
  { n: "1.4", title: "Matrices: how a network moves information" },
  { n: "1.5", title: "Slopes and gradients: which way is better?" },
  { n: "1.6", title: "Gradient descent: learning by rolling downhill" },
  { n: "1.7", title: "Probability: how AI handles uncertainty and guesses" },
  { n: "1.8", title: "Backpropagation: how the whole thing teaches itself (Capstone)" },
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
  const { authenticated, isLoading } = useAuth();

  if (!isLoading && !authenticated) {
    return (
      <a href={loginUrl} className={className} data-testid={testId}>
        {label}
      </a>
    );
  }

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
            Basic AI Math
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LandingAuthControls />
          <CourseEntryButton
            label="Enter the course"
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            testId="button-enter-course"
          />
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-6">
            <BarChart3 className="w-3.5 h-3.5" />
            A focused, one-unit course on the mathematics behind AI
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary leading-tight mb-5">
            AI isn't magic — it's mathematics. Learn how it really works.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A rigorous, self-paced course that teaches, tutors, drills, and grades
            you on the mathematics behind modern AI — eight topics from vectors to
            backpropagation, each built up from first principles for newcomers to
            the discipline.
          </p>
          <div className="flex items-center justify-center gap-3">
            <CourseEntryButton
              label="Start the course"
              className="inline-flex items-center px-6 py-3 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              testId="button-cta-start"
            />
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
          <h2 className="text-center font-serif font-semibold text-xl mb-6">
            The Curriculum
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topics.map((t) => (
              <div
                key={t.n}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-5"
              >
                <div className="w-10 h-10 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-sm">
                  {t.n}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Topic {t.n}
                  </div>
                  <div className="font-medium">{t.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        Basic AI Math — where the curriculum, the tutor, the grader, and the
        integrity check all live in one room.
      </footer>
    </div>
  );
}
