import type { AIDecision } from "../../../shared/contracts.js";
import type { AIContext } from "./ai.types.js";
export const SAFE_CLARIFICATION =
  "Could you share a little more detail so our team can help?";
const unsafe =
  /(?:sk-[\w-]{12,}|gsk_[\w-]+|sb_secret_[\w-]+|Bearer\s+[\w.-]+|service_role|system prompt|system instructions|<script|ignore (?:all |previous )?instructions)/i;
const completedAction =
  /\b(?:I(?:'ve| have)?|we(?:'ve| have)?|your)\s+(?:(?:successfully|already)\s+)?(?:created|booked|confirmed|processed|received|charged|refunded|cancelled|placed)\b|\b(?:order|payment|appointment)\s+(?:is|was|has been)\s+(?:confirmed|received|booked|placed|processed)/i;
export function validateText(text: string, context: AIContext): boolean {
  if (
    !text.trim() ||
    text.length > 4000 ||
    unsafe.test(text) ||
    completedAction.test(text)
  )
    return false;
  const known = context.facts
    .map((f) => f.text)
    .join(" ")
    .toLowerCase();
  const amounts = text.match(/(?:[$₱€£]|\bPHP\s*)\s*\d[\d,.]*/gi) ?? [];
  if (amounts.some((amount) => !known.includes(amount.toLowerCase())))
    return false;
  return true;
}
export function groundedReply(
  decision: AIDecision,
  context: AIContext,
): string | null {
  if (decision.requires_human || decision.confidence < 0.8) return null;
  // A short social greeting needs no business fact. Allow it only when the
  // customer actually sent a greeting and the model classified it as such.
  if (
    decision.intent === "greeting" &&
    /^\s*(?:hi|hello|hey|sup|good\s+(?:morning|afternoon|evening)|kumusta|musta|magandang\s+(?:umaga|hapon|gabi))\b/i.test(
      context.message,
    ) &&
    !decision.fact_ids.length
  )
    return decision.text.length <= 300 && validateText(decision.text, context)
      ? decision.text
      : null;
  if (!decision.fact_ids.length)
    return decision.text === SAFE_CLARIFICATION ? SAFE_CLARIFICATION : null;
  const facts = decision.fact_ids
    .slice(0, 3)
    .map((id) => context.facts.find((f) => f.id === id));
  if (facts.some((f) => !f)) return null;
  // Customer-facing factual replies are assembled from owner-verified facts, never model prose.
  // This intentionally trades paraphrasing for a deterministic no-fabrication boundary.
  const text = facts.map((f) => f!.text).join("\n\n");
  return text.length <= 1900 && validateText(text, context) ? text : null;
}
export function handoffReason(
  message: string,
  keywords: string[] = [],
): string | null {
  if (
    /\b(human|agent|representative|refund|dispute|chargeback|complaint|lawyer|lawsuit|suicide)\b|\b(?:angry|furious|scam|terrible service)\b/i.test(
      message,
    )
  )
    return "Customer requested support or raised a sensitive issue.";
  if (
    keywords.some((k) =>
      message.toLocaleLowerCase().includes(k.toLocaleLowerCase()),
    )
  )
    return "A configured handoff condition was matched.";
  if (
    /ignore.{0,30}instructions|system prompt|api key|developer message/i.test(
      message,
    )
  )
    return "Potential instruction injection requires review.";
  return null;
}
