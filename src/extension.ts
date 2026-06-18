import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as vscode from "vscode";
import type { UsageSummary } from "./domain/types.js";
import { formatCost, formatNumber } from "./presentation/format.js";

type Container = Awaited<ReturnType<typeof loadContainer>>;

let container: Container | null = null;
let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel("TokenTrack");
  context.subscriptions.push(output);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("tokentrack.actions", new TokenTrackActionsProvider()));

  register(context, "tokentrack.showDashboard", () => showDashboard(context));
  register(context, "tokentrack.showToday", () => showSummary(context, "Today", "today"));
  register(context, "tokentrack.showWeek", () => showSummary(context, "Week", "week"));
  register(context, "tokentrack.showMonth", () => showSummary(context, "Month", "month"));
  register(context, "tokentrack.showSession", () => showSummary(context, "Current Session", "currentSession"));
  register(context, "tokentrack.showProjects", () => showProjects(context));
  register(context, "tokentrack.setBudget", () => setBudget(context));
  register(context, "tokentrack.exportJson", () => exportData(context, "json"));
  register(context, "tokentrack.exportCsv", () => exportData(context, "csv"));
  register(context, "tokentrack.ingestCodexLog", () => ingestCodexLog(context));
  register(context, "tokentrack.showDatabasePath", () => showDatabasePath(context));
}

export function deactivate(): void {
  container?.db.$client.close();
  container = null;
}

function register(context: vscode.ExtensionContext, command: string, callback: () => Promise<void>): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(command, async () => {
      try {
        await callback();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`${command} failed: ${message}`);
        vscode.window.showErrorMessage(`TokenTrack: ${message}`);
      }
    })
  );
}

async function getContainer(context: vscode.ExtensionContext): Promise<Container> {
  if (container) {
    return container;
  }

  const dbPath = await resolveDatabasePath(context);
  process.env.TOKENTRACK_DB_PATH = dbPath;
  await mkdir(dirname(dbPath), { recursive: true });

  container = await loadContainer();
  return container;
}

async function loadContainer() {
  const { createContainer } = await import("./application/container.js");
  return createContainer();
}

async function resolveDatabasePath(context: vscode.ExtensionContext): Promise<string> {
  const configuredPath = vscode.workspace.getConfiguration("tokentrack").get<string>("databasePath")?.trim();
  if (configuredPath) {
    return configuredPath;
  }

  const storagePath = context.globalStorageUri.fsPath;
  await mkdir(storagePath, { recursive: true });
  return join(storagePath, "tokentrack.sqlite");
}

async function showDashboard(context: vscode.ExtensionContext): Promise<void> {
  const services = await getContainer(context);
  const [today, week, month, currentSession, budget] = await Promise.all([
    services.analytics.today(),
    services.analytics.week(),
    services.analytics.month(),
    services.analytics.currentSession(),
    services.analytics.budgetStatus()
  ]);

  const body = [
    "TokenTrack Dashboard",
    "",
    renderSummary("Today", today),
    "",
    renderSummary("Week", week),
    "",
    renderSummary("Month", month),
    "",
    renderSummary("Current Session", currentSession),
    "",
    budget
      ? [
          "Budget",
          "------",
          `Monthly limit: ${formatNumber(budget.monthlyLimit)} tokens`,
          `Used:          ${formatNumber(budget.used)} tokens (${budget.percentUsed.toFixed(1)}%)`,
          `Remaining:     ${formatNumber(budget.remaining)} tokens`,
          budget.alertLevel ? `Alert:         ${budget.alertLevel}% threshold reached` : "Alert:         none"
        ].join("\n")
      : "Budget\n------\nNo monthly budget set"
  ].join("\n");

  await openDocument("TokenTrack Dashboard", body);
}

async function showSummary(
  context: vscode.ExtensionContext,
  title: string,
  method: "today" | "week" | "month" | "currentSession"
): Promise<void> {
  const services = await getContainer(context);
  await openDocument(`TokenTrack ${title}`, renderSummary(title, await services.analytics[method]()));
}

async function showProjects(context: vscode.ExtensionContext): Promise<void> {
  const services = await getContainer(context);
  const projects = await services.analytics.projects();
  const rows = projects.map((project) =>
    [
      project.projectName.padEnd(28),
      `${formatNumber(project.totalTokens)} tokens`.padStart(18),
      formatCost(project.cost).padStart(10),
      `${formatNumber(project.requests)} requests`.padStart(14)
    ].join("  ")
  );

  await openDocument("TokenTrack Projects", ["Projects", "--------", rows.length ? rows.join("\n") : "No projects tracked yet"].join("\n"));
}

async function setBudget(context: vscode.ExtensionContext): Promise<void> {
  const value = await vscode.window.showInputBox({
    title: "Set TokenTrack Monthly Budget",
    prompt: "Monthly token limit",
    validateInput(input) {
      const numeric = Number(input);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return "Enter a non-negative number.";
      }
      return null;
    }
  });

  if (value === undefined) {
    return;
  }

  const services = await getContainer(context);
  const status = await services.analytics.setBudget(Number(value));
  vscode.window.showInformationMessage(
    `TokenTrack budget set: ${formatNumber(status.monthlyLimit)} tokens, ${formatNumber(status.remaining)} remaining.`
  );
}

async function exportData(context: vscode.ExtensionContext, format: "json" | "csv"): Promise<void> {
  const services = await getContainer(context);
  const defaultUri = vscode.Uri.joinPath(context.globalStorageUri, `tokentrack-export.${format}`);
  const uri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: {
      [format.toUpperCase()]: [format]
    }
  });

  if (!uri) {
    return;
  }

  const content = format === "json" ? await services.exporter.json() : await services.exporter.csv();
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
  vscode.window.showInformationMessage(`TokenTrack export saved to ${uri.fsPath}`);
}

async function ingestCodexLog(context: vscode.ExtensionContext): Promise<void> {
  const selection = await vscode.window.showOpenDialog({
    title: "Select a Codex JSONL log",
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      "JSONL logs": ["jsonl"],
      "All files": ["*"]
    }
  });

  const uri = selection?.[0];
  if (!uri) {
    return;
  }

  const services = await getContainer(context);
  const imported = await services.ingest.codexLog(uri.fsPath, workspaceProjectPath());
  vscode.window.showInformationMessage(`TokenTrack imported ${formatNumber(imported)} request records.`);
}

async function showDatabasePath(context: vscode.ExtensionContext): Promise<void> {
  vscode.window.showInformationMessage(await resolveDatabasePath(context));
}

function renderSummary(title: string, summary: UsageSummary): string {
  return [
    title,
    "-".repeat(title.length),
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

async function openDocument(title: string, content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: "plaintext",
    content
  });
  await vscode.window.showTextDocument(document, { preview: false });
  output.appendLine(`${title} opened`);
}

function workspaceProjectPath(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

class TokenTrackActionsProvider implements vscode.TreeDataProvider<TokenTrackAction> {
  private readonly actions: TokenTrackAction[] = [
    new TokenTrackAction("Open Dashboard", "tokentrack.showDashboard", "dashboard"),
    new TokenTrackAction("Show Today", "tokentrack.showToday", "calendar"),
    new TokenTrackAction("Show Week", "tokentrack.showWeek", "graph"),
    new TokenTrackAction("Show Month", "tokentrack.showMonth", "pulse"),
    new TokenTrackAction("Show Current Session", "tokentrack.showSession", "clock"),
    new TokenTrackAction("Show Projects", "tokentrack.showProjects", "folder-library"),
    new TokenTrackAction("Set Monthly Budget", "tokentrack.setBudget", "symbol-number"),
    new TokenTrackAction("Export JSON", "tokentrack.exportJson", "json"),
    new TokenTrackAction("Export CSV", "tokentrack.exportCsv", "table"),
    new TokenTrackAction("Ingest Codex JSONL Log", "tokentrack.ingestCodexLog", "cloud-upload"),
    new TokenTrackAction("Show Database Path", "tokentrack.showDatabasePath", "database")
  ];

  getTreeItem(element: TokenTrackAction): vscode.TreeItem {
    return element;
  }

  getChildren(): TokenTrackAction[] {
    return this.actions;
  }
}

class TokenTrackAction extends vscode.TreeItem {
  constructor(label: string, commandId: string, iconId: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: commandId,
      title: label
    };
    this.iconPath = new vscode.ThemeIcon(iconId);
  }
}
