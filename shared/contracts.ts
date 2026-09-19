import { z } from "zod";
export const platformSchema = z.enum(["facebook", "instagram"]);
export type Platform = z.infer<typeof platformSchema>;
export const businessSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    category: z.string().max(150),
    description: z.string().max(3000),
    location: z.string().max(300),
    contact: z.string().max(300),
    hours: z.string().max(500),
    delivery: z.string().max(1500),
    payments: z.string().max(500),
    policies: z.string().max(3000),
  })
  .strict();
export type Business = z.infer<typeof businessSchema>;
export const settingsSchema = z
  .object({
    bot_name: z.string().min(1).max(80),
    enabled: z.boolean(),
    tone: z.enum(["Friendly", "Professional", "Casual", "Formal"]),
    language: z.enum(["English", "Filipino", "Taglish"]),
    response_style: z.enum(["Concise", "Detailed"]),
    welcome: z.string().max(1000),
    fallback: z.string().max(1000),
    custom_instructions: z.string().max(2000),
    handoff_keywords: z.array(z.string().min(1).max(80)).max(30),
    timezone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }),
    business_hours_enabled: z.boolean(),
    open_hour: z.number().int().min(0).max(23),
    close_hour: z.number().int().min(0).max(23),
    open_days: z.array(z.number().int().min(0).max(6)).max(7),
    outside_hours_message: z.string().max(1000),
    requests_per_minute: z.number().int().min(1).max(1000),
    requests_per_day: z.number().int().min(1).max(100000),
    monthly_token_limit: z.number().int().min(1000).max(100000000),
  })
  .strict();
export type BotSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: BotSettings = {
  bot_name: "Aria",
  enabled: true,
  tone: "Friendly",
  language: "English",
  response_style: "Concise",
  welcome: "Hi there! How can we help you today?",
  fallback:
    "Thanks for reaching out. Our team will confirm this information and get back to you.",
  custom_instructions: "",
  handoff_keywords: [],
  timezone: "Asia/Manila",
  business_hours_enabled: false,
  open_hour: 9,
  close_hour: 18,
  open_days: [1, 2, 3, 4, 5],
  outside_hours_message:
    "Thanks for your message! Our team will get back to you during business hours.",
  requests_per_minute: 20,
  requests_per_day: 1000,
  monthly_token_limit: 1000000,
};
export const knowledgeSchema = z
  .object({
    kind: z.enum(["product", "faq", "policy", "service"]),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(3000),
    verified: z.boolean(),
  })
  .strict();
export type Knowledge = z.infer<typeof knowledgeSchema> & {
  id: string;
  organization_id: string;
};
export const automationSchema = z
  .object({
    name: z.string().min(1).max(150),
    keywords: z.array(z.string().min(1).max(100)).min(1).max(30),
    reply: z.string().min(1).max(1500),
    enabled: z.boolean(),
    priority: z.number().int().min(0).max(100),
  })
  .strict();
export type Automation = z.infer<typeof automationSchema> & {
  id: string;
  organization_id: string;
  uses: number;
};
export type Conversation = {
  id: string;
  organization_id: string;
  customer_id: string;
  social_account_id: string;
  customer_name: string;
  platform: Platform;
  status: "open" | "human" | "resolved";
  last_message: string;
  updated_at: string;
  created_at: string;
  last_incoming_at: string;
  assigned_to: string | null;
  is_test: boolean;
};
export type Message = {
  id: string;
  organization_id: string;
  conversation_id: string;
  direction: "inbound" | "outbound" | "note";
  source: "customer" | "ai" | "automation" | "human" | "system";
  text: string;
  created_at: string;
  delivery_status: string;
};
export type SocialAccount = {
  id: string;
  organization_id: string;
  external_id: string;
  platform: Platform;
  name: string;
  connected: boolean;
};
export type Draft = {
  id: string;
  organization_id: string;
  kind: string;
  title: string;
  content: string;
  status: "draft" | "approved" | "scheduled" | "published" | "needs_review";
  platform: Platform;
  scheduled_at: string | null;
  social_account_id: string | null;
  image_url: string | null;
  ai_generated: boolean;
  created_at: string;
};
export type Usage = {
  id: string;
  organization_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number | null;
  request_status: string;
  latency_ms: number;
  created_at: string;
  is_test: boolean;
};
export type Member = {
  user_id: string;
  organization_id: string;
  role: "owner" | "admin" | "agent";
  display_name: string;
};
export type Notification = {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
};
export type Dashboard = {
  organization: { id: string; name: string };
  role: Member["role"];
  business: Business;
  settings: BotSettings;
  conversations: Conversation[];
  automations: Automation[];
  knowledge: Knowledge[];
  accounts: SocialAccount[];
  drafts: Draft[];
  usage: Usage[];
  members: Member[];
  notifications: Notification[];
};
export const aiTaskSchema = z.enum([
  "chat",
  "test",
  "classify",
  "summarize",
  "handoff",
  "generate-faqs",
  "generate-business-profile",
  "generate-welcome-message",
  "generate-fallback-message",
  "generate-post-caption",
  "generate-automation-suggestions",
]);
export type AITask = z.infer<typeof aiTaskSchema>;
export const aiInputSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    conversationId: z.uuid().optional(),
  })
  .strict();
export const decisionSchema = z
  .object({
    text: z.string().max(4000),
    intent: z.enum([
      "greeting",
      "product_question",
      "price_question",
      "availability_question",
      "delivery_question",
      "payment_question",
      "order_question",
      "complaint",
      "refund",
      "appointment",
      "human_request",
      "unknown",
    ]),
    requires_human: z.boolean(),
    confidence: z.number().min(0).max(1),
    fact_ids: z.array(z.string()),
    reason: z.string().max(300),
  })
  .strict();
export type AIDecision = z.infer<typeof decisionSchema>;
export type AIResult = {
  text: string;
  requires_human: boolean;
  source: "ai" | "automation" | "fallback" | "handoff";
  is_test: boolean;
  intent?: string;
  draftId?: string;
};
