import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const app = createApp();
describe("API security without credentials", () => {
  it("core process health is independent of AI configuration", async () => {
    const r = await request(app).get("/healthz");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ status: "ok" });
  });
  it.each([
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
  ])("rejects anonymous AI %s", async (task) => {
    const r = await request(app)
      .post(`/api/ai/${task}`)
      .send({ message: "Hello", organization_id: "victim" });
    expect(r.status).toBe(401);
    expect(JSON.stringify(r.body)).not.toContain("stack");
  });
  it.each(["usage", "health"])("protects AI %s", async (path) =>
    expect((await request(app).get(`/api/ai/${path}`)).status).toBe(401),
  );
  it("rejects unsigned webhooks before storage", async () => {
    const r = await request(app)
      .post("/api/meta/webhook")
      .send({ object: "page", entry: [] });
    expect(r.status).toBe(401);
  });
  it("rejects empty verify token even when config is missing", async () =>
    expect(
      (
        await request(app).get(
          "/api/meta/webhook?hub.mode=subscribe&hub.verify_token=",
        )
      ).status,
    ).toBe(403));
  it("has no provider imports or private credentials in frontend source", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
      );
    const source = walk("src")
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /OPENAI_API_KEY|SERVER_SUPABASE_SECRET_KEY|api\.openai\.com|from ['"]openai/,
    );
  });
});
