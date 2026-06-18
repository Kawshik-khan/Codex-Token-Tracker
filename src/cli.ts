#!/usr/bin/env node
import { basename } from "node:path";
import { Command } from "commander";
import { createContainer } from "./application/container.js";
import { runTrackedCommand } from "./application/codex-runner.js";
import { getDatabasePath } from "./infrastructure/config.js";
import { dashboardBlock } from "./presentation/dashboard.js";
import { budgetBlock, chart, formatCost, formatNumber, summaryBlock } from "./presentation/format.js";
import { renderMonitor } from "./presentation/monitor.js";

const program = new Command();
const container = createContainer();
const analyticsCommands = new Set(["stats", "monitor", "export", "budget", "ingest", "run", "--help", "-h", "--version", "-V"]);
const invokedCommand = process.env.TOKENTRACK_COMMAND_NAME?.toLowerCase() ?? basename(process.argv[1] ?? "").toLowerCase();
const invokedAsCodex = invokedCommand.startsWith("codex");
const firstArg = process.argv[2];

if (invokedAsCodex && firstArg && !analyticsCommands.has(firstArg)) {
  const realCodex = process.env.CODEX_REAL_BIN;
  if (!realCodex) {
    console.error("CODEX_REAL_BIN must point to the original Codex executable for transparent proxy mode.");
    process.exit(1);
  }
  const code = await runTrackedCommand(realCodex, process.argv.slice(2), container.requestTracker);
  process.exit(code);
}

program
  .name(invokedAsCodex ? "codex" : "tokentrack")
  .description("Local-first Codex CLI token analytics")
  .version("0.1.0")
  .option("--db", "Print active SQLite database path")
  .action(async () => {
    console.log(await dashboardBlock(container.analytics));
  });

program.hook("preAction", (thisCommand) => {
  if (thisCommand.opts().db) {
    console.log(getDatabasePath());
  }
});

const stats = program.command("stats").description("Show token analytics");

stats.action(async () => {
  console.log(summaryBlock("Today", await container.analytics.today()));
  const budget = await container.analytics.budgetStatus();
  if (budget?.alertLevel) {
    console.log(`\nBudget alert: ${budget.alertLevel}% monthly budget reached`);
  }
});

stats.command("session").description("Show current session analytics").action(async () => {
  console.log(summaryBlock("Current Session", await container.analytics.currentSession()));
});

stats.command("today").description("Show today's analytics").action(async () => {
  console.log(summaryBlock("Today", await container.analytics.today()));
});

stats.command("week").description("Show weekly analytics").action(async () => {
  console.log(summaryBlock("Week", await container.analytics.week()));
  console.log("\n" + chart(await container.analytics.weeklyTrend()));
});

stats.command("month").description("Show monthly analytics").action(async () => {
  console.log(summaryBlock("Month", await container.analytics.month()));
  console.log("\n" + chart(await container.analytics.monthlyTrend()));
});

stats.command("cost").description("Show cost analytics").action(async () => {
  const month = await container.analytics.month();
  const today = await container.analytics.today();
  console.log(["Cost", "----", "", `Today: ${formatCost(today.cost)}`, `Month: ${formatCost(month.cost)}`].join("\n"));
});

stats
  .command("project")
  .description("Show project analytics")
  .argument("[name]", "Project name")
  .action(async (name?: string) => {
    if (name) {
      console.log(summaryBlock(`Project: ${name}`, await container.analytics.project(name)));
      return;
    }

    const projects = await container.analytics.projects();
    console.log("Projects\n--------");
    for (const project of projects) {
      console.log(
        `${project.projectName.padEnd(24)} ${formatNumber(project.totalTokens).padStart(12)} tokens  ${formatCost(project.cost).padStart(8)}  ${formatNumber(project.requests)} requests`
      );
    }
  });

program.command("monitor").description("Open live session dashboard").action(() => {
  renderMonitor(container.analytics);
});

program
  .command("export")
  .description("Export request analytics")
  .argument("<format>", "csv or json")
  .action(async (format: string) => {
    if (format === "csv") {
      console.log(await container.exporter.csv());
      return;
    }
    if (format === "json") {
      console.log(await container.exporter.json());
      return;
    }
    throw new Error("Format must be csv or json");
  });

const budget = program.command("budget").description("Manage monthly token budget");

budget
  .command("status")
  .description("Show monthly token budget status")
  .action(async () => {
    const status = await container.analytics.budgetStatus();
    console.log(status ? budgetBlock(status) : "No monthly budget set");
  });

budget
  .command("set")
  .argument("<tokens>", "Monthly token limit")
  .action(async (tokens: string) => {
    const limit = Number(tokens);
    if (!Number.isFinite(limit) || limit < 0) {
      throw new Error("Budget must be a non-negative number");
    }
    console.log(budgetBlock(await container.analytics.setBudget(limit)));
  });

program
  .command("ingest")
  .description("Import usage from local logs")
  .command("codex-log")
  .argument("<path>", "Path to a Codex JSONL log")
  .option("--project <path>", "Project path to associate with imported requests", process.cwd())
  .action(async (path: string, options: { project: string }) => {
    const imported = await container.ingest.codexLog(path, options.project);
    console.log(`Imported ${formatNumber(imported)} request records`);
  });

program
  .command("run")
  .description("Run Codex or another command and capture JSON/JSONL usage events")
  .allowUnknownOption(true)
  .argument("<command>", "Command to run")
  .argument("[args...]", "Arguments")
  .action(async (command: string, args: string[]) => {
    const code = await runTrackedCommand(command, args, container.requestTracker);
    process.exitCode = code;
  });

await program.parseAsync(process.argv);
