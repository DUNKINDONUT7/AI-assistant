import type { Request, Response } from "express";
import { createApp } from "../server/app.js";

const app = createApp();

// Vercel's Vite routing serves one-level API files directly but does not pass
// nested paths through an Express catch-all consistently. vercel.json rewrites
// every /api/* request here; restore the original path before Express handles it.
export default function handler(req: Request, res: Response) {
  const path = typeof req.query.path === "string" ? req.query.path : "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    for (const item of Array.isArray(value) ? value : [value])
      if (typeof item === "string") query.append(key, item);
  }
  req.url = `/api/${path}${query.size ? `?${query.toString()}` : ""}`;
  app(req, res);
}
