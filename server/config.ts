import dotenv from "dotenv";
import { z } from "zod";
dotenv.config({
  path: [`.env.${process.env.NODE_ENV ?? "development"}`, ".env"],
  quiet: true,
});
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.url().default("http://localhost:5173"),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default(""),
  OPENAI_REASONING_EFFORT: z
    .enum(["none", "minimal", "low", "medium", "high"])
    .default("none"),
  AI_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(60),
  AI_REQUESTS_PER_DAY: z.coerce.number().int().positive().default(5000),
  AI_MONTHLY_TOKEN_LIMIT: z.coerce.number().int().positive().default(10000000),
  AI_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(256)
    .max(4000)
    .default(1200),
  AI_MODEL_PRICING: z.string().default("{}"),
  SUPABASE_URL: z.string().default(""),
  SUPABASE_PUBLISHABLE_KEY: z.string().default(""),
  SERVER_SUPABASE_SECRET_KEY: z.string().default(""),
  META_APP_ID: z.string().default(""),
  META_APP_SECRET: z.string().default(""),
  META_VERIFY_TOKEN: z.string().default(""),
  META_GRAPH_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/)
    .default("v23.0"),
  TOKEN_ENCRYPTION_KEY: z.string().default(""),
  WEBHOOK_BASE_URL: z.string().default(""),
});
export const config = envSchema.parse(process.env);
export const providerEnv = z
  .object({
    AI_PROVIDER: z.enum(["openai", "groq"]).default("groq"),
    GROQ_API_KEY: z.string().default(""),
    GROQ_MODEL: z.string().default(""),
    GROQ_REASONING_EFFORT: z.enum(["low", "medium", "high"]).default("low"),
  })
  .parse(process.env);
export function providerConfig() {
  return providerEnv.AI_PROVIDER === "groq"
    ? {
        name: "groq",
        model: providerEnv.GROQ_MODEL,
        apiKey: providerEnv.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
        effort: providerEnv.GROQ_REASONING_EFFORT,
      }
    : {
        name: "openai",
        model: config.OPENAI_MODEL,
        apiKey: config.OPENAI_API_KEY,
        baseURL: "https://api.openai.com/v1",
        effort: config.OPENAI_REASONING_EFFORT,
      };
}
export const databaseConfigured = Boolean(
  config.SUPABASE_URL &&
  config.SERVER_SUPABASE_SECRET_KEY &&
  config.SUPABASE_PUBLISHABLE_KEY,
);
if (
  config.NODE_ENV === "production" &&
  (!databaseConfigured || !config.FRONTEND_URL.startsWith("https://"))
)
  throw new Error("Production requires Supabase and an HTTPS frontend origin.");
export const pricing = z
  .record(
    z.string(),
    z.object({
      input: z.number().nonnegative(),
      cachedInput: z.number().nonnegative().optional(),
      output: z.number().nonnegative(),
    }),
  )
  .parse(JSON.parse(config.AI_MODEL_PRICING));
