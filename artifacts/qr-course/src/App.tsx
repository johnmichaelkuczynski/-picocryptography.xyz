import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Search, LogIn } from "lucide-react";
import { loginUrl } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Assignments from "@/pages/Assignments";
import Analytics from "@/pages/Analytics";
import WeekView from "@/pages/WeekView";
import LectureView from "@/pages/LectureView";
import AssignmentRunner from "@/pages/AssignmentRunner";
import PracticeAssignment from "@/pages/PracticeAssignment";
import Diagnostics from "@/pages/Diagnostics";
import TopicPractice from "@/pages/TopicPractice";
import Reasoning from "@/pages/Reasoning";
import ReasoningRunner from "@/pages/ReasoningRunner";
import Grades from "@/pages/Grades";
import AdminMode from "@/pages/AdminMode";
import Administrative from "@/pages/Administrative";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/assignments/:id/practice" component={PracticeAssignment} />
      <Route path="/assignments/:id" component={AssignmentRunner} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/reasoning" component={Reasoning} />
      <Route path="/reasoning/:id" component={ReasoningRunner} />
      <Route path="/grades" component={Grades} />
      <Route path="/admin" component={AdminMode} />
      <Route path="/administrative" component={Administrative} />
      <Route path="/diagnostics" component={Diagnostics} />
      <Route path="/weeks/:weekNumber" component={WeekView} />
      <Route path="/lectures/:lectureId" component={LectureView} />
      <Route path="/practice/topic/:topicId" component={TopicPractice} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Shown when the server says the anonymous free preview is used up
// (401 login_required from an AI-metered endpoint).
function LoginRequiredModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("bam:login-required", handler);
    return () => window.removeEventListener("bam:login-required", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
      <div className="bg-background text-foreground rounded-lg border border-border max-w-md w-full p-8 flex flex-col items-center text-center shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Search className="w-5 h-5" />
          </div>
          <span className="font-serif font-semibold text-xl tracking-tight">
            Basic AI Math
          </span>
        </div>
        <h1 className="text-lg font-serif font-bold mb-2">
          Your free preview is used up
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          You've generated the free allotment of AI tutoring and grading. Sign
          in with Google — it's free — to keep using the course.
        </p>
        <a
          href={loginUrl}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          data-testid="button-gate-sign-in"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </a>
        <button
          onClick={() => setOpen(false)}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          data-testid="button-gate-dismiss"
        >
          Keep browsing the lectures
        </button>
      </div>
    </div>
  );
}

// Ping the server once per page load so anonymous unique visitors are
// counted (a long-lived cookie set by the server identifies the browser).
if (typeof window !== "undefined") {
  fetch(`${basePath}/api/track`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <LoginRequiredModal />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
