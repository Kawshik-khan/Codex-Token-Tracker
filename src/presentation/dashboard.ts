import type { AnalyticsService } from "../application/analytics-service.js";
import { budgetBlock, compactSummaryLine, formatCost, formatNumber } from "./format.js";

export async function dashboardBlock(analytics: AnalyticsService): Promise<string> {
  const [today, week, month, session, budget, projects] = await Promise.all([
    analytics.today(),
    analytics.week(),
    analytics.month(),
    analytics.currentSession(),
    analytics.budgetStatus(),
    analytics.projects()
  ]);

  const lines = [
    "TokenTrack Summary",
    "==================",
    "",
    compactSummaryLine("Today", today),
    compactSummaryLine("This week", week),
    compactSummaryLine("This month", month),
    compactSummaryLine("Session", session),
    ""
  ];

  if (budget) {
    lines.push(budgetBlock(budget), "");
  }

  const topProjects = projects.slice(0, 5);
  if (topProjects.length > 0) {
    lines.push("Top Projects", "------------");
    for (const project of topProjects) {
      lines.push(
        [
          project.projectName.slice(0, 24).padEnd(24),
          `${formatNumber(project.totalTokens).padStart(10)} tokens`,
          `${formatNumber(project.requests).padStart(8)} requests`,
          `${formatCost(project.cost).padStart(9)}`
        ].join("  ")
      );
    }
  } else {
    lines.push("Top Projects", "------------", "No tracked Codex usage yet.");
  }

  lines.push("", "Commands: codex stats | codex monitor | codex export json | codex budget status");
  return lines.join("\n");
}
