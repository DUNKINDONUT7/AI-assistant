import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const sql = readFileSync(
  "supabase/migrations/202609190001_initial.sql",
  "utf8",
);
let db: PGlite;
const orgA = "10000000-0000-4000-8000-000000000001",
  orgB = "10000000-0000-4000-8000-000000000002";
const userA = "20000000-0000-4000-8000-000000000001",
  userB = "20000000-0000-4000-8000-000000000002";
const accountA = "30000000-0000-4000-8000-000000000001",
  accountB = "30000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated,anon,service_role;`,
  );
  await db.exec(sql);
  await db.exec(
    readFileSync("supabase/migrations/202609190002_hardening.sql", "utf8"),
  );
  await db.exec(
    `insert into auth.users values('${userA}'),('${userB}');insert into organizations(id,name) values('${orgA}','A'),('${orgB}','B');insert into memberships values('${orgA}','${userA}','owner','Alice'),('${orgB}','${userB}','owner','Bob');insert into ai_settings values('${orgA}','{"requests_per_minute":2,"requests_per_day":10,"monthly_token_limit":5000}'),('${orgB}','{}');insert into knowledge(organization_id,kind,title,content,verified) values('${orgA}','product','A price','850',true),('${orgB}','product','B secret','CONFIDENTIAL_B',true);insert into social_accounts(id,organization_id,external_id,platform,name) values('${accountA}','${orgA}','page-a','facebook','A'),('${accountB}','${orgB}','page-b','facebook','B');`,
  );
});
afterAll(async () => {
  await db.close();
});
describe("real PostgreSQL migration and tenant enforcement", () => {
  it("enables RLS on every application table", async () => {
    const result = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`,
    );
    expect(result.rows.length).toBeGreaterThan(15);
    expect(result.rows.every((r) => r.relrowsecurity)).toBe(true);
  });
  it("only exposes tenant A facts to tenant A and rejects cross-org direct lookup", async () => {
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${userA}',false);`,
    );
    try {
      const result = await db.query<{ title: string }>(
        "select title from knowledge",
      );
      expect(result.rows).toEqual([{ title: "A price" }]);
      expect(
        (
          await db.query(
            `select * from knowledge where organization_id='${orgB}'`,
          )
        ).rows,
      ).toHaveLength(0);
      expect((await db.query("select name from organizations")).rows).toEqual([
        { name: "A" },
      ]);
    } finally {
      await db.exec("reset role");
    }
  });
  it("blocks authenticated direct writes, credential reads and privileged RPC execution", async () => {
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${userA}',false);`,
    );
    try {
      await expect(
        db.query(
          `insert into knowledge(organization_id,kind,title,content) values('${orgB}','faq','attack','attack')`,
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("select * from social_credentials"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query(`select reserve_ai('${orgB}',null,null,1,100,100,100000)`),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
  it("does not allow anonymous reads", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from knowledge")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.exec("reset role");
    }
  });
  it("validates cross-organization composite foreign keys", async () => {
    await expect(
      db.query(
        `insert into customers(organization_id,social_account_id,external_id) values('${orgA}','${accountB}','attacker')`,
      ),
    ).rejects.toThrow(/foreign key/);
  });
  it("atomically deduplicates inbound messages and outbox replies", async () => {
    const args = [
      orgA,
      accountA,
      "customer-a",
      "event-1",
      "Hi!",
      new Date().toISOString(),
    ];
    const first = await db.query<{
      result: { duplicate: boolean; conversation_id: string };
    }>("select ingest_message($1,$2,$3,$4,$5,$6) as result", args);
    const second = await db.query<{ result: { duplicate: boolean } }>(
      "select ingest_message($1,$2,$3,$4,$5,$6) as result",
      args,
    );
    expect(first.rows[0].result.duplicate).toBe(false);
    expect(second.rows[0].result.duplicate).toBe(true);
    const conv = first.rows[0].result.conversation_id;
    const a = await db.query("select queue_reply($1,$2,$3,$4,$5,$6)", [
      orgA,
      conv,
      "Hello",
      "automation",
      "reply-1",
      true,
    ]);
    const b = await db.query("select queue_reply($1,$2,$3,$4,$5,$6)", [
      orgA,
      conv,
      "Hello",
      "automation",
      "reply-1",
      true,
    ]);
    expect(a.rows).toEqual(b.rows);
    expect((await db.query("select * from outbox")).rows).toHaveLength(1);
  });
  it("handoff cancels queued automatic messages and creates a note and notification once", async () => {
    const { rows } = await db.query<{ id: string }>(
      "select id from conversations where organization_id=$1",
      [orgA],
    );
    const conv = rows[0].id;
    await db.query("select handoff($1,$2,$3)", [orgA, conv, "Human requested"]);
    await db.query("select handoff($1,$2,$3)", [orgA, conv, "Human requested"]);
    expect((await db.query("select status from outbox")).rows).toEqual([
      { status: "cancelled" },
    ]);
    expect((await db.query("select * from notifications")).rows).toHaveLength(
      1,
    );
    expect(
      (
        await db.query("select queue_reply($1,$2,$3,$4,$5,$6) as result", [
          orgA,
          conv,
          "No",
          "ai",
          "reply-2",
          true,
        ])
      ).rows,
    ).toEqual([{ result: null }]);
  });
  it("still permits a manual reply after handoff", async () => {
    const { rows } = await db.query<{ id: string }>(
      "select id from conversations where organization_id=$1",
      [orgA],
    );
    await db.query("select queue_reply($1,$2,$3,$4,$5,$6)", [
      orgA,
      rows[0].id,
      "A person is here",
      "human",
      "manual-1",
      false,
    ]);
    const result = await db.query<{ is_automatic: boolean; status: string }>(
      "select * from claim_outbox()",
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].is_automatic).toBe(false);
    expect(result.rows[0].status).toBe("sending");
    expect((await db.query("select * from claim_outbox()")).rows).toHaveLength(
      0,
    );
  });
  it("blocks live sends from test conversations", async () => {
    const result = await db.query<{ result: { conversation_id: string } }>(
      "select ingest_message($1,$2,$3,$4,$5,$6) as result",
      [
        orgB,
        accountB,
        "test-customer",
        "test-event",
        "hello",
        new Date().toISOString(),
      ],
    );
    const conv = result.rows[0].result.conversation_id;
    await db.query("update conversations set is_test=true where id=$1", [conv]);
    expect(
      (
        await db.query("select queue_reply($1,$2,$3,$4,$5,$6) as result", [
          orgB,
          conv,
          "blocked",
          "ai",
          "test-1",
          true,
        ])
      ).rows,
    ).toEqual([{ result: null }]);
  });
  it("enforces monthly reservation limits before calling a provider", async () => {
    await expect(
      db.query("select reserve_ai($1,null,null,6000,100,100,100000)", [orgA]),
    ).rejects.toThrow(/AI_LIMIT/);
  });
  it("serializes admission and enforces per-minute limits", async () => {
    const results = await Promise.allSettled(
      [1, 2, 3].map(() =>
        db.query("select reserve_ai($1,null,null,1000,100,100,100000)", [orgA]),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("records authoritative usage and reconciles reservations", async () => {
    const requests = await db.query<{ id: string }>(
      "select id from ai_requests where organization_id=$1",
      [orgA],
    );
    await db.query("select finish_ai($1,$2,$3)", [
      orgA,
      requests.rows[0].id,
      JSON.stringify({
        model: "test",
        input_tokens: 30,
        output_tokens: 10,
        total_tokens: 40,
        estimated_cost: 0.01,
        request_status: "completed",
        latency_ms: 500,
        is_test: true,
      }),
    ]);
    expect(
      (
        await db.query(
          "select total_tokens,input_tokens,output_tokens,is_test from ai_usage",
        )
      ).rows,
    ).toEqual([
      { total_tokens: 40, input_tokens: 30, output_tokens: 10, is_test: true },
    ]);
    expect(
      (
        await db.query("select reserved_tokens from ai_requests where id=$1", [
          requests.rows[0].id,
        ])
      ).rows,
    ).toEqual([{ reserved_tokens: 40 }]);
  });
  it("failed calls with unknown usage retain a conservative reservation", async () => {
    const requests = await db.query<{ id: string }>(
      "select id from ai_requests where organization_id=$1 and request_status=$2",
      [orgA, "started"],
    );
    await db.query("select finish_ai($1,$2,$3)", [
      orgA,
      requests.rows[0].id,
      JSON.stringify({
        model: "test",
        request_status: "failed",
        latency_ms: 25000,
      }),
    ]);
    expect(
      (
        await db.query("select reserved_tokens from ai_requests where id=$1", [
          requests.rows[0].id,
        ])
      ).rows,
    ).toEqual([{ reserved_tokens: 1000 }]);
  });
});
