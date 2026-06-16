import { randomUUID } from "node:crypto";
import type { Session } from "../domain/types.js";
import { detectProjectName, detectProjectPath } from "../infrastructure/config.js";
import type { SessionRepository } from "../infrastructure/repositories/session-repository.js";

export class SessionManager {
  constructor(private readonly sessions: SessionRepository) {}

  async getOrCreate(projectPath = detectProjectPath()): Promise<Session> {
    const active = await this.sessions.getActive(projectPath);
    if (active) {
      return active;
    }

    const session: Session = {
      id: randomUUID(),
      startedAt: new Date(),
      endedAt: null,
      projectPath,
      projectName: detectProjectName(projectPath)
    };
    await this.sessions.create(session);
    return session;
  }

  async latest(): Promise<Session | null> {
    return this.sessions.getLatest();
  }

  async end(sessionId: string): Promise<void> {
    await this.sessions.end(sessionId);
  }
}
