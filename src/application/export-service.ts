import type { RequestRepository } from "../infrastructure/repositories/request-repository.js";
import { toCsv } from "../presentation/format.js";

export class ExportService {
  constructor(private readonly requests: RequestRepository) {}

  async json(): Promise<string> {
    const rows = await this.requests.exportRows();
    return JSON.stringify(rows, null, 2);
  }

  async csv(): Promise<string> {
    const rows = await this.requests.exportRows();
    return toCsv(rows as unknown as Array<Record<string, unknown>>);
  }
}
