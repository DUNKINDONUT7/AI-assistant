import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Inbox,
  MessageCircle,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { useStore } from "../store";
import {
  Avatar,
  Badge,
  Button,
  PageHeading,
  PlatformIcon,
  relativeTime,
  Select,
} from "../components";
import type { Page } from "../App";
export function Overview({
  navigate,
  openConversation,
}: {
  navigate: (p: Page) => void;
  openConversation: (id: string) => void;
}) {
  const { data } = useStore();
  const [range, setRange] = useState("Last 7 days");
  const [channel, setChannel] = useState("All channels");
  const waiting = data.conversations.filter((c) => c.status === "human").length;
  const periodStart =
    Date.now() -
    (range === "Today" ? 1 : range === "Last 30 days" ? 30 : 7) * 86400000;
  const periodConversations = data.conversations.filter(
    (c) => new Date(c.created_at).getTime() >= periodStart,
  );
  const periodUsage = data.usage.filter(
    (u) => new Date(u.created_at).getTime() >= periodStart && !u.is_test,
  );
  const total = periodConversations.length;
  const stats = [
    {
      title: "Total conversations",
      value: total.toLocaleString(),
      caption: "in the selected period",
      icon: MessageCircle,
      color: "purple",
      spark: [] as number[],
    },
    {
      title: "Successful AI requests",
      value: periodUsage.length
        ? Math.round(
            (periodUsage.filter((u) => u.request_status === "completed")
              .length /
              periodUsage.length) *
              100,
          ) + "%"
        : "N/A",
      caption: "actual provider requests",
      icon: Sparkles,
      color: "mint",
      spark: [] as number[],
    },
    {
      title: "Avg. AI response time",
      value: periodUsage.length
        ? (
            periodUsage.reduce((n, u) => n + u.latency_ms, 0) /
            periodUsage.length /
            1000
          ).toFixed(1) + "s"
        : "N/A",
      caption: "measured provider latency",
      icon: Clock3,
      color: "peach",
      spark: [] as number[],
    },
    {
      title: "Need a human touch",
      value: String(waiting).padStart(2, "0"),
      caption: "Your team can take it from here",
      icon: Inbox,
      color: "rose",
      spark: null,
    },
  ];
  const recent = data.conversations
    .filter(
      (c) => channel === "All channels" || c.platform === channel.toLowerCase(),
    )
    .slice(0, 4);
  return (
    <>
      <PageHeading
        title="A good day to connect."
        description="Here’s what’s happening with your business today."
      >
        <span className="date-button">
          <CalendarDays size={15} />
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <Button onClick={() => navigate("channels")}>
          <Plus size={16} /> Connect a channel
        </Button>
      </PageHeading>
      <div className="hero-banner">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span className="live-dot" /> YOUR BUSINESS, A LITTLE MORE CONNECTED
          </span>
          <h2>
            More conversations.
            <br />
            Less busywork.
          </h2>
          <p>
            Your AI assistant takes care of the everyday questions,
            <br className="desktop-break" /> so you can focus on the moments
            that matter.
          </p>
          <button onClick={() => navigate("assistant")}>
            Meet your assistant <ArrowRight size={15} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-card question-card">
            <span className="tiny-avatar">S</span>
            <span>
              Your channels, connected. <span>👋</span>
            </span>
          </div>
          <div className="assistant-orb">
            <Sparkles size={47} strokeWidth={1.3} />
            <span className="orb-badge">
              <Check size={13} />
            </span>
          </div>
          <div className="floating-card answer-card">
            <span className="mini-bot">
              <Sparkles size={14} />
            </span>
            <span>
              Your knowledge. Your voice.
              <small>
                <span className="live-dot" /> A little help for your everyday
              </small>
            </span>
          </div>
          <span className="art-star star-one">✧</span>
          <span className="art-star star-two">✦</span>
          <span className="art-dot" />
        </div>
      </div>
      <div className="section-heading">
        <h2>
          Your business at a glance{" "}
          <span className="muted-label">Recent activity</span>
        </h2>
        <Select
          value={range}
          onChange={setRange}
          options={["Last 7 days", "Last 30 days", "Today"]}
          label="Reporting period"
        />
      </div>
      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.title}>
            <div className="stat-top">
              <span>{stat.title}</span>
              <span className={`stat-icon ${stat.color}`}>
                <stat.icon size={17} />
              </span>
            </div>
            <div className="stat-middle">
              <strong>{stat.value}</strong>
              {stat.spark?.length ? (
                <svg
                  viewBox="0 0 115 55"
                  className={`sparkline ${stat.color}`}
                  aria-hidden="true"
                >
                  <path
                    d={`M ${stat.spark.map((n, i) => `${i * 10},${55 - n * 0.5}`).join(" L ")}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className="mini-avatars">
                  {data.conversations
                    .filter((c) => c.status === "human")
                    .slice(0, 2)
                    .map((c, i) => (
                      <Avatar
                        key={c.id}
                        name={c.customer_name}
                        index={i}
                        small
                      />
                    ))}
                </span>
              )}
            </div>
            <div className="stat-bottom">
              <span>{stat.caption}</span>
              {!stat.spark && (
                <button
                  onClick={() => navigate("inbox")}
                  aria-label="Open inbox"
                >
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-middle">
        <section className="card chart-card">
          <div className="card-heading">
            <div>
              <h2>Conversation activity</h2>
              <p>A little look at the connections you’re making.</p>
            </div>
            <button className="text-link" onClick={() => navigate("analytics")}>
              View report <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-purple" />
              Facebook
            </span>
            <span>
              <i className="legend-lilac" />
              Instagram
            </span>
          </div>
          <ActivityChart
            days={range === "Today" ? 1 : range === "Last 30 days" ? 30 : 7}
          />
        </section>
        <section className="card assistant-card">
          <div className="card-heading">
            <h2>Your AI, at work</h2>
            <Badge color={data.settings.enabled ? "green" : "gray"} dot>
              {data.settings.enabled ? "Active" : "Paused"}
            </Badge>
          </div>
          <div className="assistant-score">
            <div className="score-orbit">
              <Sparkles size={27} />
            </div>
            <div>
              <strong>{data.settings.bot_name}</strong>
              <p>One helpful conversation at a time.</p>
            </div>
          </div>
          <div className="ai-work-stat">
            <span>AI replies</span>
            <strong>
              {
                periodUsage.filter((u) => u.request_status === "completed")
                  .length
              }
              <span className="subtle-unit"> this period</span>
            </strong>
          </div>
          <div className="ai-work-stat">
            <span>Estimated AI cost</span>
            <strong>
              $
              {periodUsage
                .reduce((n, u) => n + (u.estimated_cost ?? 0), 0)
                .toFixed(4)}
            </strong>
          </div>
          <div className="ai-work-stat">
            <span>Knowledge sources</span>
            <strong>
              {data.knowledge.filter((k) => k.verified).length}{" "}
              <span className="source-check">
                <Check size={10} /> verified
              </span>
            </strong>
          </div>
          <div className="ai-tip">
            <span>✧</span>
            <p>
              A little knowledge goes a long way.
              <br />
              <button onClick={() => navigate("knowledge")}>
                Keep your business info up to date.
              </button>
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate("assistant")}>
            <Bot size={16} /> Manage assistant <ArrowRight size={14} />
          </Button>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="card conversations-card">
          <div className="card-heading">
            <div>
              <h2>Latest conversations</h2>
              <p>Every message is the start of something.</p>
            </div>
            <button className="text-link" onClick={() => navigate("inbox")}>
              Open inbox <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="conversation-table-head">
            <span>Customer</span>
            <span>Latest message</span>
            <span>Status</span>
            <Select
              value={channel}
              onChange={setChannel}
              options={["All channels", "Facebook", "Instagram"]}
              label="Filter conversation channel"
            />
          </div>
          {recent.length ? (
            recent.map((c, i) => (
              <button
                key={c.id}
                className="conversation-table-row"
                onClick={() => openConversation(c.id)}
              >
                <div className="customer-cell">
                  <div className="avatar-with-platform">
                    <Avatar name={c.customer_name} index={i} />
                    <PlatformIcon platform={c.platform} size={10} />
                  </div>
                  <span>
                    <strong>{c.customer_name}</strong>
                    <small>
                      {c.platform === "instagram" ? "Instagram" : "Messenger"}
                    </small>
                  </span>
                </div>
                <span className="message-preview">{c.last_message}</span>
                <Badge
                  color={
                    c.status === "human"
                      ? "orange"
                      : c.status === "resolved"
                        ? "gray"
                        : "purple"
                  }
                >
                  {c.status === "human"
                    ? "Needs you"
                    : c.status === "resolved"
                      ? "Resolved"
                      : "AI handling"}
                </Badge>
                <span className="table-time">
                  {relativeTime(c.updated_at)}
                  <ChevronRight size={13} />
                </span>
              </button>
            ))
          ) : (
            <div className="inline-empty">
              Your customer conversations will appear here.
            </div>
          )}
        </section>
        <section className="card quick-actions">
          <div className="card-heading">
            <h2>Make room for more</h2>
            <span className="little-spark">✧</span>
          </div>
          <p>Small steps. A smoother day.</p>
          {[
            {
              title: "Build an automation",
              desc: "Give repetitive questions a shortcut",
              icon: Zap,
              color: "peach",
              page: "automations",
            },
            {
              title: "Create something worth sharing",
              desc: "Let AI help with your next post",
              icon: Sparkles,
              color: "purple",
              page: "content",
            },
            {
              title: "Grow your knowledge base",
              desc: "A smarter assistant starts here",
              icon: Plus,
              color: "mint",
              page: "knowledge",
            },
          ].map((a) => (
            <button key={a.page} onClick={() => navigate(a.page as Page)}>
              <span className={`action-icon ${a.color}`}>
                <a.icon size={18} />
              </span>
              <span>
                <strong>{a.title}</strong>
                <small>{a.desc}</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </section>
      </div>
    </>
  );
}
export function ActivityChart({ days = 7 }: { days?: number }) {
  const { data } = useStore();
  const count = days === 1 ? 8 : 7;
  const now = new Date();
  const span = days === 1 ? 3 * 3600000 : Math.ceil(days / 7) * 86400000;
  const end =
    days === 1
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        ).getTime();
  const buckets = Array.from({ length: count }, (_, i) => {
    const start = end - (count - i) * span;
    return {
      start,
      end: start + span,
      label:
        days === 1
          ? new Date(start).toLocaleTimeString("en-US", { hour: "numeric" })
          : new Date(start).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
    };
  });
  const series = (platform: string) =>
    buckets.map(
      (b) =>
        data.conversations.filter(
          (c) =>
            c.platform === platform &&
            new Date(c.created_at).getTime() >= b.start &&
            new Date(c.created_at).getTime() < b.end,
        ).length,
    );
  const fb = series("facebook"),
    ig = series("instagram");
  const max = Math.max(4, ...fb, ...ig);
  const y = (n: number) => 205 - (n / max) * 170;
  const path = (values: number[]) =>
    values
      .map(
        (n, i) =>
          (i === 0 ? "M" : "L") +
          " " +
          (50 + i * (552 / (count - 1))) +
          "," +
          y(n),
      )
      .join(" ");
  return (
    <div className="activity-chart">
      <svg
        viewBox="0 0 640 250"
        role="img"
        aria-label="Conversation counts from your workspace"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#be7392" stopOpacity=".15" />
            <stop offset="100%" stopColor="#be7392" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((n) => (
          <g key={n}>
            <text x="7" y={y((n * max) / 4) + 4} className="axis-text">
              {Math.round((n * max) / 4)}
            </text>
            <line
              x1="45"
              x2="617"
              y1={y((n * max) / 4)}
              y2={y((n * max) / 4)}
              stroke="#eee3e9"
              strokeDasharray="3 4"
            />
          </g>
        ))}
        <path d={path(fb) + " L 602,205 L 50,205 Z"} fill="url(#chart-fill)" />
        <path
          d={path(fb)}
          fill="none"
          stroke="#a74c70"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path(ig)}
          fill="none"
          stroke="#d39ab3"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {buckets.map((b, i) => (
          <text
            key={b.start}
            x={50 + i * (552 / (count - 1))}
            y="236"
            textAnchor="middle"
            className="axis-text"
          >
            {b.label}
          </text>
        ))}
      </svg>
      {!data.conversations.length && (
        <div className="chart-no-data">
          Your first customer conversation starts the story.
        </div>
      )}
    </div>
  );
}
