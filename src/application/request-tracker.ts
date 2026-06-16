import { calculateCost, loadPricingRegistry } from "../domain/pricing.js";
import type { TrackedRequest } from "../domain/types.js";
import { detectProjectName, detectProjectPath } from "../infrastructure/config.js";
import type { RequestRepository } from "../infrastructure/repositories/request-repository.js";
import type { SessionManager } from "./session-manager.js";
import { extractUsage, parseJsonLine } from "./usage-extractor.js";

export class RequestTracker {
  constructor(
    private readonly sessions: SessionManager,
    private readonly requests: RequestRepository
  ) {}

  async trackEvent(event: unknown, projectPath = detectProjectPath()): Promise<TrackedRequest | null> {
    const usage = extractUsage(event);
    if (!usage) {
      return null;
    }

    const session = await this.sessions.getOrCreate(projectPath);
    const request: TrackedRequest = {
      ...usage,
      sessionId: session.id,
      projectPath,
      projectName: detectProjectName(projectPath),
      cost: calculateCost(
        usage.model,
        usage.inputTokens,
        usage.outputTokens,
        usage.cachedTokens,
        loadPricingRegistry()
      ),
      raw: event
    };

    await this.requests.create(request);
    return request;
  }

  async trackJsonLine(line: string, projectPath = detectProjectPath()): Promise<TrackedRequest | null> {
    const event = parseJsonLine(line);
    return event ? this.trackEvent(event, projectPath) : null;
  }
}
