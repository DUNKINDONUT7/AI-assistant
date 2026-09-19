import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { ZodError, z } from "zod";
import { config } from "./config.js";
import { AppError, audit } from "./errors.js";
import { api } from "./routes.js";
import { verifiedUser } from "./auth.js";
import { defaultSettings } from "../shared/contracts.js";
import { checked, db } from "./db.js";
import {
  verifySignature,
  persistWebhook,
  completeOAuth,
} from "./services/meta.js";
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/meta/webhook", (req, res) => {
    if (
      config.META_VERIFY_TOKEN &&
      req.query["hub.mode"] === "subscribe" &&
      req.query["hub.verify_token"] === config.META_VERIFY_TOKEN
    )
      return res.status(200).send(String(req.query["hub.challenge"] ?? ""));
    res.sendStatus(403);
  });
  app.post(
    "/api/meta/webhook",
    express.raw({ type: "application/json", limit: "512kb" }),
    async (req, res) => {
      if (
        !Buffer.isBuffer(req.body) ||
        !verifySignature(req.body, req.header("x-hub-signature-256"))
      )
        throw new AppError(
          401,
          "INVALID_SIGNATURE",
          "Invalid webhook signature.",
        );
      let payload: unknown;
      try {
        payload = JSON.parse(req.body.toString("utf8"));
      } catch {
        throw new AppError(400, "INVALID_JSON", "Invalid JSON.");
      }
      await persistWebhook(payload);
      res.sendStatus(200);
    },
  );
  app.get("/api/meta/callback", async (req, res) => {
    const state = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(req.query.state);
    const cookie = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("relay_oauth="))
      ?.slice(12);
    if (cookie !== state)
      throw new AppError(
        403,
        "OAUTH_STATE",
        "The connection request expired. Please try again.",
      );
    const saved = checked(
      await db()
        .from("oauth_states")
        .delete()
        .eq("id", state)
        .gt("expires_at", new Date().toISOString())
        .select()
        .maybeSingle(),
    );
    if (!saved)
      throw new AppError(
        403,
        "OAUTH_STATE",
        "The connection request expired. Please try again.",
      );
    const member = checked(
      await db()
        .from("memberships")
        .select("role")
        .eq("organization_id", saved.organization_id)
        .eq("user_id", saved.user_id)
        .maybeSingle(),
    );
    if (!member || !["owner", "admin"].includes(member.role))
      throw new AppError(403, "FORBIDDEN", "Workspace access is unavailable.");
    await completeOAuth(
      saved.organization_id,
      z.string().min(1).max(3000).parse(req.query.code),
    );
    res.clearCookie("relay_oauth", { path: "/api/meta/callback" });
    res.redirect(`${config.FRONTEND_URL}/?connected=true#channels`);
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: "RATE_LIMIT",
        message: "Too many requests. Please try again shortly.",
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.post("/api/onboarding", async (req, res) => {
    const user = await verifiedUser(req.headers.authorization);
    const payload = z
      .object({
        name: z.string().trim().min(1).max(150),
        display_name: z.string().trim().min(1).max(100),
      })
      .strict()
      .parse(req.body);
    const { data, error } = await db().rpc("create_workspace", {
      p_user: user.id,
      p_name: payload.name,
      p_display_name: payload.display_name,
      p_config: defaultSettings,
    });
    if (error)
      throw new AppError(
        409,
        "SETUP_FAILED",
        "Workspace setup could not be completed. You may already have a workspace.",
      );
    res.status(201).json({ organizationId: data });
  });
  app.use("/api", api);
  app.use((_req, res) =>
    res.status(404).json({ error: "NOT_FOUND", message: "Route not found." }),
  );
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({
          error: "INVALID_INPUT",
          message: "Check the required fields and try again.",
        });
    if (error instanceof AppError)
      return res
        .status(error.status)
        .json({ error: error.code, message: error.publicMessage });
    audit("request.failed");
    res
      .status(500)
      .json({
        error: "INTERNAL_ERROR",
        message: "This request could not be completed.",
      });
  };
  app.use(errors);
  return app;
}
