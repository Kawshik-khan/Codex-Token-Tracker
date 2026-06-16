import { desc, eq, isNull } from "drizzle-orm";
import { sessions } from "../db/schema.js";
import type { DbClient } from "../db/client.js";
import type { Session } from "../../domain/types.js";

export class SessionRepository {
  constructor(private readonly db: DbClient) {}

  async create(session: Session): Promise<void> {
    await this.db.insert(sessions).values({
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? null,
      projectPath: session.projectPath,
      projectName: session.projectName
    });
  }

  async getActive(projectPath: string): Promise<Session | null> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(isNull(sessions.endedAt))
      .orderBy(desc(sessions.startedAt))
      .limit(5);
    const row = rows.find((item) => item.projectPath === projectPath);
    return row ? mapSession(row) : null;
  }

  async getLatest(): Promise<Session | null> {
    const [row] = await this.db.select().from(sessions).orderBy(desc(sessions.startedAt)).limit(1);
    return row ? mapSession(row) : null;
  }

  async end(id: string, endedAt = new Date()): Promise<void> {
    await this.db.update(sessions).set({ endedAt }).where(eq(sessions.id, id));
  }
}

function mapSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    projectPath: row.projectPath,
    projectName: row.projectName
  };
}
