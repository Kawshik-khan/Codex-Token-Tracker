export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
};

export type TrackedRequest = TokenUsage & {
  model: string;
  timestamp: Date;
  sessionId: string;
  projectPath: string;
  projectName: string;
  cost: number;
  raw?: unknown;
};

export type Session = {
  id: string;
  startedAt: Date;
  endedAt?: Date | null;
  projectPath: string;
  projectName: string;
};

export type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  cost: number;
  requests: number;
  sessions: number;
  projects: number;
};

export type TrendPoint = {
  label: string;
  totalTokens: number;
  cost: number;
};

export type BudgetStatus = {
  monthlyLimit: number;
  used: number;
  remaining: number;
  percentUsed: number;
  alertLevel: 80 | 90 | 100 | null;
};
