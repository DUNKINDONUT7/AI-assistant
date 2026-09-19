import { useState } from "react";
import {
  Bot,
  Check,
  FlaskConical,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useStore } from "../store";
import { Badge, Button, PageHeading, Toggle } from "../components";
import type { BotSettings } from "../../shared/contracts";
export function AssistantPage() {
  const { data, mutate, generate, toast, demo } = useStore();
  const [settings, setSettings] = useState({ ...data.settings });
  const [tab, setTab] = useState("Personality");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<
    { role: string; text: string; source?: string }[]
  >([]);
  const changed = JSON.stringify(settings) !== JSON.stringify(data.settings);
  const field = <K extends keyof BotSettings>(key: K, value: BotSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));
  async function save() {
    setSaving(true);
    try {
      await mutate("/settings", "PUT", settings);
      toast("Your assistant settings are saved.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function test(message: string) {
    if (!message.trim() || busy) return;
    setInput("");
    setHistory((h) => [...h, { role: "user", text: message }]);
    setBusy(true);
    try {
      const result = await generate("test", message);
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: result.text,
          source: result.requires_human ? "Human handoff" : result.source,
        },
      ]);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="A helping hand. In your voice."
        description="Make your assistant feel like a natural part of your team."
      >
        <Badge color={settings.enabled ? "green" : "gray"} dot>
          {settings.enabled ? "Assistant active" : "Assistant paused"}
        </Badge>
        <Button busy={saving} onClick={() => void save()} disabled={!changed}>
          <Check size={16} /> Save changes
        </Button>
      </PageHeading>
      <div className="assistant-layout">
        <section className="card assistant-settings">
          <div className="assistant-profile">
            <div className="big-bot">
              <Bot size={31} />
              <span className="live-dot" />
            </div>
            <div>
              <h2>{settings.bot_name}</h2>
              <p>Your always-thoughtful business assistant</p>
            </div>
            <Toggle
              checked={settings.enabled}
              onChange={(v) => field("enabled", v)}
              label="Enable AI assistant"
            />
          </div>
          <div className="tabs">
            {["Personality", "Guardrails", "Business hours"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={tab === t ? "selected" : ""}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="settings-form">
            {tab === "Personality" && (
              <>
                <div className="form-section-heading">
                  <h3>Let your personality shine</h3>
                  <p>
                    A familiar voice makes every conversation feel more human.
                  </p>
                </div>
                <label>
                  Assistant name
                  <input
                    value={settings.bot_name}
                    onChange={(e) => field("bot_name", e.target.value)}
                    maxLength={80}
                  />
                </label>
                <div className="field-grid">
                  <label>
                    Language
                    <select
                      value={settings.language}
                      onChange={(e) =>
                        field(
                          "language",
                          e.target.value as BotSettings["language"],
                        )
                      }
                    >
                      {["English", "Filipino", "Taglish"].map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Response style
                    <select
                      value={settings.response_style}
                      onChange={(e) =>
                        field(
                          "response_style",
                          e.target.value as BotSettings["response_style"],
                        )
                      }
                    >
                      <option>Concise</option>
                      <option>Detailed</option>
                    </select>
                  </label>
                </div>
                <label>Tone of voice</label>
                <div className="tone-grid">
                  {[
                    {
                      name: "Friendly",
                      icon: "☀",
                      desc: "Warm and approachable",
                    },
                    {
                      name: "Professional",
                      icon: "◇",
                      desc: "Polished and helpful",
                    },
                    {
                      name: "Casual",
                      icon: "☺",
                      desc: "Relaxed and easygoing",
                    },
                    { name: "Formal", icon: "▧", desc: "Clear and respectful" },
                  ].map((t) => (
                    <button
                      className={`tone-card ${settings.tone === t.name ? "selected" : ""}`}
                      key={t.name}
                      onClick={() =>
                        field("tone", t.name as BotSettings["tone"])
                      }
                    >
                      <span>{t.icon}</span>
                      <strong>{t.name}</strong>
                      <small>{t.desc}</small>
                      {settings.tone === t.name && <Check size={13} />}
                    </button>
                  ))}
                </div>
                <label>
                  Welcome message
                  <textarea
                    value={settings.welcome}
                    onChange={(e) => field("welcome", e.target.value)}
                    rows={3}
                  />
                </label>
                <label>
                  A little extra direction{" "}
                  <span className="optional">Optional</span>
                  <textarea
                    value={settings.custom_instructions}
                    onChange={(e) =>
                      field("custom_instructions", e.target.value)
                    }
                    rows={3}
                    placeholder="For example: Keep replies warm and concise. Ask one question at a time."
                  />
                </label>
                <div className="info-callout">
                  <ShieldCheck size={17} />
                  <p>
                    Customer answers use your verified business facts.
                    Personality guides reviewed drafts; factual replies preserve
                    your approved wording.
                  </p>
                </div>
              </>
            )}
            {tab === "Guardrails" && (
              <>
                <div className="form-section-heading">
                  <h3>Helpful, with healthy boundaries</h3>
                  <p>
                    Your team steps in whenever a conversation needs a human.
                  </p>
                </div>
                <div className="guardrail">
                  <ShieldCheck />
                  <div>
                    <strong>Verified knowledge only</strong>
                    <p>
                      Answers are assembled from facts you’ve approved. Unknown
                      information goes to your team.
                    </p>
                  </div>
                  <Badge color="green">Always on</Badge>
                </div>
                <div className="guardrail">
                  <MessageCircle />
                  <div>
                    <strong>People come first</strong>
                    <p>
                      Human requests, disputes, and sensitive issues pause
                      automatic replies.
                    </p>
                  </div>
                  <Badge color="green">Always on</Badge>
                </div>
                <label>
                  Additional handoff keywords
                  <input
                    value={settings.handoff_keywords.join(", ")}
                    onChange={(e) =>
                      field(
                        "handoff_keywords",
                        e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="urgent, custom order, event booking"
                  />
                  <small>Separate keywords with commas.</small>
                </label>
                <label>
                  Fallback message
                  <textarea
                    rows={4}
                    value={settings.fallback}
                    onChange={(e) => field("fallback", e.target.value)}
                  />
                  <small>
                    Used if AI is unavailable or a usage limit is reached. Leave
                    blank to hand off.
                  </small>
                </label>
                <div className="field-grid">
                  <label>
                    Requests per minute
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={settings.requests_per_minute}
                      onChange={(e) =>
                        field("requests_per_minute", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    Requests per day
                    <input
                      type="number"
                      min={1}
                      value={settings.requests_per_day}
                      onChange={(e) =>
                        field("requests_per_day", Number(e.target.value))
                      }
                    />
                  </label>
                </div>
                <label>
                  Monthly token budget
                  <input
                    type="number"
                    min={1000}
                    value={settings.monthly_token_limit}
                    onChange={(e) =>
                      field("monthly_token_limit", Number(e.target.value))
                    }
                  />
                </label>
              </>
            )}
            {tab === "Business hours" && (
              <>
                <div className="form-section-heading">
                  <h3>Here when you need it</h3>
                  <p>Set a clear expectation when your team is away.</p>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Use business hours</strong>
                    <p>Send your away message outside these hours.</p>
                  </div>
                  <Toggle
                    checked={settings.business_hours_enabled}
                    onChange={(v) => field("business_hours_enabled", v)}
                    label="Use business hours"
                  />
                </div>
                <label>
                  Timezone
                  <input
                    value={settings.timezone}
                    onChange={(e) => field("timezone", e.target.value)}
                    placeholder="Asia/Manila"
                  />
                </label>
                <div className="field-grid">
                  <label>
                    Opening hour
                    <select
                      value={settings.open_hour}
                      onChange={(e) =>
                        field("open_hour", Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Closing hour
                    <select
                      value={settings.close_hour}
                      onChange={(e) =>
                        field("close_hour", Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>Open days</label>
                <div className="days-picker">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d, i) => (
                      <button
                        key={d}
                        className={
                          settings.open_days.includes(i) ? "selected" : ""
                        }
                        onClick={() =>
                          field(
                            "open_days",
                            settings.open_days.includes(i)
                              ? settings.open_days.filter((n) => n !== i)
                              : [...settings.open_days, i],
                          )
                        }
                      >
                        {d}
                      </button>
                    ),
                  )}
                </div>
                <label>
                  Away message
                  <textarea
                    value={settings.outside_hours_message}
                    onChange={(e) =>
                      field("outside_hours_message", e.target.value)
                    }
                    rows={4}
                  />
                </label>
              </>
            )}
          </div>
        </section>
        <section className="card test-lab">
          <div className="card-heading">
            <div>
              <h2>
                <FlaskConical size={17} /> Give it a little test
              </h2>
              <p>Try a conversation before your customers do.</p>
            </div>
            <button
              className="icon-button"
              aria-label="Reset test chat"
              onClick={() => setHistory([])}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="test-banner">
            <ShieldCheck size={13} />
            {demo
              ? "Sample responses · no OpenAI calls"
              : "Test session · no messages sent to customers"}
          </div>
          <div className="test-history">
            {!history.length ? (
              <div className="test-welcome">
                <div className="test-bot">
                  <Sparkles size={27} />
                </div>
                <h3>
                  A good conversation starts
                  <br />
                  with a simple hello.
                </h3>
                <p>
                  Ask a question your customers might ask.
                  <br />
                  We’ll use your saved business knowledge.
                </p>
                <div className="suggested-prompts">
                  {[
                    "What do you offer?",
                    "Do you deliver to Makati?",
                    "Can I speak to a human?",
                  ].map((p) => (
                    <button key={p} onClick={() => void test(p)}>
                      {p}
                      <Send size={12} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              history.map((m, i) => (
                <div className={`test-message ${m.role}`} key={i}>
                  {m.role === "assistant" && (
                    <span className="mini-bot">
                      <Sparkles size={13} />
                    </span>
                  )}
                  <div>
                    <p>{m.text}</p>
                    {m.source && <small>{m.source}</small>}
                  </div>
                </div>
              ))
            )}
            {busy && (
              <div className="typing-indicator">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>
          <form
            className="test-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void test(input);
            }}
          >
            <input
              aria-label="Test message"
              placeholder="Ask your assistant something…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={4000}
            />
            <button
              type="submit"
              aria-label="Send test message"
              disabled={busy || !input.trim()}
            >
              <Send size={17} />
            </button>
          </form>
          <div className="test-footnote">
            {changed
              ? "Save your changes to test the updated settings."
              : "A safe space to get your assistant just right."}
          </div>
        </section>
      </div>
    </>
  );
}
