import { homedir } from "node:os";
import { join, basename, resolve } from "node:path";
import { mkdirSync } from "node:fs";

export function getDataDir(): string {
  const base =
    process.env.TOKENTRACK_HOME ??
    (process.platform === "win32"
      ? join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "TokenTrack")
      : join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "tokentrack"));

  mkdirSync(base, { recursive: true });
  return base;
}

export function getDatabasePath(): string {
  return process.env.TOKENTRACK_DB_PATH ?? join(getDataDir(), "tokentrack.sqlite");
}

export function detectProjectPath(cwd = process.cwd()): string {
  return resolve(cwd);
}

export function detectProjectName(projectPath = detectProjectPath()): string {
  return basename(projectPath) || "unknown";
}
