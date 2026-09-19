import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  Clock3,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useStore } from "../store";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  PlatformIcon,
  relativeTime,
} from "../components";
import type { Message } from "../../shared/contracts";
export function InboxPage({ initialId }: { initialId?: string }) {
  const { data, messages, mutate, toast, generate, demo } = useStore();
  const [selected, setSelected] = useState(
    initialId ?? data.conversations[0]?.id,
  );
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);
  const c = data.conversations.find((c) => c.id === selected);
  const list = data.conversations.filter(
    (c) =>
      (filter === "All" ||
        (filter === "Needs you" && c.status === "human") ||
        (filter === "Resolved" && c.status === "resolved")) &&
      (c.customer_name + " " + c.last_message)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  useEffect(() => {
    if (initialId) setSelected(initialId);
  }, [initialId]);
  useEffect(() => {
    let cancelled = false;
    if (selected)
      void messages(selected)
        .then((m) => {
          if (!cancelled) setHistory(m);
        })
        .catch((e) => toast(e.message));
    return () => {
      cancelled = true;
    };
  }, [selected, messages, toast]);
  async function update(status: "open" | "human" | "resolved") {
    if (!c) return;
    try {
      await mutate(`/conversations/${c.id}`, "PATCH", { status });
      toast(
        status === "resolved"
          ? "Conversation resolved"
          : status === "human"
            ? "You’re in control. Automatic replies are paused."
            : "Assistant resumed",
      );
    } catch (e) {
      toast((e as Error).message);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!c || !text.trim()) return;
    setBusy(true);
    try {
      await mutate(`/conversations/${c.id}/messages`, "POST", {
        text,
        requestId: crypto.randomUUID(),
      });
      setText("");
      setHistory(await messages(c.id));
      toast(demo ? "Reply saved in the demo" : "Reply queued for delivery");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="inbox-heading">
        <div>
          <h1>Every conversation. One place.</h1>
          <p>A thoughtful reply is always within reach.</p>
        </div>
        <Badge color="green" dot>
          {data.accounts.filter((a) => a.connected).length} channels connected
        </Badge>
      </div>
      <div className={`inbox-layout ${mobileThread ? "show-thread" : ""}`}>
        <section className="thread-list">
          <div className="thread-list-heading">
            <h2>
              Inbox <span>{data.conversations.length}</span>
            </h2>
            <ChevronDown size={15} />
          </div>
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search conversations"
              placeholder="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="tabs small-tabs">
            {["All", "Needs you", "Resolved"].map((t) => (
              <button
                key={t}
                className={t === filter ? "selected" : ""}
                onClick={() => setFilter(t)}
              >
                {t}
                {t === "Needs you" && (
                  <span>
                    {
                      data.conversations.filter((c) => c.status === "human")
                        .length
                    }
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="thread-scroll">
            {list.map((item, i) => (
              <button
                className={`thread-item ${selected === item.id ? "selected" : ""}`}
                key={item.id}
                onClick={() => {
                  setSelected(item.id);
                  setMobileThread(true);
                }}
              >
                <div className="avatar-with-platform">
                  <Avatar name={item.customer_name} index={i} />
                  <PlatformIcon platform={item.platform} size={10} />
                </div>
                <div>
                  <div className="thread-item-top">
                    <strong>{item.customer_name}</strong>
                    <small>
                      {relativeTime(item.updated_at).replace(" ago", "")}
                    </small>
                  </div>
                  <p>{item.last_message}</p>
                  <span className={`thread-status ${item.status}`}>
                    {item.status === "human" ? (
                      <UserRound size={10} />
                    ) : (
                      <Sparkles size={10} />
                    )}{" "}
                    {item.status === "human"
                      ? "Needs you"
                      : item.status === "resolved"
                        ? "Resolved"
                        : "AI handling"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
        {c ? (
          <section className="conversation-panel">
            <header className="conversation-header">
              <button
                className="icon-button thread-back"
                aria-label="Back to conversations"
                onClick={() => setMobileThread(false)}
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar name={c.customer_name} />
              <div>
                <h2>{c.customer_name}</h2>
                <span>
                  <PlatformIcon platform={c.platform} size={11} />
                  {c.platform === "instagram"
                    ? "Instagram Direct"
                    : "Facebook Messenger"}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  void update(c.status === "resolved" ? "open" : "resolved")
                }
              >
                <CheckCheck size={15} />
                {c.status === "resolved" ? "Reopen" : "Resolve"}
              </Button>
            </header>
            <div
              className={`conversation-state ${c.status === "human" ? "human" : ""}`}
            >
              <span>
                {c.status === "human" ? (
                  <UserRound size={14} />
                ) : (
                  <Sparkles size={14} />
                )}{" "}
                {c.status === "human"
                  ? "Your team is handling this conversation."
                  : c.status === "resolved"
                    ? "This conversation is resolved."
                    : `${data.settings.bot_name} is here to help.`}
              </span>
              <button
                onClick={() =>
                  void update(c.status === "human" ? "open" : "human")
                }
              >
                {c.status === "human" ? "Resume AI" : "Take over"}{" "}
                <ArrowLeft size={12} className="rotate-arrow" />
              </button>
            </div>
            <div className="message-history">
              <div className="message-date">Today</div>
              {history.map((m) =>
                m.direction === "note" ? (
                  <div className="internal-note" key={m.id}>
                    Internal note: {m.text}
                  </div>
                ) : (
                  <div className={`message-row ${m.direction}`} key={m.id}>
                    {m.direction === "inbound" && (
                      <Avatar name={c.customer_name} small />
                    )}
                    <div>
                      <div className="message-bubble">{m.text}</div>
                      <div className="message-meta">
                        {m.direction === "outbound" && (
                          <>
                            <Sparkles size={10} />
                            {m.source === "ai"
                              ? "AI assistant"
                              : m.source === "human"
                                ? "You"
                                : "Automation"}{" "}
                            ·{" "}
                          </>
                        )}
                        {new Date(m.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {m.direction === "outbound" && (
                          <span> · {m.delivery_status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
            <form className="composer" onSubmit={(e) => void send(e)}>
              <textarea
                aria-label="Write a reply"
                placeholder="A little thoughtfulness goes a long way. Write a reply…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1900}
              />
              <div>
                <span>
                  <ShieldCheck size={13} />
                  {demo
                    ? "Demo reply · no customer messages sent"
                    : "Replying will pause automatic AI responses"}
                </span>
                <Button type="submit" busy={busy} disabled={!text.trim()}>
                  Send reply <Send size={14} />
                </Button>
              </div>
            </form>
          </section>
        ) : (
          <Empty
            title="A new conversation starts here"
            description="Connect a channel to receive your first customer message."
          />
        )}
        {c && (
          <aside className="customer-details">
            <Avatar name={c.customer_name} />
            <h3>{c.customer_name}</h3>
            <span className="muted">Customer</span>
            <div className="detail-divider" />
            <h4>CONVERSATION DETAILS</h4>
            <dl>
              <dt>Channel</dt>
              <dd>
                <PlatformIcon platform={c.platform} />
                {c.platform}
              </dd>
              <dt>Status</dt>
              <dd>
                <Badge color={c.status === "human" ? "orange" : "purple"}>
                  {c.status === "human" ? "Needs you" : c.status}
                </Badge>
              </dd>
              <dt>Assigned to</dt>
              <dd>
                <select
                  aria-label="Assign conversation"
                  value={c.assigned_to ?? ""}
                  onChange={(e) =>
                    void mutate(`/conversations/${c.id}`, "PATCH", {
                      assigned_to: e.target.value || null,
                    }).catch((e) => toast(e.message))
                  }
                >
                  <option value="">Unassigned</option>
                  {data.members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </dd>
              <dt>First message</dt>
              <dd>{new Date(c.created_at).toLocaleDateString()}</dd>
            </dl>
            <div className="customer-tip">
              <Clock3 size={17} />
              <p>
                Keep it personal.
                <br />A real person is on the other side of every message.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const result = await generate(
                    "summarize",
                    "Summarize this conversation for our team.",
                    c.id,
                  );
                  toast(result.text);
                } catch (e) {
                  toast((e as Error).message);
                }
              }}
            >
              <MessageCircle size={15} /> Summarize thread
            </Button>
          </aside>
        )}
      </div>
    </>
  );
}
