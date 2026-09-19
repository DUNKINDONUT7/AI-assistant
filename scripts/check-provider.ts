import { OpenAIProvider } from "../server/services/ai/providers/openai.provider.js";
import { providerConfig } from "../server/config.js";
import { defaultSettings } from "../shared/contracts.js";
try {
  const result = await new OpenAIProvider().generate("test", {
    organizationId: "verification-only",
    message: "What are the business hours?",
    facts: [
      { id: "hours", text: "Business hours: Monday to Friday, 9 AM to 5 PM." },
    ],
    history: [],
    summary: "",
    botSettings: defaultSettings,
  });
  console.info(
    JSON.stringify({
      provider: providerConfig().name,
      model: providerConfig().model,
      structuredOutput: true,
      selectedFactIds: result.decision.fact_ids,
      requiresHuman: result.decision.requires_human,
      usage: result.usage,
    }),
  );
} catch (error) {
  const e = error as { status?: number; code?: string; message?: string };
  console.error(
    JSON.stringify({
      provider: providerConfig().name,
      status: e.status,
      code: e.code ?? "PROVIDER_CHECK_FAILED",
      message: e.message?.replace(/gsk_[\w-]+|sk-[\w-]+/g, "[redacted]"),
    }),
  );
  process.exitCode = 1;
}
