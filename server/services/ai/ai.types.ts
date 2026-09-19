import type {
  AIDecision,
  AITask,
  BotSettings,
} from "../../../shared/contracts.js";
export type Fact = { id: string; text: string };
export type AIContext = {
  organizationId: string;
  conversationId?: string;
  facts: Fact[];
  history: { role: "user" | "assistant"; content: string }[];
  summary: string;
  botSettings: BotSettings;
  message: string;
};
export type ProviderResult = {
  decision: AIDecision;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cached_tokens: number;
  };
};
export interface AIProvider {
  generate(task: AITask, context: AIContext): Promise<ProviderResult>;
}
export type NormalizedIncomingMessage = {
  organizationId: string;
  socialAccountId: string;
  customerId: string;
  conversationId: string;
  platform: "facebook" | "instagram";
  messageId: string;
  text: string;
  attachments: unknown[];
  timestamp: string;
};
export type AIChatRequest = AIContext;
