import type {
  AITask,
  AIResult,
  Automation,
  Conversation,
} from "../../../shared/contracts.js";
import type { Repository } from "../../db.js";
import { providerConfig } from "../../config.js";
import { audit } from "../../errors.js";
import { buildContext } from "./ai.context.js";
import { groundedReply, handoffReason, validateText } from "./ai.validator.js";
import {
  OpenAIProvider,
  ProviderValidationError,
} from "./providers/openai.provider.js";
import { recordUsage, reserve } from "./ai.usage.js";
import type { AIProvider, AIContext, ProviderResult } from "./ai.types.js";
export function matchAutomation(message: string, rules: Automation[]) {
  const normalized = message.toLocaleLowerCase();
  return [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority)
    .find((r) =>
      r.keywords.some((k) =>
        new RegExp(
          `(?:^|\\W)${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\W)`,
          "iu",
        ).test(normalized),
      ),
    );
}
export function isSimpleGreeting(message: string) {
  return /^\s*(?:hi|hello|hey|sup|good\s+(?:morning|afternoon|evening)|kumusta|musta|magandang\s+(?:umaga|hapon|gabi))[!,.?\s]*$/i.test(
    message,
  );
}
export function outsideHours(context: AIContext, date = new Date()) {
  const s = context.botSettings;
  if (!s.business_hours_enabled) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: s.timezone,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts.find((p) => p.type === "weekday")!.value,
  );
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  if (s.open_hour === s.close_hour) return !s.open_days.includes(day);
  if (s.open_hour > s.close_hour) {
    const serviceDay = hour < s.close_hour ? (day + 6) % 7 : day;
    return (
      !s.open_days.includes(serviceDay) ||
      !(hour >= s.open_hour || hour < s.close_hour)
    );
  }
  return (
    !s.open_days.includes(day) || hour < s.open_hour || hour >= s.close_hour
  );
}
export class AIService {
  constructor(private provider: AIProvider = new OpenAIProvider()) {}
  async run(
    repo: Repository,
    task: AITask,
    message: string,
    conversationId?: string,
    userId?: string,
  ): Promise<AIResult> {
    const isTest = task === "test";
    const isReply = task === "chat" || isTest;
    if (conversationId) {
      const c = await repo.get<Conversation>("conversations", conversationId);
      if (isReply && !isTest && c.status !== "open")
        return {
          text: "Automatic replies are paused for this conversation.",
          requires_human: true,
          source: "handoff",
          is_test: false,
        };
    }
    const context = await buildContext(repo, message, conversationId);
    const handoff = async (reason: string): Promise<AIResult> => {
      if (conversationId && !isTest)
        await repo.rpc("handoff", {
          p_conversation: conversationId,
          p_reason: reason,
        });
      return {
        text: reason,
        requires_human: true,
        source: "handoff",
        is_test: isTest,
      };
    };
    if (isReply) {
      const reason = handoffReason(
        message,
        context.botSettings.handoff_keywords,
      );
      if (reason) return handoff(reason);
      const rule = matchAutomation(
        message,
        await repo.list<Automation>("automations"),
      );
      if (rule)
        return {
          text: rule.reply,
          requires_human: false,
          source: "automation",
          is_test: isTest,
        };
      if (outsideHours(context))
        return context.botSettings.outside_hours_message
          ? {
              text: context.botSettings.outside_hours_message,
              requires_human: false,
              source: "automation",
              is_test: isTest,
            }
          : handoff("The business is outside its configured hours.");
      if (!context.botSettings.enabled)
        return handoff("The assistant is paused.");
      if (isSimpleGreeting(message))
        return {
          text: context.botSettings.welcome,
          requires_human: false,
          source: "automation",
          is_test: isTest,
        };
    }
    if (task === "handoff")
      return handoff(
        handoffReason(message, context.botSettings.handoff_keywords) ??
          "A team member has been requested.",
      );
    let id: string | undefined;
    let usage: ProviderResult["usage"] | undefined;
    const start = Date.now();
    try {
      const provider = providerConfig();
      if (!provider.apiKey || !provider.model)
        throw new Error("AI_NOT_CONFIGURED");
      id = await reserve(repo, context, userId);
      audit("ai.started", {
        organization_id: repo.organizationId,
        conversation_id: conversationId ?? null,
        request_id: id,
        model: provider.model,
      });
      const result = await this.provider.generate(task, context);
      usage = result.usage;
      const text = isReply
        ? groundedReply(result.decision, context)
        : validateText(result.decision.text, context)
          ? result.decision.text
          : null;
      await recordUsage(
        repo,
        id,
        start,
        isTest,
        text ? "completed" : "rejected",
        usage,
      );
      id = undefined;
      if (!text || result.decision.requires_human)
        return handoff("Our team needs to confirm this information.");
      if (task === "summarize" && conversationId) {
        await repo.update("conversations", conversationId, {
          summary: text,
          summary_through: new Date().toISOString(),
        });
      }
      return {
        text,
        requires_human: false,
        source: "ai",
        is_test: isTest,
        intent: result.decision.intent,
      };
    } catch (error) {
      if (error instanceof ProviderValidationError) usage = error.usage;
      if (id) {
        try {
          await recordUsage(repo, id, start, isTest, "failed", usage);
        } catch {
          audit("ai.usage_pending", {
            organization_id: repo.organizationId,
            request_id: id,
          });
        }
      }
      if (!isReply)
        return {
          text: "AI is currently unavailable. Please try again later.",
          requires_human: false,
          source: "fallback",
          is_test: isTest,
        };
      if (context.botSettings.fallback)
        return {
          text: context.botSettings.fallback,
          requires_human: false,
          source: "fallback",
          is_test: isTest,
        };
      return handoff("The assistant is unavailable. A team member is needed.");
    }
  }
  generateCustomerReply(
    repo: Repository,
    message: string,
    conversationId?: string,
    userId?: string,
  ) {
    return this.run(repo, "chat", message, conversationId, userId);
  }
  classifyMessage(repo: Repository, message: string, userId?: string) {
    return this.run(repo, "classify", message, undefined, userId);
  }
  detectHumanHandoff(
    repo: Repository,
    message: string,
    conversationId?: string,
  ) {
    return this.run(repo, "handoff", message, conversationId);
  }
  summarizeConversation(
    repo: Repository,
    message: string,
    conversationId: string,
    userId?: string,
  ) {
    return this.run(repo, "summarize", message, conversationId, userId);
  }
  generateBusinessProfile(repo: Repository, message: string, userId?: string) {
    return this.run(
      repo,
      "generate-business-profile",
      message,
      undefined,
      userId,
    );
  }
  generateFAQSuggestions(repo: Repository, message: string, userId?: string) {
    return this.run(repo, "generate-faqs", message, undefined, userId);
  }
  generateWelcomeMessage(repo: Repository, message: string, userId?: string) {
    return this.run(
      repo,
      "generate-welcome-message",
      message,
      undefined,
      userId,
    );
  }
  generateFallbackMessage(repo: Repository, message: string, userId?: string) {
    return this.run(
      repo,
      "generate-fallback-message",
      message,
      undefined,
      userId,
    );
  }
  generatePostCaption(repo: Repository, message: string, userId?: string) {
    return this.run(repo, "generate-post-caption", message, undefined, userId);
  }
  generateAutomationSuggestions(
    repo: Repository,
    message: string,
    userId?: string,
  ) {
    return this.run(
      repo,
      "generate-automation-suggestions",
      message,
      undefined,
      userId,
    );
  }
  testChatbot(repo: Repository, message: string, userId?: string) {
    return this.run(repo, "test", message, undefined, userId);
  }
}
export const aiService = new AIService();
