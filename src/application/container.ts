import { openDb } from "../infrastructure/db/client.js";
import { BudgetRepository } from "../infrastructure/repositories/budget-repository.js";
import { RequestRepository } from "../infrastructure/repositories/request-repository.js";
import { SessionRepository } from "../infrastructure/repositories/session-repository.js";
import { AnalyticsService } from "./analytics-service.js";
import { ExportService } from "./export-service.js";
import { IngestService } from "./ingest-service.js";
import { RequestTracker } from "./request-tracker.js";
import { SessionManager } from "./session-manager.js";

export function createContainer() {
  const db = openDb();
  const sessionRepository = new SessionRepository(db);
  const requestRepository = new RequestRepository(db);
  const budgetRepository = new BudgetRepository(db);
  const sessionManager = new SessionManager(sessionRepository);

  const requestTracker = new RequestTracker(sessionManager, requestRepository);

  return {
    db,
    sessionRepository,
    requestRepository,
    budgetRepository,
    sessionManager,
    requestTracker,
    analytics: new AnalyticsService(requestRepository, budgetRepository, sessionManager),
    exporter: new ExportService(requestRepository),
    ingest: new IngestService(requestTracker)
  };
}
