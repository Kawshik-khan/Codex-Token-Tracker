import { and, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { requests, sessions } from "../db/schema.js";
import type { DbClient } from "../db/client.js";
import type { TrackedRequest, TrendPoint, UsageSummary } from "../../domain/types.js";

export class RequestRepository {
  constructor(private readonly db: DbClient) {}

  async create(request: TrackedRequest): Promise<void> {
    await this.db.insert(requests).values({
      sessionId: request.sessionId,
      timestamp: request.timestamp,
      model: request.model,
      projectPath: request.projectPath,
      projectName: request.projectName,
      inputTokens: request.inputTokens,
      outputTokens: request.outputTokens,
      cachedTokens: request.cachedTokens,
      totalTokens: request.totalTokens,
      cost: request.cost
    });
  }

  async summarize(range?: { from?: Date; to?: Date; projectName?: string; sessionId?: string }): Promise<UsageSummary> {
    const conditions = [
      range?.from ? gte(requests.timestamp, range.from) : undefined,
      range?.to ? lte(requests.timestamp, range.to) : undefined,
      range?.projectName ? eq(requests.projectName, range.projectName) : undefined,
      range?.sessionId ? eq(requests.sessionId, range.sessionId) : undefined
    ].filter(Boolean);

    const where = conditions.length ? and(...conditions) : undefined;
    const [row] = await this.db
      .select({
        inputTokens: sum(requests.inputTokens),
        outputTokens: sum(requests.outputTokens),
        cachedTokens: sum(requests.cachedTokens),
        totalTokens: sum(requests.totalTokens),
        cost: sum(requests.cost),
        requests: count(requests.id),
        sessions: sql<number>`count(distinct ${requests.sessionId})`,
        projects: sql<number>`count(distinct ${requests.projectName})`
      })
      .from(requests)
      .where(where);

    return {
      inputTokens: Number(row?.inputTokens ?? 0),
      outputTokens: Number(row?.outputTokens ?? 0),
      cachedTokens: Number(row?.cachedTokens ?? 0),
      totalTokens: Number(row?.totalTokens ?? 0),
      cost: Number(row?.cost ?? 0),
      requests: Number(row?.requests ?? 0),
      sessions: Number(row?.sessions ?? 0),
      projects: Number(row?.projects ?? 0)
    };
  }

  async trendByDay(from: Date, to: Date, projectName?: string): Promise<TrendPoint[]> {
    const filters = [
      gte(requests.timestamp, from),
      lte(requests.timestamp, to),
      projectName ? eq(requests.projectName, projectName) : undefined
    ].filter(Boolean);

    const rows = await this.db
      .select({
        label: sql<string>`date(${requests.timestamp} / 1000, 'unixepoch', 'localtime')`,
        totalTokens: sum(requests.totalTokens),
        cost: sum(requests.cost)
      })
      .from(requests)
      .where(and(...filters))
      .groupBy(sql`date(${requests.timestamp} / 1000, 'unixepoch', 'localtime')`)
      .orderBy(sql`date(${requests.timestamp} / 1000, 'unixepoch', 'localtime')`);

    return rows.map((row) => ({
      label: row.label,
      totalTokens: Number(row.totalTokens ?? 0),
      cost: Number(row.cost ?? 0)
    }));
  }

  async projects(): Promise<Array<{ projectName: string; totalTokens: number; cost: number; requests: number }>> {
    const rows = await this.db
      .select({
        projectName: requests.projectName,
        totalTokens: sum(requests.totalTokens),
        cost: sum(requests.cost),
        requests: count(requests.id)
      })
      .from(requests)
      .groupBy(requests.projectName)
      .orderBy(desc(sum(requests.totalTokens)));

    return rows.map((row) => ({
      projectName: row.projectName,
      totalTokens: Number(row.totalTokens ?? 0),
      cost: Number(row.cost ?? 0),
      requests: Number(row.requests ?? 0)
    }));
  }

  async exportRows(): Promise<
    Array<{
      id: number;
      sessionId: string;
      timestamp: Date;
      model: string;
      projectPath: string;
      projectName: string;
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
      totalTokens: number;
      cost: number;
      sessionStartedAt: Date | null;
    }>
  > {
    return this.db
      .select({
        id: requests.id,
        sessionId: requests.sessionId,
        timestamp: requests.timestamp,
        model: requests.model,
        projectPath: requests.projectPath,
        projectName: requests.projectName,
        inputTokens: requests.inputTokens,
        outputTokens: requests.outputTokens,
        cachedTokens: requests.cachedTokens,
        totalTokens: requests.totalTokens,
        cost: requests.cost,
        sessionStartedAt: sessions.startedAt
      })
      .from(requests)
      .leftJoin(sessions, eq(requests.sessionId, sessions.id))
      .orderBy(requests.timestamp);
  }
}
