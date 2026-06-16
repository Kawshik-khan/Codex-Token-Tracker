import { spawn } from "node:child_process";
import { EOL } from "node:os";
import type { RequestTracker } from "./request-tracker.js";

export async function runTrackedCommand(
  command: string,
  args: string[],
  tracker: RequestTracker,
  projectPath = process.cwd()
): Promise<number> {
  return new Promise((resolve) => {
    const { executable, executableArgs } = resolveExecutable(command, args);
    const child = spawn(executable, executableArgs, { stdio: ["inherit", "pipe", "pipe"] });

    const handleChunk = (chunk: Buffer, write: (text: string) => void) => {
      const text = chunk.toString();
      write(text);
      for (const line of text.split(/\r?\n/)) {
        void tracker.trackJsonLine(line, projectPath);
      }
    };

    child.stdout?.on("data", (chunk: Buffer) => handleChunk(chunk, (text) => process.stdout.write(text)));
    child.stderr?.on("data", (chunk: Buffer) => handleChunk(chunk, (text) => process.stderr.write(text)));
    child.on("error", (error) => {
      process.stderr.write(`Failed to run ${command}: ${error.message}${EOL}`);
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 0));
  });
}

function resolveExecutable(command: string, args: string[]): { executable: string; executableArgs: string[] } {
  if (process.platform !== "win32" || !/\.(cmd|bat)$/i.test(command)) {
    return { executable: command, executableArgs: args };
  }

  return {
    executable: process.env.ComSpec ?? "cmd.exe",
    executableArgs: ["/d", "/s", "/c", [windowsQuote(command), ...args.map(windowsQuote)].join(" ")]
  };
}

function windowsQuote(value: string): string {
  return `"${value.replaceAll('"', '\\"')}"`;
}
