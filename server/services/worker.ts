import { checked, db, Repository } from "../db.js";
import { audit } from "../errors.js";
import { aiService } from "./ai/ai.service.js";
import { publishPost, sendMessage } from "./meta.js";
import type { Conversation, Draft, Message } from "../../shared/contracts.js";
type Job = {
  id: string;
  organization_id: string;
  social_account_id: string;
  sender_id: string;
  event_id: string;
  text: string;
  event_timestamp: string;
};
type Outbox = {
  id: string;
  organization_id: string;
  conversation_id: string;
  message_id: string;
};
export async function workerTick() {
  checked(await db().rpc("reconcile_deliveries"));
  const jobs = checked(await db().rpc("claim_webhook")) as Job[];
  for (const job of jobs) {
    const repo = new Repository(job.organization_id);
    try {
      const incoming = await repo.rpc<{
        conversation_id: string;
        duplicate: boolean;
      }>("ingest_message", {
        p_account: job.social_account_id,
        p_sender: job.sender_id,
        p_event: job.event_id,
        p_text: job.text,
        p_timestamp: job.event_timestamp,
      });
      if (!incoming.duplicate) {
        if (job.text.startsWith("[Attachment"))
          await repo.rpc("handoff", {
            p_conversation: incoming.conversation_id,
            p_reason: "An attachment needs human review.",
          });
        else {
          const result = await aiService.generateCustomerReply(
            repo,
            job.text,
            incoming.conversation_id,
          );
          if (!result.requires_human)
            await repo.rpc("queue_reply", {
              p_conversation: incoming.conversation_id,
              p_text: result.text,
              p_source: result.source === "fallback" ? "system" : result.source,
              p_key: `webhook:${job.social_account_id}:${job.event_id}`,
              p_automatic: true,
            });
        }
      } else {
        // A prior worker may have died after storing inbound content; never call AI twice.
        const sent = checked(
          await db()
            .from("outbox")
            .select("id")
            .eq("organization_id", job.organization_id)
            .eq(
              "dedupe_key",
              `webhook:${job.social_account_id}:${job.event_id}`,
            )
            .limit(1),
        );
        if (!sent.length)
          await repo.rpc("handoff", {
            p_conversation: incoming.conversation_id,
            p_reason:
              "Processing was interrupted. Please review the customer message.",
          });
      }
      await repo.update("webhook_jobs", job.id, { status: "completed" });
    } catch {
      audit("webhook.processing_failed", {
        organization_id: job.organization_id,
        job_id: job.id,
      });
    }
  }
  const outgoing = checked(await db().rpc("claim_outbox")) as Outbox[];
  for (const item of outgoing) {
    const repo = new Repository(item.organization_id);
    try {
      const [conversation, message] = await Promise.all([
        repo.get<Conversation>("conversations", item.conversation_id),
        repo.get<Message>("messages", item.message_id),
      ]);
      await sendMessage(repo, conversation, message.text);
      await repo.update("outbox", item.id, { status: "sent" });
      await repo.update("messages", message.id, { delivery_status: "sent" });
      await repo.update("conversations", conversation.id, {
        last_message: message.text,
        updated_at: new Date().toISOString(),
      });
    } catch {
      await repo.update("outbox", item.id, { status: "needs_review" });
      await repo.update("messages", item.message_id, {
        delivery_status: "needs_review",
      });
      await repo.rpc("handoff", {
        p_conversation: item.conversation_id,
        p_reason:
          "Delivery could not be confirmed. Check the social platform before replying again.",
      });
    }
  }
  const posts = checked(await db().rpc("claim_post")) as Draft[];
  for (const post of posts) {
    const repo = new Repository(post.organization_id);
    try {
      await publishPost(repo, post);
      await repo.update("drafts", post.id, { status: "published" });
    } catch {
      await repo.update("drafts", post.id, { status: "needs_review" });
      await repo.insert("notifications", {
        message:
          "A scheduled post needs review. Check the platform before publishing again.",
      });
    }
  }
}
export function startWorker() {
  let stopping = false;
  let timer: ReturnType<typeof setTimeout>;
  const run = async () => {
    try {
      await workerTick();
    } catch {
      audit("worker.unavailable");
    }
    if (!stopping) timer = setTimeout(() => void run(), 1500);
  };
  void run();
  return () => {
    stopping = true;
    clearTimeout(timer);
  };
}
