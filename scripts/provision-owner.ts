import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "../server/config.js";
import { defaultSettings } from "../shared/contracts.js";
const admin = createClient(
  config.SUPABASE_URL,
  config.SERVER_SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
mkdirSync(".local", { recursive: true });
const path = ".local/owner-credentials.json";
let credentials: {
  email: string;
  password: string;
  userId: string;
  organizationId?: string;
};
if (existsSync(path)) {
  credentials = JSON.parse(readFileSync(path, "utf8"));
} else {
  const email = "admin@relay.local";
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Workspace owner" },
  });
  if (error || !data.user)
    throw new Error(
      "Owner account provisioning failed. No credentials were logged.",
    );
  credentials = { email, password, userId: data.user.id };
  writeFileSync(path, JSON.stringify(credentials, null, 2));
}
const { data: membership, error: membershipError } = await admin
  .from("memberships")
  .select("organization_id")
  .eq("user_id", credentials.userId)
  .limit(1)
  .maybeSingle();
if (membershipError) throw new Error("Membership lookup failed.");
if (membership) credentials.organizationId = membership.organization_id;
else {
  const { data, error } = await admin.rpc("create_workspace", {
    p_user: credentials.userId,
    p_name: "My business",
    p_display_name: "Workspace owner",
    p_config: defaultSettings,
  });
  if (error) throw new Error("Workspace provisioning failed.");
  credentials.organizationId = data;
}
writeFileSync(path, JSON.stringify(credentials, null, 2));
writeFileSync(
  ".local/owner-credentials.txt",
  `Relay — live owner login\n\nURL: http://localhost:5173/#login\nEmail: ${credentials.email}\nPassword: ${credentials.password}\n\nSupabase project: ${config.SUPABASE_URL}\nUser ID: ${credentials.userId}\nWorkspace ID: ${credentials.organizationId}\n\nThis account is persisted in Supabase Auth and has an owner membership.\nThe email is a local login alias, not a mailbox. Change it to your real email in Account settings for password recovery.\nKeep this file private. It is excluded from version control.\n`,
);
const client = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: session, error } = await client.auth.signInWithPassword({
  email: credentials.email,
  password: credentials.password,
});
if (error || !session.session)
  throw new Error("Owner sign-in verification failed.");
const { data: ownRows, error: rlsError } = await client
  .from("memberships")
  .select("role")
  .eq("user_id", credentials.userId);
if (rlsError || ownRows?.[0]?.role !== "owner")
  throw new Error("Owner membership verification failed.");
console.info(
  JSON.stringify({
    ownerCreated: true,
    signInVerified: true,
    membershipVerified: true,
    email: credentials.email,
    credentialsFile: ".local/owner-credentials.txt",
  }),
);
await client.auth.signOut();
