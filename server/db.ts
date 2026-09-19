import { createClient } from "@supabase/supabase-js";
import { config, databaseConfigured } from "./config.js";
import { AppError } from "./errors.js";
const client = databaseConfigured
  ? createClient(config.SUPABASE_URL, config.SERVER_SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
export function db() {
  if (!client)
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Connect your Supabase project to use the live workspace.",
    );
  return client;
}
export function checked<T>(result: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (result.error)
    throw new AppError(
      503,
      "STORAGE_ERROR",
      "The operation could not be saved. Please try again.",
    );
  return result.data as NonNullable<T>;
}
export class Repository {
  constructor(readonly organizationId: string) {}
  async list<T>(table: string, columns = "*", limit = 200): Promise<T[]> {
    return checked(
      await db()
        .from(table)
        .select(columns)
        .eq("organization_id", this.organizationId)
        .limit(limit),
    ) as T[];
  }
  async get<T>(table: string, id: string, columns = "*"): Promise<T> {
    const value = checked(
      await db()
        .from(table)
        .select(columns)
        .eq("organization_id", this.organizationId)
        .eq("id", id)
        .maybeSingle(),
    );
    if (!value) throw new AppError(404, "NOT_FOUND", "Item not found.");
    return value as T;
  }
  async insert<T>(table: string, values: Record<string, unknown>): Promise<T> {
    return checked(
      await db()
        .from(table)
        .insert({ ...values, organization_id: this.organizationId })
        .select()
        .single(),
    ) as T;
  }
  async update<T>(
    table: string,
    id: string,
    values: Record<string, unknown>,
  ): Promise<T> {
    const row = checked(
      await db()
        .from(table)
        .update(values)
        .eq("organization_id", this.organizationId)
        .eq("id", id)
        .select()
        .maybeSingle(),
    );
    if (!row) throw new AppError(404, "NOT_FOUND", "Item not found.");
    return row as T;
  }
  async remove(table: string, id: string) {
    await this.get(table, id);
    checked(
      await db()
        .from(table)
        .delete()
        .eq("organization_id", this.organizationId)
        .eq("id", id),
    );
  }
  async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    return checked(
      await db().rpc(name, { ...args, p_org: this.organizationId }),
    ) as T;
  }
}
