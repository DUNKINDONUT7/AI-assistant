import {
  defaultSettings,
  settingsSchema,
  type Business,
  type Knowledge,
  type Message,
  type Conversation,
} from "../../../shared/contracts.js";
import { db, checked, type Repository } from "../../db.js";
import type { AIContext, Fact } from "./ai.types.js";
export function redact(text: string) {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email omitted]")
    .replace(/\b(?:\+?\d[\d ()-]{8,}\d)\b/g, "[phone omitted]")
    .replace(/\b(?:sk-|gsk_|sb_secret_|EAAB)[\w-]{12,}\b/g, "[secret omitted]");
}
export function boundedHistory(messages: Message[]) {
  return messages
    .filter((m) => m.direction !== "note")
    .slice(-16)
    .map((m) => ({
      role:
        m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
      content: redact(m.text).slice(0, 1200),
    }));
}
export async function buildContext(
  repo: Repository,
  message: string,
  conversationId?: string,
): Promise<AIContext> {
  const [profiles, settings, knowledge] = await Promise.all([
    repo.list<Business>("business_profiles"),
    repo.list<{ config: unknown }>("ai_settings"),
    repo.list<Knowledge>("knowledge"),
  ]);
  const botSettings = settingsSchema.parse({
    ...defaultSettings,
    ...((settings[0]?.config as object) ?? {}),
  });
  const facts: Fact[] = Object.entries(profiles[0] ?? {})
    .filter(
      ([key, value]) =>
        key !== "organization_id" && typeof value === "string" && value.trim(),
    )
    .map(([key, value]) => ({
      id: `business:${key}`,
      text: `${key}: ${String(value)}`,
    }));
  const words = message
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const relevant = knowledge
    .filter((k) => k.verified)
    .map((k) => ({
      k,
      score: words.filter((w) =>
        (k.title + " " + k.content).toLowerCase().includes(w),
      ).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  facts.push(
    ...relevant.map(({ k }) => ({
      id: k.id,
      text: `${k.title}: ${k.content}`,
    })),
  );
  let history: AIContext["history"] = [];
  let summary = "";
  if (conversationId) {
    const conversation = await repo.get<Conversation & { summary: string }>(
      "conversations",
      conversationId,
    );
    summary = redact(conversation.summary ?? "").slice(0, 2000);
    const messages = checked(
      await db()
        .from("messages")
        .select("*")
        .eq("organization_id", repo.organizationId)
        .eq("conversation_id", conversationId)
        .neq("direction", "note")
        .order("created_at", { ascending: false })
        .limit(64),
    ) as Message[];
    const ordered = messages.reverse();
    history = boundedHistory(ordered);
    if (ordered.length > 16) {
      // Extractive compaction has no extra provider cost. It remains untrusted context.
      const older = ordered.slice(0, -16);
      summary = older
        .slice(-12)
        .map(
          (m) =>
            `${m.direction === "inbound" ? "Customer" : "Assistant"}: ${redact(m.text).slice(0, 140)}`,
        )
        .join("\n")
        .slice(-2000);
      await repo.update("conversations", conversationId, {
        summary,
        summary_through: older.at(-1)!.created_at,
      });
    }
  }
  return {
    organizationId: repo.organizationId,
    conversationId,
    facts: facts
      .map((f) => ({ ...f, text: f.text.slice(0, 1500) }))
      .slice(0, 22),
    history,
    summary,
    botSettings,
    message: redact(message).slice(0, 4000),
  };
}
