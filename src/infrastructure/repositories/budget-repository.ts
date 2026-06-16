import { desc } from "drizzle-orm";
import { budgets } from "../db/schema.js";
import type { DbClient } from "../db/client.js";

export class BudgetRepository {
  constructor(private readonly db: DbClient) {}

  async setMonthlyLimit(monthlyLimit: number): Promise<void> {
    await this.db.insert(budgets).values({ monthlyLimit, createdAt: new Date() });
  }

  async getMonthlyLimit(): Promise<number | null> {
    const [row] = await this.db.select().from(budgets).orderBy(desc(budgets.createdAt)).limit(1);
    return row?.monthlyLimit ?? null;
  }
}
