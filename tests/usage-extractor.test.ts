import { describe, expect, it } from "vitest";
import { calculateCost } from "../src/domain/pricing.js";
import { extractUsage, parseJsonLine } from "../src/application/usage-extractor.js";

describe("usage extraction", () => {
  it("extracts Responses API style usage", () => {
    const usage = extractUsage({
      timestamp: "2026-06-08T10:00:00Z",
      response: {
        model: "gpt-5",
        usage: {
          input_tokens: 1234,
          output_tokens: 567,
          total_tokens: 1801,
          input_token_details: {
            cached_tokens: 200
          }
        }
      }
    });

    expect(usage).toMatchObject({
      model: "gpt-5",
      inputTokens: 1234,
      outputTokens: 567,
      cachedTokens: 200,
      totalTokens: 1801
    });
  });

  it("extracts chat completions style usage", () => {
    const usage = extractUsage({
      model: "gpt-4.1-mini",
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        prompt_tokens_details: {
          cached_tokens: 3
        }
      }
    });

    expect(usage).toMatchObject({
      model: "gpt-4.1-mini",
      inputTokens: 10,
      outputTokens: 20,
      cachedTokens: 3,
      totalTokens: 30
    });
  });

  it("parses JSON lines and ignores plain terminal output", () => {
    expect(parseJsonLine('{"usage":{"input_tokens":1,"output_tokens":2}}')).toEqual({
      usage: { input_tokens: 1, output_tokens: 2 }
    });
    expect(parseJsonLine("normal codex output")).toBeNull();
  });
});

describe("cost calculation", () => {
  it("prices cached and uncached tokens separately", () => {
    const cost = calculateCost("gpt-5", 1_000_000, 500_000, 200_000, {
      "gpt-5": { input: 1.25, output: 10, cachedInput: 0.125 },
      default: { input: 1, output: 1 }
    });

    expect(cost).toBe(6.025);
  });
});
