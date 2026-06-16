import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { RequestTracker } from "./request-tracker.js";

export class IngestService {
  constructor(private readonly tracker: RequestTracker) {}

  async codexLog(path: string, projectPath = process.cwd()): Promise<number> {
    let imported = 0;
    const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }) });

    for await (const line of rl) {
      const tracked = await this.tracker.trackJsonLine(line, projectPath);
      if (tracked) {
        imported += 1;
      }
    }

    return imported;
  }
}
