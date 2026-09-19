import type { RequestHandler } from "express";
import { db, checked, Repository } from "./db.js";
import { AppError } from "./errors.js";
import type { Member } from "../shared/contracts.js";
export type Auth = {
  userId: string;
  organizationId: string;
  role: Member["role"];
  repo: Repository;
};
declare module "express-serve-static-core" {
  interface Locals {
    auth: Auth;
  }
}
export async function verifiedUser(authorization: string | undefined) {
  const token = authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token)
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous)
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  return data.user;
}
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const user = await verifiedUser(req.headers.authorization);
    // Header selects a workspace only; current database membership grants access.
    const org = req.headers["x-workspace-id"];
    let query = db()
      .from("memberships")
      .select("organization_id,role")
      .eq("user_id", user.id);
    if (typeof org === "string") query = query.eq("organization_id", org);
    const memberships = checked(await query.limit(1));
    const membership = memberships?.[0];
    if (!membership)
      throw new AppError(403, "FORBIDDEN", "Workspace access is unavailable.");
    res.locals.auth = {
      userId: user.id,
      organizationId: membership.organization_id,
      role: membership.role,
      repo: new Repository(membership.organization_id),
    };
    next();
  } catch (e) {
    next(e);
  }
};
export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (!["owner", "admin"].includes(res.locals.auth.role))
    return next(
      new AppError(403, "FORBIDDEN", "An owner or admin is required."),
    );
  next();
};
