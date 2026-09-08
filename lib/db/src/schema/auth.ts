import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  googleId: text("google_id").unique(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const visitsTable = pgTable("visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  email: text("email"),
  visitedAt: timestamp("visited_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const uniqueVisitorsTable = pgTable("unique_visitors", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id").notNull().unique(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  hits: integer("hits").notNull().default(1),
});

export const trialUsageTable = pgTable("trial_usage", {
  ownerId: text("owner_id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  activeSeconds: integer("active_seconds").notNull().default(0),
  actionsUsed: integer("actions_used").notNull().default(0),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrialUsage = typeof trialUsageTable.$inferSelect;

export const trialAccountsTable = pgTable("trial_accounts", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  secondsLimit: integer("seconds_limit").notNull(),
  actionsLimit: integer("actions_limit").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UniqueVisitor = typeof uniqueVisitorsTable.$inferSelect;

export const insertVisitSchema = createInsertSchema(visitsTable).omit({
  id: true,
  visitedAt: true,
});
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;
