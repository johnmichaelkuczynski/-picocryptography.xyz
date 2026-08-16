import React, { useState, useEffect } from "react";
import { 
  useGetAnalyticsSummary, 
  useGetTopicAnalytics, 
  useGetRecentActivity,
  useGenerateReport
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";

export default function Analytics() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAnalyticsSummary();
  const { data: topics, isLoading: isLoadingTopics } = useGetTopicAnalytics();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();
  const generateReport = useGenerateReport();
  const [, setLocation] = useLocation();

  const [report, setReport] = useState<any>(null);

  const handleGenerateReport = () => {
    generateReport.mutate(undefined, {
      onSuccess: (data) => setReport(data)
    });
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-8 pb-24">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">Analytics</h1>
            <p className="text-muted-foreground">Track your progress and identify areas for improvement.</p>
          </div>
          <Button onClick={handleGenerateReport} disabled={generateReport.isPending}>
            {generateReport.isPending ? "Generating..." : "Generate Narrative Report"}
          </Button>
        </div>

        {report && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle>AI Performance Report</CardTitle>
              <div className="text-xs text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleString()}</div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>
                <MarkdownRenderer content={report.narrative} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-chart-2 mb-2">Strengths</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {report.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-destructive mb-2">Areas for Improvement</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {report.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Course Average" value={summary?.officialAverage ? `${summary.officialAverage}%` : '-'} loading={isLoadingSummary} />
          <StatCard title="Practice Accuracy" value={summary?.practiceAccuracy ? `${summary.practiceAccuracy}%` : '-'} loading={isLoadingSummary} />
          <StatCard title="Assignments" value={summary?.attemptsCount} loading={isLoadingSummary} />
          <StatCard title="Practice Count" value={summary?.practiceCount} loading={isLoadingSummary} />
          <StatCard title="Streak (Days)" value={summary?.streakDays} loading={isLoadingSummary} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex flex-col gap-4">
            <h2 className="text-xl font-serif font-semibold">Topic Mastery</h2>
            <Card>
              <CardContent className="p-0">
                {isLoadingTopics ? <Skeleton className="h-64 w-full" /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 text-muted-foreground text-left">
                        <tr>
                          <th className="p-3 font-medium">Topic</th>
                          <th className="p-3 font-medium">Day</th>
                          <th className="p-3 font-medium text-right">Attempts</th>
                          <th className="p-3 font-medium text-right">Accuracy</th>
                          <th className="p-3 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {topics?.map(topic => (
                          <tr
                            key={topic.topicId}
                            onClick={() => setLocation(`/practice/topic/${topic.topicId}`)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                            title={`Practice "${topic.topicTitle}" at a difficulty matched to your performance`}
                            data-testid={`row-topic-${topic.topicId}`}
                          >
                            <td className="p-3 font-medium">
                              <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                                <span>{topic.topicTitle}</span>
                                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">Day {topic.weekNumber}</td>
                            <td className="p-3 text-right">{topic.attempts}</td>
                            <td className="p-3 text-right font-mono">{topic.accuracy}%</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider
                                ${topic.strengthLabel === 'strong' ? 'bg-chart-2/20 text-chart-2' :
                                  topic.strengthLabel === 'weak' ? 'bg-destructive/20 text-destructive' :
                                  topic.strengthLabel === 'developing' ? 'bg-chart-4/20 text-chart-4' :
                                  'bg-secondary text-secondary-foreground'
                                }`}>
                                {topic.strengthLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-serif font-semibold">Recent Activity Timeline</h2>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {isLoadingActivity ? <Skeleton className="h-64 w-full" /> : 
                 activity?.length === 0 ? <div className="p-6 text-center text-muted-foreground">No activity yet.</div> :
                 activity?.map(item => (
                  <div key={item.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{item.title}</div>
                      {item.score !== undefined && item.score !== null && (
                        <div className="font-mono text-sm font-bold bg-secondary px-2 py-0.5 rounded">{item.score}%</div>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="uppercase tracking-wider font-semibold">{item.kind}</span>
                      <span>{new Date(item.at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, loading }: { title: string, value: React.ReactNode, loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col justify-center items-center text-center h-24">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">{title}</div>
        {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-serif font-bold text-primary">{value}</div>}
      </CardContent>
    </Card>
  );
}
