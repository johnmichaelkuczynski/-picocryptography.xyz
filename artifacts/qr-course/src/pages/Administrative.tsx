import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useAuth, loginUrl } from "@/lib/auth";
import { LogIn, ShieldAlert, Users, CalendarDays, CalendarRange, CalendarClock, Infinity as InfinityIcon, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface VisitRow {
  id: number;
  email: string | null;
  visitedAt: string;
}

interface SeriesPoint {
  label: string;
  count: number;
}

interface VisitsResponse {
  stats: {
    allTime: number;
    last24Hours: number;
    lastMonth: number;
    lastYear: number;
  };
  uniqueVisitors?: {
    allTime: number;
    last24Hours: number;
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
  };
  series: {
    last24Hours: SeriesPoint[];
    lastMonth: SeriesPoint[];
    lastYear: SeriesPoint[];
    allTime: SeriesPoint[];
  };
  visits: VisitRow[];
}

function useAdminVisits(enabled: boolean) {
  return useQuery<{ status: number; data: VisitsResponse | null }>({
    queryKey: ["admin", "visits"],
    enabled,
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/admin/visits`, {
        credentials: "include",
      });
      if (res.status === 403 || res.status === 401) {
        return { status: res.status, data: null };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, data: (await res.json()) as VisitsResponse };
    },
    refetchInterval: 60_000,
  });
}

// The server reports day / month / year / all-time. The weekly window is
// derived client-side from the recent-login list (most recent 500 events).
function buildWeekSeries(visits: VisitRow[]): {
  count: number;
  series: SeriesPoint[];
} {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const start = now - 7 * DAY;
  const counts = new Array(7).fill(0);
  let count = 0;
  for (const v of visits) {
    const t = new Date(v.visitedAt).getTime();
    if (t >= start) {
      count++;
      const idx = Math.min(Math.floor((t - start) / DAY), 6);
      counts[idx]++;
    }
  }
  const series = counts.map((c, i) => ({
    label: new Date(start + i * DAY).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: c,
  }));
  return { count, series };
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div
        className="text-3xl font-serif font-bold"
        data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        {value}
      </div>
    </div>
  );
}

function LoginChart({
  title,
  data,
}: {
  title: string;
  data: SeriesPoint[];
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [String(value), "Logins"]}
              labelStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" fill="hsl(222, 47%, 30%)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Administrative() {
  const { authenticated, user, isLoading: authLoading } = useAuth();
  const { data: result, isLoading: visitsLoading } = useAdminVisits(
    authenticated,
  );

  if (authLoading) {
    return (
      <Layout>
        <div className="p-8 text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  if (!authenticated) {
    return (
      <Layout>
        <div className="p-8 max-w-lg">
          <h1 className="text-2xl font-serif font-bold mb-2">Administrative</h1>
          <p className="text-muted-foreground mb-6">
            This page is available only after you sign in.
          </p>
          <a
            href={loginUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-admin-sign-in"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Google
          </a>
        </div>
      </Layout>
    );
  }

  if (result && (result.status === 403 || result.status === 401)) {
    return (
      <Layout>
        <div className="p-8 max-w-lg">
          <h1 className="text-2xl font-serif font-bold mb-2">Administrative</h1>
          <div className="flex items-start gap-3 bg-secondary border border-border rounded-lg p-4 text-sm">
            <ShieldAlert className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium mb-1">Not authorized</p>
              <p className="text-muted-foreground">
                You are signed in as {user?.email ?? "an unknown account"}, but
                this page is restricted to the site owner.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (visitsLoading || !result?.data) {
    return (
      <Layout>
        <div className="p-8 text-muted-foreground">Loading login analytics…</div>
      </Layout>
    );
  }

  const { stats, series, visits, uniqueVisitors } = result.data;
  const week = buildWeekSeries(visits);

  return (
    <Layout>
      <div className="p-8 max-w-6xl">
        <h1 className="text-3xl font-serif font-bold mb-1">Administrative</h1>
        <p className="text-muted-foreground mb-8">
          Google login activity — who signed in, when, and how often.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KpiCard label="Last Day" value={stats.last24Hours} icon={Clock} />
          <KpiCard label="Last Week" value={week.count} icon={CalendarDays} />
          <KpiCard label="Last Month" value={stats.lastMonth} icon={CalendarRange} />
          <KpiCard label="Last Year" value={stats.lastYear} icon={CalendarClock} />
          <KpiCard label="All Time" value={stats.allTime} icon={InfinityIcon} />
        </div>

        <h2 className="text-lg font-serif font-bold mb-1">Unique visitors</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Distinct browsers/devices that opened the site — signed in or not.
          Each device is counted once per time window.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KpiCard
            label="Unique Last Day"
            value={uniqueVisitors?.last24Hours ?? 0}
            icon={Clock}
          />
          <KpiCard
            label="Unique Last Week"
            value={uniqueVisitors?.lastWeek ?? 0}
            icon={CalendarDays}
          />
          <KpiCard
            label="Unique Last Month"
            value={uniqueVisitors?.lastMonth ?? 0}
            icon={CalendarRange}
          />
          <KpiCard
            label="Unique Last Year"
            value={uniqueVisitors?.lastYear ?? 0}
            icon={CalendarClock}
          />
          <KpiCard
            label="Unique All Time"
            value={uniqueVisitors?.allTime ?? 0}
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <LoginChart title="Logins — last 24 hours" data={series.last24Hours} />
          <LoginChart title="Logins — last 7 days" data={week.series} />
          <LoginChart title="Logins — last 30 days" data={series.lastMonth} />
          <LoginChart title="Logins — last 12 months" data={series.lastYear} />
          <LoginChart title="Logins — all time" data={series.allTime} />
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              Recent logins ({visits.length})
            </h2>
          </div>
          {visits.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No logins recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="px-4 py-2 font-medium">Gmail</th>
                    <th className="px-4 py-2 font-medium">Signed in</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-border last:border-0"
                      data-testid={`row-visit-${v.id}`}
                    >
                      <td className="px-4 py-2">{v.email ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(v.visitedAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
