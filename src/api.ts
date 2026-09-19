import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const session = (await supabase?.auth.getSession())?.data.session;
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL ?? ""}/api${path}`,
    {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "The server is unavailable." }));
    throw new Error(error.message ?? "The request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
