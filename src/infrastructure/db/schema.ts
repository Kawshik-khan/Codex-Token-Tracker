import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    projectPath: text("project_path").notNull(),
    projectName: text("project_name").notNull()
  },
  (table) => ({
    projectIdx: index("sessions_project_idx").on(table.projectName),
    startedIdx: index("sessions_started_idx").on(table.startedAt)
  })
);

export const requests = sqliteTable(
  "requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
    model: text("model").notNull(),
    projectPath: text("project_path").notNull(),
    projectName: text("project_name").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cachedTokens: integer("cached_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    cost: real("cost").notNull()
  },
  (table) => ({
    sessionIdx: index("requests_session_idx").on(table.sessionId),
    timestampIdx: index("requests_timestamp_idx").on(table.timestamp),
    projectTimestampIdx: index("requests_project_timestamp_idx").on(table.projectName, table.timestamp),
    modelIdx: index("requests_model_idx").on(table.model)
  })
);

export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  monthlyLimit: integer("monthly_limit").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});
