import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { 
  useGetAssignment, 
  useStartAssignmentAttempt, 
  useGetAttempt, 
  useSaveAnswer, 
  useSubmitAttempt,
  getGetAssignmentQueryKey,
  AttemptResult,
  KeystrokeTrace,
  AnswerSaved
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { isAdminMode } from "@/lib/adminMode";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function AssignmentRunner() {
  const params = useParams();
  const assignmentId = Number(params.id);
  
  const { data: assignment, isLoading: isLoadingAssignment, error: assignmentError, refetch: refetchAssignment } = useGetAssignment(assignmentId, { query: { queryKey: getGetAssignmentQueryKey(assignmentId), retry: false } });
  const startAttempt = useStartAssignmentAttempt();
  const submitAttempt = useSubmitAttempt();
  
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const { data: attempt } = useGetAttempt(attemptId || 0, {
    query: { enabled: !!attemptId, queryKey: ['attempt', attemptId] }
  });
  
  const saveAnswer = useSaveAnswer();

  const [currentProblemIdx, setCurrentProblemIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const answersRef = useRef<Record<number, string>>({});
  const tracesRef = useRef<Record<number, KeystrokeTrace>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [gradedCurrent, setGradedCurrent] = useState<AnswerSaved | null>(null);

  const emptyTrace = (): KeystrokeTrace => ({
    keystrokeCount: 0,
    eraseCount: 0,
    bulkInsertCount: 0,
    longestBulkInsertChars: 0,
    rewriteSegments: 0,
    durationMs: 0,
  });

  const errorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
  };

  useEffect(() => {
    if (assignmentId && !attemptId && !startAttempt.isPending && !result) {
      startAttempt.mutate({ assignmentId }, {
        onSuccess: (data) => {
          setAttemptId(data.id);
          const initialAnswers: Record<number, string> = {};
          data.answers.forEach(a => {
            const localKey = `qr_course_attempt_${data.id}_prob_${a.problemId}`;
            const localVal = localStorage.getItem(localKey);
            let finalVal = a.answer;
            if (localVal && localVal.length > a.persistedLength) {
              finalVal = localVal;
            }
            initialAnswers[a.problemId] = finalVal;
            answersRef.current[a.problemId] = finalVal;
            tracesRef.current[a.problemId] = {
              ...emptyTrace(),
              keystrokeCount: a.keystrokeCount ?? 0,
              eraseCount: a.eraseCount ?? 0,
            };
          });
          setAnswers(initialAnswers);
        }
      });
    }
  }, [assignmentId, attemptId, startAttempt, result]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveMutateRef = useRef(saveAnswer.mutateAsync);
  saveMutateRef.current = saveAnswer.mutateAsync;

  const performSave = async (problemId: number, gradeNow: boolean = false) => {
    if (!attemptId) return null;
    try {
      setSaveStatus("saving");
      const answer = answersRef.current[problemId] ?? "";
      const trace = tracesRef.current[problemId] ?? emptyTrace();

      const res = await saveMutateRef.current({
        attemptId,
        data: {
          problemId,
          answer,
          trace,
          gradeNow,
        },
      });

      if (res.persistedLength < answer.length && !gradeNow) {
         setSaveStatus("error");
         setActionError("Save incomplete on server.");
      } else {
         setSaveStatus("saved");
         setActionError(null);
      }
      return res;
    } catch (error) {
      setSaveStatus("error");
      setActionError(`Your answer could not be saved: ${errorMessage(error)} (You can still retry grading)`);
      return null;
    }
  };

  const handleAnswerChange = (problemId: number, val: string, trace: KeystrokeTrace) => {
    answersRef.current[problemId] = val;
    tracesRef.current[problemId] = trace;
    setAnswers(prev => ({ ...prev, [problemId]: val }));
    setActionError(null);
    setSaveStatus("saving");

    if (attemptId) {
      localStorage.setItem(`qr_course_attempt_${attemptId}_prob_${problemId}`, val);
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      performSave(problemId, false);
    }, 800);
  };

  const handleNextOrGrade = async (nextIndex: number) => {
    const currentProblem = assignment?.problems[currentProblemIdx];
    if (!currentProblem) return;

    if (!gradedCurrent) {
      // Grade it first
      const res = await performSave(currentProblem.id, true);
      if (res && res.percentage !== undefined) {
        setGradedCurrent(res);
      }
    } else {
      // Already graded, just proceed
      setGradedCurrent(null);
      setSaveStatus(null);
      setCurrentProblemIdx(nextIndex);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId || !assignment) return;
    const currentProblem = assignment.problems[currentProblemIdx];
    if (!gradedCurrent && currentProblem) {
       await performSave(currentProblem.id, true);
    }
    setActionError(null);
    const finalAnswers = assignment.problems.map((problem) => ({
      problemId: problem.id,
      answer: answersRef.current[problem.id] ?? "",
      trace: tracesRef.current[problem.id] ?? emptyTrace(),
    }));
    try {
      const data = await submitAttempt.mutateAsync({
        attemptId,
        data: {
          answers: finalAnswers,
          skipDetection: isAdminMode(),
        },
      });
      setResult(data);
    } catch (error) {
      setActionError(
        `Your complete assignment could not be submitted: ${errorMessage(error)}`,
      );
    }
  };

  if (assignmentError) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-4 text-center">
          <h2 className="text-xl font-bold text-destructive">Failed to load assignment</h2>
          <p className="text-muted-foreground">{errorMessage(assignmentError)}</p>
          <Button onClick={() => refetchAssignment()} variant="outline" className="mx-auto mt-4">
            Retry Loading
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoadingAssignment || !assignment) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (assignment.problems.length === 0) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full text-center">
          <h2 className="text-xl font-bold">This assignment has no problems yet.</h2>
          <Link href="/assignments">
            <Button variant="outline" className="mt-4">Back to Assignments</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (result) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary mb-2">{assignment.title} - Results</h1>
              <p className="text-muted-foreground">Score: {result.percent}% ({result.score}/{result.total})</p>
            </div>
            <Link href={`/assignments`}>
              <Button variant="outline">Back to Assignments</Button>
            </Link>
          </div>
          
          <div className="flex flex-col gap-6">
            {result.perProblem.map((pr, idx) => (
              <div key={pr.problemId} className={`p-6 rounded-lg border ${pr.correct ? 'border-emerald-300 bg-emerald-50/40' : 'border-destructive/50 bg-destructive/5'}`}>
                <h3 className="font-medium mb-2">Problem {idx + 1}</h3>
                <div className="mb-4">
                  <span className="text-sm font-semibold">Your Answer:</span>
                  <div className="font-mono mt-1 whitespace-pre-wrap break-words">
                    {pr.userAnswer || "No answer"}
                  </div>
                </div>
                {!pr.correct && pr.correctAnswer && (
                  <div className="mb-4 text-primary">
                    <span className="text-sm font-semibold">Correct Answer:</span>
                    <div className="font-mono mt-1">{pr.correctAnswer}</div>
                  </div>
                )}
                <div>
                  <span className="text-sm font-semibold">Explanation:</span>
                  <div className="mt-1 text-sm"><MarkdownRenderer content={pr.explanation} /></div>
                </div>
                
                {/* AI Flags */}
                {result.detection.find(d => d.problemId === pr.problemId)?.aiFlagged && (
                  <div className="mt-4 p-3 bg-secondary rounded-md text-sm border border-secondary-border">
                    <strong className="text-chart-4">Flagged content accepted — no penalty during initial phase.</strong>
                    <p className="text-muted-foreground mt-1">{result.detection.find(d => d.problemId === pr.problemId)?.rationale}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const currentProblem = assignment.problems[currentProblemIdx];

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-6 pb-24">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">{assignment.title}</h1>
            <p className="text-sm text-muted-foreground">Problem {currentProblemIdx + 1} of {assignment.problems.length}</p>
          </div>
          {attempt?.deadlineAt && (
            <div className="text-destructive font-mono font-bold px-3 py-1 rounded bg-destructive/10 border border-destructive/20">
              Deadline: {new Date(attempt.deadlineAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-chart-2/40 bg-chart-2/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-foreground">
            <strong>This is the graded {assignment.kind} — the tutor is off and your work is scored.</strong>{" "}
            Want to warm up first? Run an unlimited practice version that gives
            feedback and keeps the tutor with you.
          </div>
          <Link href={`/assignments/${assignmentId}/practice`}>
            <Button variant="outline" className="shrink-0">
              Practice this first
            </Button>
          </Link>
        </div>

        {currentProblem ? (
          <div className="flex flex-col gap-8">
            <div className="prose prose-slate dark:prose-invert max-w-none text-lg">
              <MarkdownRenderer content={currentProblem.prompt} />
            </div>
            
            <div className="flex flex-col gap-4">
              {currentProblem.type === 'multiple_choice' && currentProblem.options ? (
                <RadioGroup
                  value={answers[currentProblem.id] || ""}
                  onValueChange={(val) => handleAnswerChange(currentProblem.id, val, emptyTrace())}
                  disabled={!!gradedCurrent}
                  className="flex flex-col gap-3"
                >
                  {currentProblem.options.map((opt, i) => (
                    <div key={i} className="flex items-center space-x-2 border p-3 rounded hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value={opt} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <AnswerInput
                  draftKey={`assignment-${assignmentId}-problem-${currentProblem.id}`}
                  key={currentProblem.id}
                  value={answers[currentProblem.id] || ""}
                  onChange={(val, trace) => handleAnswerChange(currentProblem.id, val, trace)}
                  initialTrace={tracesRef.current[currentProblem.id]}
                  disabled={!!gradedCurrent}
                />
              )}

              <div className="flex justify-between items-center text-sm font-medium">
                {saveStatus === "saving" && <span className="text-muted-foreground">Saving...</span>}
                {saveStatus === "saved" && <span className="text-emerald-600">Saved full answer</span>}
                {saveStatus === "error" && <span className="text-destructive">Save failed</span>}
              </div>
            </div>

            {gradedCurrent && (
              <div className={`p-4 rounded border ${gradedCurrent.correct ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                <div className={`font-bold mb-2 ${gradedCurrent.correct ? "text-emerald-700" : "text-red-700"}`}>
                  {gradedCurrent.correct ? "Correct!" : "Not quite"} - {gradedCurrent.percentage}%
                </div>
                <div className="text-sm prose prose-sm max-w-none">
                  <MarkdownRenderer content={gradedCurrent.feedback || "No feedback provided."} />
                </div>
              </div>
            )}

            {actionError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {actionError}
              </div>
            )}

            <div className="flex justify-between mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setGradedCurrent(null);
                  setCurrentProblemIdx(Math.max(0, currentProblemIdx - 1));
                }}
                disabled={currentProblemIdx === 0 || saveAnswer.isPending || submitAttempt.isPending}
              >
                Previous
              </Button>
              
              {currentProblemIdx < assignment.problems.length - 1 ? (
                <Button 
                  onClick={() => handleNextOrGrade(Math.min(assignment.problems.length - 1, currentProblemIdx + 1))}
                  disabled={saveAnswer.isPending || submitAttempt.isPending}
                >
                  {saveAnswer.isPending ? "Grading..." : gradedCurrent ? "Continue" : "Grade & Continue"}
                </Button>
              ) : (
                <Button 
                  onClick={() => handleSubmit()}
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={saveAnswer.isPending || submitAttempt.isPending}
                >
                  {submitAttempt.isPending || saveAnswer.isPending ? "Submitting..." : gradedCurrent ? "Submit Assignment" : "Grade & Submit Assignment"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>Problem not found.</div>
        )}
      </div>
    </Layout>
  );
}
