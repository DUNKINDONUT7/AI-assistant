import { config, pricing, providerConfig } from "../../config.js";
import { AppError, audit } from "../../errors.js";
import { db, type Repository } from "../../db.js";
import type { AIContext, ProviderResult } from "./ai.types.js";
export function estimateCost(
  model: string,
  usage: ProviderResult["usage"],
): number | null {
  const p = pricing[model];
  if (!p) return null;
  return (
    ((usage.input_tokens - usage.cached_tokens) * p.input +
      usage.cached_tokens * (p.cachedInput ?? p.input) +
      usage.output_tokens * p.output) /
    1000000
  );
}
export async function reserve(
  repo: Repository,
  context: AIContext,
  userId?: string,
) {
  // UTF-8 byte count is a conservative upper bound on input tokens, plus wrapper overhead.
  const tokens =
    Buffer.byteLength(JSON.stringify(context), "utf8") +
    8000 +
    config.AI_MAX_OUTPUT_TOKENS;
  const { data, error } = await db().rpc("reserve_ai", {
    p_org: repo.organizationId,
    p_user: userId ?? null,
    p_conversation: context.conversationId ?? null,
    p_tokens: tokens,
    p_rpm: config.AI_REQUESTS_PER_MINUTE,
    p_day: config.AI_REQUESTS_PER_DAY,
    p_month: config.AI_MONTHLY_TOKEN_LIMIT,
  });
  if (error)
    throw new AppError(
      429,
      "AI_LIMIT",
      "AI is unavailable or a usage limit has been reached.",
    );
  return data as string;
}
export async function recordUsage(
  repo: Repository,
  id: string,
  start: number,
  isTest: boolean,
  status: string,
  usage?: ProviderResult["usage"],
) {
  const provider = providerConfig();
  await repo.rpc("finish_ai", {
    p_id: id,
    p_usage: {
      model: provider.model,
      provider: provider.name,
      ...(usage
        ? {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            total_tokens: usage.total_tokens,
            estimated_cost: estimateCost(provider.model, usage),
          }
        : {}),
      request_status: status,
      latency_ms: Date.now() - start,
      is_test: isTest,
    },
  });
  audit(`ai.${status}`, {
    organization_id: repo.organizationId,
    request_id: id,
    model: provider.model,
    provider: provider.name,
    latency_ms: Date.now() - start,
    total_tokens: usage?.total_tokens ?? null,
  });
}
