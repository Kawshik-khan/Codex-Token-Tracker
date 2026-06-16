import type { BudgetStatus, TrendPoint, UsageSummary } from "../domain/types.js";
import type { BudgetRepository } from "../infrastructure/repositories/budget-repository.js";
import type { RequestRepository } from "../infrastructure/repositories/request-repository.js";
import type { SessionManager } from "./session-manager.js";
import { endOfDay, startOfMonth, startOfToday, startOfWeek } from "./dates.js";

export class AnalyticsService {
  constructor(
    private readonly requests: RequestRepository,
    private readonly budgets: BudgetRepository,
    private readonly sessions: SessionManager
  ) {}

  all(): Promise<UsageSummary> {
    return this.requests.summarize();
  }

  today(now = new Date()): Promise<UsageSummary> {
    return this.requests.summarize({ from: startOfToday(now), to: endOfDay(now) });
  }

  week(now = new Date()): Promise<UsageSummary> {
    return this.requests.summarize({ from: startOfWeek(now), to: now });
  }

  month(now = new Date()): Promise<UsageSummary> {
    return this.requests.summarize({ from: startOfMonth(now), to: now });
  }

  async currentSession(): Promise<UsageSummary> {
    const session = await this.sessions.latest();
    if (!session) {
      return emptySummary();
    }
    return this.requests.summarize({ sessionId: session.id });
  }

  project(projectName: string): Promise<UsageSummary> {
    return this.requests.summarize({ projectName });
  }

  projects() {
    return this.requests.projects();
  }

  weeklyTrend(now = new Date()): Promise<TrendPoint[]> {
    return this.requests.trendByDay(startOfWeek(now), now);
  }

  monthlyTrend(now = new Date()): Promise<TrendPoint[]> {
    return this.requests.trendByDay(startOfMonth(now), now);
  }

  async setBudget(monthlyLimit: number): Promise<BudgetStatus> {
    await this.budgets.setMonthlyLimit(monthlyLimit);
    const status = await this.budgetStatus();
    if (!status) {
      throw new Error("Failed to load budget after saving it");
    }
    return status;
  }

  async budgetStatus(now = new Date()): Promise<BudgetStatus | null> {
    const monthlyLimit = await this.budgets.getMonthlyLimit();
    if (!monthlyLimit) {
      return null;
    }
    const used = (await this.month(now)).totalTokens;
    const remaining = Math.max(monthlyLimit - used, 0);
    const percentUsed = monthlyLimit === 0 ? 100 : (used / monthlyLimit) * 100;
    const alertLevel = percentUsed >= 100 ? 100 : percentUsed >= 90 ? 90 : percentUsed >= 80 ? 80 : null;

    return { monthlyLimit, used, remaining, percentUsed, alertLevel };
  }
}

function emptySummary(): UsageSummary {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    cost: 0,
    requests: 0,
    sessions: 0,
    projects: 0
  };
}
