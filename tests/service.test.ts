import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIContext, AIProvider } from "../server/services/ai/ai.types.js";
import { defaultSettings } from "../shared/contracts.js";
import { Repository } from "../server/db.js";
import { config, providerEnv } from "../server/config.js";
import { AIService } from "../server/services/ai/ai.service.js";
import { buildContext } from "../server/services/ai/ai.context.js";
import { recordUsage, reserve } from "../server/services/ai/ai.usage.js";
vi.mock("../server/services/ai/ai.context.js", () => ({
  buildContext: vi.fn(),
}));
vi.mock("../server/services/ai/ai.usage.js", () => ({
  reserve: vi.fn(),
  recordUsage: vi.fn(),
}));
const context: AIContext = {
  organizationId: "org-a",
  message: "price?",
  facts: [{ id: "p1", text: "Bouquet: ₱850" }],
  history: [],
  summary: "",
  botSettings: defaultSettings,
};
const provider: AIProvider = { generate: vi.fn() };
let repo: Repository;
beforeEach(() => {
  vi.resetAllMocks();
  providerEnv.AI_PROVIDER = "openai";
  config.OPENAI_API_KEY = "test-key";
  config.OPENAI_MODEL = "test-model";
  repo = new Repository("org-a");
  vi.spyOn(repo, "get").mockResolvedValue({ status: "open" });
  vi.spyOn(repo, "list").mockResolvedValue([]);
  vi.spyOn(repo, "rpc").mockResolvedValue(null);
  vi.spyOn(repo, "update").mockResolvedValue({});
  vi.mocked(buildContext).mockResolvedValue(structuredClone(context));
  vi.mocked(reserve).mockResolvedValue("request-1");
  vi.mocked(recordUsage).mockResolvedValue(undefined);
  vi.mocked(provider.generate).mockResolvedValue({
    decision: {
      text: "A reply",
      intent: "price_question",
      confidence: 0.95,
      requires_human: false,
      fact_ids: ["p1"],
      reason: "",
    },
    usage: {
      input_tokens: 42,
      output_tokens: 13,
      total_tokens: 55,
      cached_tokens: 0,
    },
  });
});
describe("AI orchestration resilience", () => {
  it("records actual usage and returns a grounded successful reply", async () => {
    const result = await new AIService(provider).generateCustomerReply(
      repo,
      "price?",
      "conversation-a",
    );
    expect(result.text).toBe("Bouquet: ₱850");
    expect(result.source).toBe("ai");
    expect(recordUsage).toHaveBeenCalledWith(
      repo,
      "request-1",
      expect.any(Number),
      false,
      "completed",
      {
        input_tokens: 42,
        output_tokens: 13,
        total_tokens: 55,
        cached_tokens: 0,
      },
    );
  });
  it("automation takes precedence over AI and spending", async () => {
    vi.mocked(repo.list).mockResolvedValue([
      {
        enabled: true,
        priority: 0,
        keywords: ["delivery"],
        reply: "Delivery is ₱150.",
      },
    ]);
    const result = await new AIService(provider).generateCustomerReply(
      repo,
      "delivery",
    );
    expect(result.source).toBe("automation");
    expect(provider.generate).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });
  it.each(["timeout", "invalid model", "provider 500"])(
    "fails safely on %s",
    async (reason) => {
      vi.mocked(provider.generate).mockRejectedValue(
        new Error(reason + " sk-private-secret"),
      );
      const result = await new AIService(provider).generateCustomerReply(
        repo,
        "price?",
      );
      expect(result.source).toBe("fallback");
      expect(result.text).toBe(defaultSettings.fallback);
      expect(result.text).not.toMatch(/sk-|500|invalid|timeout/);
      expect(recordUsage).toHaveBeenCalledWith(
        repo,
        "request-1",
        expect.any(Number),
        false,
        "failed",
        undefined,
      );
    },
  );
  it("does not call the provider when credentials are missing", async () => {
    config.OPENAI_API_KEY = "";
    expect(
      (await new AIService(provider).generateCustomerReply(repo, "price?"))
        .source,
    ).toBe("fallback");
    expect(provider.generate).not.toHaveBeenCalled();
  });
  it("falls back when model config is missing", async () => {
    config.OPENAI_MODEL = "";
    expect(
      (await new AIService(provider).generateCustomerReply(repo, "price?"))
        .source,
    ).toBe("fallback");
    expect(provider.generate).not.toHaveBeenCalled();
  });
  it("does not spend after a quota rejection", async () => {
    vi.mocked(reserve).mockRejectedValue(new Error("AI_LIMIT"));
    expect(
      (await new AIService(provider).generateCustomerReply(repo, "price?"))
        .source,
    ).toBe("fallback");
    expect(provider.generate).not.toHaveBeenCalled();
  });
  it("hands off if no fallback is configured", async () => {
    vi.mocked(buildContext).mockResolvedValue({
      ...context,
      botSettings: { ...defaultSettings, fallback: "" },
    });
    vi.mocked(provider.generate).mockRejectedValue(new Error("timeout"));
    const result = await new AIService(provider).generateCustomerReply(
      repo,
      "price?",
      "conversation-a",
    );
    expect(result.requires_human).toBe(true);
    expect(repo.rpc).toHaveBeenCalledWith(
      "handoff",
      expect.objectContaining({ p_conversation: "conversation-a" }),
    );
  });
  it("blocks post-handoff AI replies", async () => {
    vi.mocked(repo.get).mockResolvedValue({ status: "human" });
    expect(
      (
        await new AIService(provider).generateCustomerReply(
          repo,
          "price?",
          "conversation-a",
        )
      ).requires_human,
    ).toBe(true);
    expect(provider.generate).not.toHaveBeenCalled();
  });
  it("test handoff never changes a customer conversation", async () => {
    const result = await new AIService(provider).run(
      repo,
      "test",
      "human please",
      "conversation-a",
    );
    expect(result.is_test).toBe(true);
    expect(result.requires_human).toBe(true);
    expect(repo.rpc).not.toHaveBeenCalled();
  });
  it("unknown facts trigger handoff and rejection usage recording", async () => {
    vi.mocked(provider.generate).mockResolvedValue({
      decision: {
        text: "Guess",
        intent: "unknown",
        confidence: 0.9,
        requires_human: false,
        fact_ids: ["org-b-fact"],
        reason: "",
      },
      usage: {
        input_tokens: 20,
        output_tokens: 10,
        total_tokens: 30,
        cached_tokens: 0,
      },
    });
    expect(
      (
        await new AIService(provider).generateCustomerReply(
          repo,
          "price?",
          "conversation-a",
        )
      ).requires_human,
    ).toBe(true);
    expect(recordUsage).toHaveBeenCalledWith(
      repo,
      "request-1",
      expect.any(Number),
      false,
      "rejected",
      expect.objectContaining({ total_tokens: 30 }),
    );
  });
  it("rejects cross-org conversation access before context or provider calls", async () => {
    vi.mocked(repo.get).mockRejectedValue(new Error("NOT_FOUND"));
    await expect(
      new AIService(provider).generateCustomerReply(
        repo,
        "price?",
        "org-b-conversation",
      ),
    ).rejects.toThrow("NOT_FOUND");
    expect(buildContext).not.toHaveBeenCalled();
    expect(provider.generate).not.toHaveBeenCalled();
  });
});
