import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "../server/config.js";
const credentials = JSON.parse(
  readFileSync(".local/owner-credentials.json", "utf8"),
) as { email: string; password: string; organizationId: string };
const client = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data, error } = await client.auth.signInWithPassword({
  email: credentials.email,
  password: credentials.password,
});
if (error || !data.session) throw new Error("Sign-in failed");
const headers = {
  Authorization: `Bearer ${data.session.access_token}`,
  "Content-Type": "application/json",
};
const dashboard = await fetch("http://127.0.0.1:3001/api/dashboard", {
  headers,
});
const workspace = await dashboard.json();
if (!dashboard.ok || workspace.organization?.id !== credentials.organizationId)
  throw new Error("Dashboard access failed");
const health = await fetch("http://127.0.0.1:3001/api/ai/health?verify=true", {
  headers,
});
const provider = await health.json();
if (!health.ok || !provider.verified)
  throw new Error("Provider verification failed");
const response = await fetch("http://127.0.0.1:3001/api/ai/test", {
  method: "POST",
  headers,
  body: JSON.stringify({ message: "What is the name of this business?" }),
});
const result = await response.json();
if (!response.ok || result.source !== "ai" || !result.is_test)
  throw new Error("Live AI test failed");
const usage = await fetch("http://127.0.0.1:3001/api/ai/usage", { headers });
const rows = await usage.json();
if (
  !rows.some(
    (r: { provider: string; is_test: boolean; total_tokens: number }) =>
      r.provider === "groq" && r.is_test && r.total_tokens > 0,
  )
)
  throw new Error("Usage recording failed");
const forbidden = await fetch("http://127.0.0.1:3001/api/dashboard", {
  headers: {
    ...headers,
    "x-workspace-id": "00000000-0000-4000-8000-000000000000",
  },
});
if (forbidden.status !== 403) throw new Error("Tenant boundary failed");
console.info(
  JSON.stringify({
    liveOwnerLogin: true,
    liveDashboard: true,
    provider: provider.provider,
    model: provider.model,
    aiReply: result.text,
    usagePersisted: true,
    crossTenantBlocked: true,
    customerMessagesSent: 0,
  }),
);
await client.auth.signOut();
