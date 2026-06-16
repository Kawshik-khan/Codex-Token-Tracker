import type { BudgetStatus, TrendPoint, UsageSummary } from "../domain/types.js";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function summaryBlock(title: string, summary: UsageSummary): string {
  return [
    title,
    "────────────",
    "",
    `Tokens:   ${formatNumber(summary.totalTokens)}`,
    `Input:    ${formatNumber(summary.inputTokens)}`,
    `Output:   ${formatNumber(summary.outputTokens)}`,
    `Cached:   ${formatNumber(summary.cachedTokens)}`,
    `Cost:     ${formatCost(summary.cost)}`,
    `Requests: ${formatNumber(summary.requests)}`,
    `Sessions: ${formatNumber(summary.sessions)}`,
    `Projects: ${formatNumber(summary.projects)}`
  ].join("\n");
}

export function budgetBlock(status: BudgetStatus): string {
  const alert = status.alertLevel ? `\nAlert: ${status.alertLevel}% budget reached` : "";
  return [
    "Monthly Budget",
    "──────────────",
    "",
    `${formatNumber(status.monthlyLimit)} tokens`,
    "",
    `Used:      ${formatNumber(status.used)}`,
    `Remaining: ${formatNumber(status.remaining)}`,
    `Percent:   ${status.percentUsed.toFixed(1)}%${alert}`
  ].join("\n");
}

export function chart(points: TrendPoint[], width = 24): string {
  const max = Math.max(...points.map((point) => point.totalTokens), 1);
  return points
    .map((point) => {
      const size = Math.max(point.totalTokens === 0 ? 0 : 1, Math.round((point.totalTokens / max) * width));
      return `${point.label.padEnd(10)} ${"█".repeat(size)} ${formatNumber(point.totalTokens)}`;
    })
    .join("\n");
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return "";
  }

  const keys = Object.keys(rows[0]);
  const lines = [keys.join(",")];
  for (const row of rows) {
    lines.push(keys.map((key) => csvCell(row[key])).join(","));
  }
  return lines.join("\n");
}

function csvCell(value: unknown): string {
  const rendered = value instanceof Date ? value.toISOString() : String(value ?? "");
  return /[",\n]/.test(rendered) ? `"${rendered.replaceAll('"', '""')}"` : rendered;
}
