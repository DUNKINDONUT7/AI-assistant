import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { config } from "../config.js";
import { AppError } from "../errors.js";
import { checked, db, Repository } from "../db.js";
import type {
  SocialAccount,
  Conversation,
  Draft,
} from "../../shared/contracts.js";
export function verifySignature(
  body: Buffer,
  signature: string | undefined,
  secret = config.META_APP_SECRET,
) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature))
    return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}
function encryptionKey() {
  const key = Buffer.from(config.TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32)
    throw new AppError(
      503,
      "TOKEN_KEY_MISSING",
      "Social account connections are not configured.",
    );
  return key;
}
export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64"))
    .join(".");
}
export function decryptToken(token: string) {
  const [iv, tag, data] = token.split(".").map((v) => Buffer.from(v, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
const graphRoot = () =>
  `https://graph.facebook.com/${config.META_GRAPH_VERSION}`;
export async function graph(
  path: string,
  token: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${graphRoot()}/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new AppError(
      502,
      "META_UNAVAILABLE",
      "The social platform could not complete this request.",
    );
  return response.json();
}
async function tokenFor(repo: Repository, id: string) {
  const rows = checked(
    await db()
      .from("social_credentials")
      .select("encrypted_token")
      .eq("organization_id", repo.organizationId)
      .eq("social_account_id", id)
      .single(),
  );
  return decryptToken(rows.encrypted_token);
}
export async function sendMessage(
  repo: Repository,
  conversation: Conversation,
  text: string,
) {
  if (conversation.is_test)
    throw new AppError(
      400,
      "TEST_SEND_BLOCKED",
      "Test sessions cannot send customer messages.",
    );
  const account = await repo.get<SocialAccount>(
    "social_accounts",
    conversation.social_account_id,
  );
  if (!account.connected)
    throw new AppError(
      409,
      "ACCOUNT_DISCONNECTED",
      "Reconnect the social account.",
    );
  const customer = await repo.get<{ external_id: string }>(
    "customers",
    conversation.customer_id,
  );
  const token = await tokenFor(repo, account.id);
  // Instagram with Facebook Login uses the connected Instagram professional account ID.
  const payload =
    account.platform === "facebook"
      ? {
          recipient: { id: customer.external_id },
          message: { text },
          messaging_type: "RESPONSE",
        }
      : { recipient: { id: customer.external_id }, message: { text } };
  return graph(
    `${encodeURIComponent(account.external_id)}/messages`,
    token,
    payload,
  );
}
export async function publishPost(repo: Repository, draft: Draft) {
  if (!draft.social_account_id)
    throw new AppError(400, "ACCOUNT_REQUIRED", "Choose an account.");
  const account = await repo.get<SocialAccount>(
    "social_accounts",
    draft.social_account_id,
  );
  if (!account.connected) throw new Error("DISCONNECTED");
  const token = await tokenFor(repo, account.id);
  if (account.platform === "facebook")
    return graph(`${account.external_id}/feed`, token, {
      message: draft.content,
    });
  if (!draft.image_url)
    throw new AppError(
      400,
      "IMAGE_REQUIRED",
      "Instagram posts require a public image URL.",
    );
  const container = z
    .object({ id: z.string() })
    .parse(
      await graph(`${account.external_id}/media`, token, {
        image_url: draft.image_url,
        caption: draft.content,
      }),
    );
  return graph(`${account.external_id}/media_publish`, token, {
    creation_id: container.id,
  });
}
export const webhookSchema = z.object({
  object: z.enum(["page", "instagram"]),
  entry: z
    .array(
      z.object({
        id: z.string(),
        messaging: z
          .array(
            z.object({
              sender: z.object({ id: z.string() }),
              recipient: z.object({ id: z.string() }),
              timestamp: z.number(),
              message: z
                .object({
                  mid: z.string(),
                  text: z.string().max(10000).optional(),
                  is_echo: z.boolean().optional(),
                  attachments: z.array(z.unknown()).optional(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .max(100),
});
export async function persistWebhook(payload: unknown) {
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success)
    throw new AppError(400, "INVALID_WEBHOOK", "Invalid webhook payload.");
  const platform = parsed.data.object === "page" ? "facebook" : "instagram";
  for (const entry of parsed.data.entry) {
    for (const event of entry.messaging ?? []) {
      if (!event.message || event.message.is_echo) continue;
      // This is the sole unscoped business lookup: resolve verified Meta account routing, never a caller org claim.
      const account = checked(
        await db()
          .from("social_accounts")
          .select("id,organization_id")
          .eq("platform", platform)
          .eq("external_id", entry.id)
          .eq("connected", true)
          .maybeSingle(),
      );
      if (!account) continue;
      checked(
        await db()
          .from("webhook_jobs")
          .upsert(
            {
              organization_id: account.organization_id,
              social_account_id: account.id,
              event_id: event.message.mid,
              sender_id: event.sender.id,
              text:
                event.message.text ??
                "[Attachment received; human review required]",
              event_timestamp: new Date(event.timestamp).toISOString(),
            },
            {
              onConflict: "social_account_id,event_id",
              ignoreDuplicates: true,
            },
          ),
      );
    }
  }
}
export function oauthUrl(state: string) {
  if (
    !config.META_APP_ID ||
    !config.META_APP_SECRET ||
    !config.WEBHOOK_BASE_URL
  )
    throw new AppError(
      503,
      "META_NOT_CONFIGURED",
      "Configure your Meta application to connect accounts.",
    );
  encryptionKey();
  const url = new URL(
    `https://www.facebook.com/${config.META_GRAPH_VERSION}/dialog/oauth`,
  );
  url.search = new URLSearchParams({
    client_id: config.META_APP_ID,
    redirect_uri: `${config.WEBHOOK_BASE_URL}/api/meta/callback`,
    state,
    scope:
      "pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_manage_messages,instagram_content_publish",
    response_type: "code",
  }).toString();
  return url.toString();
}
export async function completeOAuth(org: string, code: string) {
  const url = new URL(`${graphRoot()}/oauth/access_token`);
  url.search = new URLSearchParams({
    client_id: config.META_APP_ID,
    client_secret: config.META_APP_SECRET,
    redirect_uri: `${config.WEBHOOK_BASE_URL}/api/meta/callback`,
    code,
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("OAUTH_FAILED");
  const token = z
    .object({ access_token: z.string() })
    .parse(await response.json()).access_token;
  const pageSchema = z.object({
    id: z.string(),
    name: z.string(),
    access_token: z.string(),
    instagram_business_account: z
      .object({ id: z.string(), username: z.string().optional() })
      .optional(),
  });
  const pages = z
    .object({ data: z.array(pageSchema) })
    .parse(
      await graph(
        "me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100",
        token,
      ),
    );
  for (const page of pages.data) {
    const connect = async (
      externalId: string,
      platform: "facebook" | "instagram",
      name: string,
    ) => {
      const { error } = await db().rpc("connect_account", {
        p_org: org,
        p_external: externalId,
        p_platform: platform,
        p_name: name,
        p_token: encryptToken(page.access_token),
      });
      if (error)
        throw new AppError(
          409,
          "ACCOUNT_UNAVAILABLE",
          "This account cannot be connected to this workspace.",
        );
    };
    await graph(`${page.id}/subscribed_apps`, page.access_token, {
      subscribed_fields: "messages,messaging_postbacks",
    });
    await connect(page.id, "facebook", page.name);
    if (page.instagram_business_account)
      await connect(
        page.instagram_business_account.id,
        "instagram",
        page.instagram_business_account.username ?? page.name,
      );
  }
}
