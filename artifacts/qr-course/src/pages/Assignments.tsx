import React from "react";
import { useListAssignments, getListAssignmentsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Assignments() {
  const { data: assignments, isLoading, error, refetch } = useListAssignments({ query: { queryKey: getListAssignmentsQueryKey(), retry: false } });

  // Group by week
  const grouped = assignments?.reduce((acc, a) => {
    if (!acc[a.weekNumber]) acc[a.weekNumber] = [];
    acc[a.weekNumber].push(a);
    return acc;
  }, {} as Record<number, typeof assignments>);

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Assignments</h1>
          <p className="text-muted-foreground">Complete your homework, tests, midterm, and final exams.</p>
        </div>

        {error ? (
          <div className="flex flex-col gap-4 text-center items-center py-10 bg-destructive/5 rounded-lg border border-destructive/20">
            <h2 className="text-xl font-bold text-destructive">Failed to load assignments</h2>
            <p className="text-muted-foreground text-sm max-w-md">There was a problem loading your assignments. Please try again.</p>
            <Button onClick={() => refetch()} variant="outline">
              Retry Loading
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !assignments || assignments.length === 0 ? (
           <div className="flex flex-col gap-4 text-center items-center py-10 bg-secondary/20 rounded-lg border">
             <h2 className="text-xl font-bold">No assignments available</h2>
             <p className="text-muted-foreground text-sm max-w-md">There are currently no assignments for this course.</p>
           </div>
        ) : (
          <div className="flex flex-col gap-10">
            {Object.entries(grouped || {}).map(([week, items]) => (
              <div key={week} className="flex flex-col gap-4">
                <h2 className="text-2xl font-serif font-semibold border-b pb-2">Hour {week}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <Card key={item.id} className="flex flex-col justify-between">
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {item.kind}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.status === 'submitted' ? 'bg-primary/10 text-primary' :
                            item.status === 'in_progress' ? 'bg-chart-4/20 text-chart-4' :
                            'bg-secondary text-secondary-foreground'
                          }`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="text-sm text-muted-foreground flex gap-4">
                          <span>{item.problemCount} problems</span>
                          {item.isTimed && <span>{item.timeLimitMinutes} min timed</span>}
                          {item.bestScore !== undefined && item.bestScore !== null && (
                            <span className="font-semibold text-foreground">Score: {item.bestScore}%</span>
                          )}
                        </div>
                        <Link href={`/assignments/${item.id}/practice`}>
                          <Button className="w-full bg-chart-2 hover:bg-chart-2/90 text-white">
                            Practice first — unlimited & never graded
                          </Button>
                        </Link>
                        <Link href={`/assignments/${item.id}`}>
                          <Button className="w-full" variant={item.status === 'submitted' ? "outline" : "default"}>
                            {item.status === 'submitted' ? 'Review Results' :
                             item.status === 'in_progress' ? 'Resume' : 'Take the graded version'}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
