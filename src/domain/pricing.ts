import { existsSync, readFileSync } from "node:fs";

export type ModelPricing = {
  input: number;
  output: number;
  cachedInput?: number;
};

export type PricingRegistry = Record<string, ModelPricing>;

const defaultPricing: PricingRegistry = {
  "gpt-5": { input: 1.25, output: 10, cachedInput: 0.125 },
  "gpt-5-mini": { input: 0.25, output: 2, cachedInput: 0.025 },
  "gpt-4.1": { input: 2, output: 8, cachedInput: 0.5 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6, cachedInput: 0.1 },
  default: { input: 1.25, output: 10, cachedInput: 0.125 }
};

export function loadPricingRegistry(path = process.env.TOKENTRACK_PRICING_PATH): PricingRegistry {
  if (!path || !existsSync(path)) {
    return defaultPricing;
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as PricingRegistry;
  return { ...defaultPricing, ...parsed };
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number,
  registry = loadPricingRegistry()
): number {
  const pricing = registry[model] ?? registry.default;
  const uncachedInput = Math.max(inputTokens - cachedTokens, 0);
  const inputCost = (uncachedInput / 1_000_000) * pricing.input;
  const cachedInputCost = (cachedTokens / 1_000_000) * (pricing.cachedInput ?? pricing.input);
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return Number((inputCost + cachedInputCost + outputCost).toFixed(8));
}
