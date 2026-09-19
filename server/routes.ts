import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { authenticate, requireAdmin } from "./auth.js";
import { checked, db } from "./db.js";
import { AppError } from "./errors.js";
import { config, providerConfig } from "./config.js";
import {
  aiTaskSchema,
  aiInputSchema,
  settingsSchema,
  businessSchema,
  knowledgeSchema,
  automationSchema,
  defaultSettings,
  type Dashboard,
  type Draft,
  type Conversation,
  type SocialAccount,
} from "../shared/contracts.js";
import { aiService } from "./services/ai/ai.service.js";
import { oauthUrl } from "./services/meta.js";
import { checkModel } from "./services/ai/providers/openai.provider.js";
import { workerTick } from "./services/worker.js";
export const api = Router();
api.use(authenticate);
api.get("/dashboard", async (_req, res) => {
  const { repo, role, organizationId } = res.locals.auth;
  const tables = [
    "business_profiles",
    "ai_settings",
    "conversations",
    "automations",
    "knowledge",
    "social_accounts",
    "drafts",
    "ai_usage",
    "memberships",
    "notifications",
  ];
  const values = await Promise.all(
    tables.map(async (table) =>
      table === "ai_usage" && role === "agent"
        ? []
        : checked(
            await db()
              .from(table)
              .select("*")
              .eq("organization_id", organizationId)
              .order(
                ["business_profiles", "ai_settings", "memberships"].includes(
                  table,
                )
                  ? "organization_id"
                  : table === "conversations"
                    ? "updated_at"
                    : "created_at",
                { ascending: false },
              )
              .limit(200),
          ),
    ),
  );
  const organization = checked(
    await db()
      .from("organizations")
      .select("id,name")
      .eq("id", organizationId)
      .single(),
  );
  await repo.insert("audit_events", {
    action: "dashboard.read",
    user_id: res.locals.auth.userId,
  });
  res.json({
    organization,
    role,
    business: values[0][0],
    settings: { ...defaultSettings, ...values[1][0]?.config },
    conversations: values[2],
    automations: values[3],
    knowledge: values[4],
    accounts: values[5],
    drafts: values[6],
    usage: values[7],
    members: values[8],
    notifications: values[9],
  } satisfies Partial<Dashboard>);
});
api.get("/conversations/:id/messages", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const { repo, organizationId } = res.locals.auth;
  await repo.get("conversations", id);
  res.json(
    checked(
      await db()
        .from("messages")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
    ).reverse(),
  );
});
api.patch("/conversations/:id", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const payload = z
    .object({
      status: z.enum(["open", "human", "resolved"]).optional(),
      assigned_to: z.uuid().nullable().optional(),
    })
    .strict()
    .parse(req.body);
  const { repo } = res.locals.auth;
  await repo.get("conversations", id);
  if (payload.assigned_to) {
    const member = checked(
      await db()
        .from("memberships")
        .select("user_id")
        .eq("organization_id", repo.organizationId)
        .eq("user_id", payload.assigned_to)
        .maybeSingle(),
    );
    if (!member) throw new AppError(404, "NOT_FOUND", "Team member not found.");
  }
  if (payload.status === "human")
    await repo.rpc("handoff", {
      p_conversation: id,
      p_reason: "A team member took over this conversation.",
    });
  res.json(
    await repo.update("conversations", id, {
      ...payload,
      updated_at: new Date().toISOString(),
    }),
  );
});
api.post("/conversations/:id/messages", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const payload = z
    .object({ text: z.string().trim().min(1).max(1900), requestId: z.uuid() })
    .strict()
    .parse(req.body);
  const { repo } = res.locals.auth;
  const c = await repo.get<Conversation>("conversations", id);
  if (new Date(c.last_incoming_at).getTime() < Date.now() - 86400000)
    throw new AppError(
      409,
      "WINDOW_CLOSED",
      "The messaging window has closed.",
    );
  await repo.rpc("handoff", {
    p_conversation: id,
    p_reason: "A team member is replying.",
  });
  const queued = await repo.rpc("queue_reply", {
    p_conversation: id,
    p_text: payload.text,
    p_source: "human",
    p_key: `manual:${payload.requestId}`,
    p_automatic: false,
  });
  if (!queued)
    throw new AppError(
      409,
      "SEND_BLOCKED",
      "This conversation cannot receive messages.",
    );
  if (process.env.VERCEL) await workerTick();
  res.status(202).json({ queued: true });
});
api.get("/ai/usage", requireAdmin, async (_req, res) =>
  res.json(await res.locals.auth.repo.list("ai_usage")),
);
api.get("/ai/health", requireAdmin, async (req, res) => {
  const provider = providerConfig();
  let verified = false;
  if (req.query.verify === "true" && provider.apiKey && provider.model) {
    try {
      verified = await checkModel();
    } catch {
      /* sanitized status only */
    }
  }
  res.json({
    configured: Boolean(provider.apiKey && provider.model),
    provider: provider.name,
    model: provider.model || null,
    verified,
  });
});
api.post("/ai/:task", requireAdmin, async (req, res) => {
  const task = aiTaskSchema.parse(req.params.task);
  const { message, conversationId } = aiInputSchema.parse(req.body);
  const { repo, userId } = res.locals.auth;
  if (["chat", "summarize", "handoff"].includes(task) && !conversationId)
    throw new AppError(400, "CONVERSATION_REQUIRED", "Choose a conversation.");
  const result = await aiService.run(
    repo,
    task,
    message,
    conversationId,
    userId,
  );
  if (
    task.startsWith("generate-") &&
    result.source === "ai" &&
    !result.requires_human
  ) {
    const draft = await repo.insert<Draft>("drafts", {
      kind: task,
      title: message.slice(0, 100),
      content: result.text,
      ai_generated: true,
    });
    result.draftId = draft.id;
  }
  res.json(result);
});
api.put("/settings", requireAdmin, async (req, res) => {
  const value = settingsSchema.parse(req.body);
  checked(
    await db()
      .from("ai_settings")
      .upsert({
        organization_id: res.locals.auth.organizationId,
        config: value,
      }),
  );
  res.json(value);
});
api.put("/business", requireAdmin, async (req, res) => {
  const value = businessSchema.parse(req.body);
  checked(
    await db()
      .from("business_profiles")
      .upsert({ ...value, organization_id: res.locals.auth.organizationId }),
  );
  res.json(value);
});
for (const [table, schema] of [
  ["knowledge", knowledgeSchema],
  ["automations", automationSchema],
] as const) {
  api.post(`/${table}`, requireAdmin, async (req, res) =>
    res
      .status(201)
      .json(await res.locals.auth.repo.insert(table, schema.parse(req.body))),
  );
  api.put(`/${table}/:id`, requireAdmin, async (req, res) =>
    res.json(
      await res.locals.auth.repo.update(
        table,
        z.uuid().parse(req.params.id),
        schema.parse(req.body),
      ),
    ),
  );
  api.delete(`/${table}/:id`, requireAdmin, async (req, res) => {
    await res.locals.auth.repo.remove(table, z.uuid().parse(req.params.id));
    res.sendStatus(204);
  });
}
const draftSchema = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(4000),
    platform: z.enum(["facebook", "instagram"]),
    image_url: z.url().startsWith("https://").nullable().optional(),
  })
  .strict();
api.post("/drafts", requireAdmin, async (req, res) =>
  res
    .status(201)
    .json(
      await res.locals.auth.repo.insert("drafts", draftSchema.parse(req.body)),
    ),
);
api.patch("/drafts/:id", requireAdmin, async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const payload = z
    .object({
      title: z.string().min(1).max(200).optional(),
      content: z.string().min(1).max(4000).optional(),
      status: z.enum(["draft", "approved", "scheduled"]).optional(),
      scheduled_at: z.iso.datetime().nullable().optional(),
      social_account_id: z.uuid().nullable().optional(),
      image_url: z.url().startsWith("https://").nullable().optional(),
    })
    .strict()
    .parse(req.body);
  const { repo } = res.locals.auth;
  const draft = await repo.get<Draft>("drafts", id);
  if (["publishing", "published"].includes(draft.status))
    throw new AppError(
      409,
      "POST_LOCKED",
      "This post can no longer be edited.",
    );
  if (payload.status === "scheduled") {
    if (draft.status !== "approved")
      throw new AppError(
        409,
        "APPROVAL_REQUIRED",
        "Approve the draft before scheduling.",
      );
    if (payload.content || payload.title)
      throw new AppError(
        409,
        "APPROVAL_REQUIRED",
        "Approve your edits before scheduling.",
      );
    if (!["post", "generate-post-caption"].includes(draft.kind))
      throw new AppError(
        400,
        "NOT_A_POST",
        "Only post captions can be scheduled.",
      );
    const account = await repo.get<SocialAccount>(
      "social_accounts",
      payload.social_account_id ?? draft.social_account_id ?? "",
    );
    if (!account.connected || account.platform !== draft.platform)
      throw new AppError(
        400,
        "ACCOUNT_REQUIRED",
        "Choose a connected account on the correct platform.",
      );
    if (
      draft.platform === "instagram" &&
      !(payload.image_url ?? draft.image_url)
    )
      throw new AppError(400, "IMAGE_REQUIRED", "Add an Instagram image URL.");
    if (
      !payload.scheduled_at ||
      new Date(payload.scheduled_at).getTime() < Date.now()
    )
      throw new AppError(400, "DATE_REQUIRED", "Choose a future publish time.");
  }
  if (payload.content || payload.title) payload.status = "draft";
  res.json(await repo.update("drafts", id, payload));
});
api.delete("/drafts/:id", requireAdmin, async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const draft = await res.locals.auth.repo.get<Draft>("drafts", id);
  if (["publishing", "published"].includes(draft.status))
    throw new AppError(409, "POST_LOCKED", "This post cannot be deleted.");
  await res.locals.auth.repo.remove("drafts", id);
  res.sendStatus(204);
});
api.patch("/notifications/:id", async (req, res) =>
  res.json(
    await res.locals.auth.repo.update(
      "notifications",
      z.uuid().parse(req.params.id),
      { read: true },
    ),
  ),
);
api.post("/team", requireAdmin, async (req, res) => {
  const payload = z
    .object({
      email: z.email(),
      role: z.enum(["admin", "agent"]),
      display_name: z.string().min(1).max(100),
    })
    .strict()
    .parse(req.body);
  if (payload.role === "admin" && res.locals.auth.role !== "owner")
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only the owner can add administrators.",
    );
  const { data, error } = await db().auth.admin.inviteUserByEmail(
    payload.email,
    { redirectTo: config.FRONTEND_URL },
  );
  if (error || !data.user)
    throw new AppError(
      400,
      "INVITE_FAILED",
      "The invitation could not be created.",
    );
  checked(
    await db()
      .from("memberships")
      .insert({
        organization_id: res.locals.auth.organizationId,
        user_id: data.user.id,
        role: payload.role,
        display_name: payload.display_name,
      }),
  );
  res.status(201).json({ invited: true });
});
api.post("/meta/connect", requireAdmin, async (_req, res) => {
  const state = randomBytes(32).toString("hex");
  const url = oauthUrl(state);
  await res.locals.auth.repo.insert("oauth_states", {
    id: state,
    user_id: res.locals.auth.userId,
    expires_at: new Date(Date.now() + 600000).toISOString(),
  });
  res.cookie("relay_oauth", state, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/meta/callback",
    maxAge: 600000,
  });
  res.json({ url });
});
api.delete("/accounts/:id", requireAdmin, async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  await res.locals.auth.repo.update("social_accounts", id, {
    connected: false,
  });
  checked(
    await db()
      .from("social_credentials")
      .delete()
      .eq("organization_id", res.locals.auth.organizationId)
      .eq("social_account_id", id),
  );
  res.sendStatus(204);
});
