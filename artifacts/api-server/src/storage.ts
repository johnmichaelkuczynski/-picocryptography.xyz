import {
  db,
  usersTable,
  visitsTable,
  uniqueVisitorsTable,
  type User,
} from "@workspace/db";
import { desc, eq, gte, sql } from "drizzle-orm";

export const storage = {
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    return user;
  },

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, googleId));
    return user;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    return user;
  },

  async createUserWithGoogle(data: {
    username: string;
    googleId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<User> {
    const [user] = await db.insert(usersTable).values(data).returning();
    return user!;
  },

  async updateUserGoogle(
    id: number,
    data: { googleId?: string; displayName?: string | null },
  ): Promise<User> {
    const [user] = await db
      .update(usersTable)
      .set(data)
      .where(eq(usersTable.id, id))
      .returning();
    return user!;
  },

  async recordVisit(userId: number, email: string | null): Promise<void> {
    await db.insert(visitsTable).values({ userId, email });
  },

  async getVisits(limit: number) {
    return db
      .select()
      .from(visitsTable)
      .orderBy(desc(visitsTable.visitedAt))
      .limit(limit);
  },

  async getVisitTimestampsSince(since: Date | null): Promise<Date[]> {
    const rows = since
      ? await db
          .select({ visitedAt: visitsTable.visitedAt })
          .from(visitsTable)
          .where(gte(visitsTable.visitedAt, since))
      : await db.select({ visitedAt: visitsTable.visitedAt }).from(visitsTable);
    return rows.map((r) => r.visitedAt);
  },

  // Idempotent provisioning so fresh databases work without a manual step
  // (drizzle push requires a TTY in this environment).
  async ensureUniqueVisitorsTable(): Promise<void> {
    await db.execute(sql`
      create table if not exists unique_visitors (
        id serial primary key,
        visitor_id text not null unique,
        first_seen_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now(),
        hits integer not null default 1
      )
    `);
  },

  // Register a brand-new visitor id (server-generated only).
  async createUniqueVisitor(visitorId: string): Promise<void> {
    await db
      .insert(uniqueVisitorsTable)
      .values({ visitorId })
      .onConflictDoNothing();
  },

  // Update an existing visitor. Never inserts, so a caller replaying
  // arbitrary cookie values cannot inflate the unique count.
  async touchUniqueVisitor(visitorId: string): Promise<boolean> {
    const rows = await db
      .update(uniqueVisitorsTable)
      .set({
        lastSeenAt: sql`now()`,
        hits: sql`${uniqueVisitorsTable.hits} + 1`,
      })
      .where(eq(uniqueVisitorsTable.visitorId, visitorId))
      .returning({ id: uniqueVisitorsTable.id });
    return rows.length > 0;
  },

  async countUniqueVisitors(): Promise<{
    allTime: number;
    last24Hours: number;
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
  }> {
    const [row] = (
      await db.execute(sql`
        select
          count(*)::int as all_time,
          count(*) filter (where last_seen_at >= now() - interval '1 day')::int as last_24_hours,
          count(*) filter (where last_seen_at >= now() - interval '7 days')::int as last_week,
          count(*) filter (where last_seen_at >= now() - interval '30 days')::int as last_month,
          count(*) filter (where last_seen_at >= now() - interval '365 days')::int as last_year
        from unique_visitors
      `)
    ).rows as Array<{
      all_time: number;
      last_24_hours: number;
      last_week: number;
      last_month: number;
      last_year: number;
    }>;
    return {
      allTime: Number(row?.all_time ?? 0),
      last24Hours: Number(row?.last_24_hours ?? 0),
      lastWeek: Number(row?.last_week ?? 0),
      lastMonth: Number(row?.last_month ?? 0),
      lastYear: Number(row?.last_year ?? 0),
    };
  },
};
