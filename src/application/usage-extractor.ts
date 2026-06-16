import { z } from "zod";
import type { TokenUsage } from "../domain/types.js";

const usageShape = z
  .object({
    input_tokens: z.number().optional(),
    prompt_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
    total_tokens: z.number().optional(),
    input_token_details: z
      .object({
        cached_tokens: z.number().optional()
      })
      .passthrough()
      .optional(),
    prompt_tokens_details: z
      .object({
        cached_tokens: z.number().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export type ExtractedUsage = TokenUsage & {
  model: string;
  timestamp: Date;
};

export function extractUsage(event: unknown): ExtractedUsage | null {
  const root = normalizeObject(event);
  if (!root) {
    return null;
  }

  const candidates = [
    root.usage,
    root.response && normalizeObject(root.response)?.usage,
    root.data && normalizeObject(root.data)?.usage,
    root.message && normalizeObject(root.message)?.usage,
    root.item && normalizeObject(root.item)?.usage
  ];

  for (const candidate of candidates) {
    const parsed = usageShape.safeParse(candidate);
    if (!parsed.success) {
      continue;
    }

    const usage = parsed.data;
    const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
    const cachedTokens =
      usage.input_token_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;

    if (inputTokens + outputTokens + totalTokens === 0) {
      continue;
    }

    return {
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens,
      model: findString(root, ["model", "model_name"]) ?? "unknown",
      timestamp: parseTimestamp(root)
    };
  }

  return null;
}

export function parseJsonLine(line: string): unknown | null {
  const trimmed = line.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function findString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (typeof obj[key] === "string") {
      return obj[key] as string;
    }
  }

  for (const value of Object.values(obj)) {
    const nested = normalizeObject(value);
    if (!nested) {
      continue;
    }
    const found = findString(nested, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

function parseTimestamp(obj: Record<string, unknown>): Date {
  const raw = obj.timestamp ?? obj.created_at ?? obj.createdAt;
  if (typeof raw === "string" || typeof raw === "number") {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date();
}
