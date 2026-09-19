import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  Flower2,
  Inbox,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
  Zap,
  CalendarDays,
} from "lucide-react";
import { useStore } from "./store";
import { supabase } from "./api";
import { Avatar, Badge, Button, Modal } from "./components";
import { AuthScreen } from "./AuthScreen";
import { Overview } from "./pages/Overview";
import { InboxPage } from "./pages/Inbox";
import { AssistantPage } from "./pages/Assistant";
import {
  AutomationsPage,
  KnowledgePage,
  ContentPage,
  ChannelsPage,
  TeamPage,
  SettingsPage,
  AnalyticsPage,
} from "./pages/Workspace";
export type Page =
  | "overview"
  | "inbox"
  | "assistant"
  | "automations"
  | "content"
  | "analytics"
  | "knowledge"
  | "channels"
  | "team"
  | "settings";
const groups = [
  {
    label: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "inbox", label: "Unified inbox", icon: Inbox },
      { id: "assistant", label: "AI assistant", icon: Bot },
      { id: "automations", label: "Automations", icon: Zap },
      { id: "content", label: "Content planner", icon: CalendarDays },
      { id: "analytics", label: "Analytics", icon: Activity },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { id: "knowledge", label: "Business knowledge", icon: BookOpen },
      { id: "channels", label: "Connected channels", icon: Link2 },
      { id: "team", label: "Team members", icon: Users },
      { id: "settings", label: "Settings", icon: Settings2 },
    ],
  },
];
const titles = Object.fromEntries(
  groups.flatMap((g) => g.items.map((i) => [i.id, i.label])),
);
export default function App() {
  const { data, demo, loading, error, mutate } = useStore();
  const [page, setPage] = useState<Page>(
    location.hash.slice(1) in titles
      ? (location.hash.slice(1) as Page)
      : "overview",
  );
  const [mobile, setMobile] = useState(false);
  const [dialog, setDialog] = useState<
    "search" | "notifications" | "help" | null
  >(null);
  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<
    string | undefined
  >();
  const navigate = (next: Page) => {
    setPage(next);
    location.hash = next;
    setMobile(false);
  };
  useEffect(() => {
    function hash() {
      const next = location.hash.slice(1);
      if (next in titles) setPage(next as Page);
    }
    function keyboard(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setDialog("search");
      }
    }
    window.addEventListener("hashchange", hash);
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("keydown", keyboard);
    };
  }, []);
  const unread = data.notifications.filter((n) => !n.read).length;
  const openConversation = (id: string) => {
    setSelectedConversation(id);
    navigate("inbox");
    setDialog(null);
  };
  if (!demo && error) return <AuthScreen />;
  return (
    <div className="app-shell">
      {mobile && (
        <div className="sidebar-shade" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#overview"
          onClick={() => navigate("overview")}
        >
          <span className="brand-mark">
            r<span />
          </span>
          relay<span className="brand-dot">.</span>
        </a>
        <button
          className="workspace-picker"
          onClick={() => navigate("settings")}
        >
          <span className="workspace-logo">
            <Flower2 size={23} />
          </span>
          <span>
            <strong>{data.organization.name}</strong>
            <small>Business workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav>
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id as Page)}
                >
                  <item.icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  {item.id === "inbox" && (
                    <span className="nav-count">
                      {
                        data.conversations.filter(
                          (c) => c.status !== "resolved",
                        ).length
                      }
                    </span>
                  )}
                  {item.id === "assistant" && (
                    <span className="nav-new">AI</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <span className="plan-star">
              <Sparkles size={16} />
            </span>
            <strong>A little help. A lot of possibility.</strong>
            <p>Put your everyday conversations on autopilot.</p>
            <button onClick={() => navigate("assistant")}>
              Meet your AI assistant <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="help-link" onClick={() => setDialog("help")}>
            <CircleHelp size={18} /> Help & getting started{" "}
            <ArrowUpRight size={14} />
          </button>
          <button className="profile" onClick={() => navigate("team")}>
            <Avatar name={data.members[0]?.display_name ?? "Your team"} small />
            <span>
              <strong>{data.members[0]?.display_name ?? "Your team"}</strong>
              <small>{demo ? "Demo workspace" : "Workspace member"}</small>
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{titles[page] ?? "Overview"}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              aria-label="Search workspace"
              onClick={() => setDialog("search")}
            >
              <Search size={16} />
              <span>Search anything...</span>
              <kbd>
                <Command size={10} /> K
              </kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button notification-button"
              onClick={() => setDialog("notifications")}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
            <Avatar name={data.members[0]?.display_name ?? "Your team"} small />
          </div>
        </header>
        <main
          className={`main-content ${page === "inbox" ? "inbox-content" : ""}`}
        >
          {demo && (
            <div className="demo-strip">
              <span>
                <span className="demo-dot" /> Demo workspace{" "}
                <span className="demo-caption">
                  Explore freely. All conversations and activity are sample
                  data.
                </span>
              </span>
              <button onClick={() => navigate("channels")}>
                Connect your business <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <Sparkles className="spin" /> Loading your workspace…
            </div>
          ) : (
            <>
              {page === "overview" && (
                <Overview
                  navigate={navigate}
                  openConversation={openConversation}
                />
              )}{" "}
              {page === "inbox" && (
                <InboxPage initialId={selectedConversation} />
              )}{" "}
              {page === "assistant" && <AssistantPage />}
              {page === "automations" && <AutomationsPage />}
              {page === "content" && <ContentPage />}
              {page === "analytics" && <AnalyticsPage />}
              {page === "knowledge" && <KnowledgePage />}
              {page === "channels" && <ChannelsPage />}
              {page === "team" && <TeamPage />}
              {page === "settings" && <SettingsPage />}
            </>
          )}
        </main>
        <footer className="footer">
          <span>
            <span className="live-dot" />
            {demo
              ? "Preview mode · sample data"
              : "Your workspace is connected"}
          </span>
          <span>
            Made for meaningful connections{" "}
            <span className="footer-flower">✳</span>
          </span>
        </footer>
      </div>
      {dialog === "search" && (
        <Modal
          title="Find something in your workspace"
          onClose={() => setDialog(null)}
        >
          <div className="search-input">
            <Search size={18} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages, people, and conversations…"
            />
          </div>
          <div className="search-results">
            {groups
              .flatMap((g) => g.items)
              .filter((i) =>
                i.label.toLowerCase().includes(search.toLowerCase()),
              )
              .map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    navigate(i.id as Page);
                    setDialog(null);
                  }}
                >
                  <i.icon size={17} />
                  {i.label}
                  <ChevronRight size={14} />
                </button>
              ))}
            {search &&
              data.conversations
                .filter((c) =>
                  c.customer_name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((c) => (
                  <button key={c.id} onClick={() => openConversation(c.id)}>
                    <MessageCircle size={17} />
                    {c.customer_name}
                    <ChevronRight size={14} />
                  </button>
                ))}
          </div>
        </Modal>
      )}
      {dialog === "notifications" && (
        <Modal title="Your notifications" onClose={() => setDialog(null)}>
          {data.notifications.length ? (
            data.notifications.map((n) => (
              <div className="notification-row" key={n.id}>
                <span className="notification-symbol">
                  <Bell size={18} />
                </span>
                <div>
                  <p>{n.message}</p>
                  {!n.read && <Badge color="purple">New</Badge>}
                </div>
                <button
                  className="icon-button"
                  aria-label="Mark as read"
                  onClick={() =>
                    void mutate(`/notifications/${n.id}`, "PATCH", {
                      read: true,
                    })
                  }
                >
                  <X size={15} />
                </button>
                {n.conversation_id && (
                  <Button
                    variant="ghost"
                    onClick={() => openConversation(n.conversation_id!)}
                  >
                    Open
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="muted">You’re all caught up.</p>
          )}
        </Modal>
      )}
      {dialog === "help" && (
        <Modal title="A good place to start" onClose={() => setDialog(null)}>
          <div className="help-intro">
            <Sparkles size={28} />
            <p>
              Your conversations, content, and team. All in one thoughtful
              workspace.
            </p>
          </div>
          {[
            {
              title: "Tell your assistant about your business",
              page: "knowledge",
              description: "Add verified products, prices, policies, and FAQs.",
            },
            {
              title: "Make it sound like you",
              page: "assistant",
              description: "Set your tone and language, then try the test lab.",
            },
            {
              title: "Bring your channels together",
              page: "channels",
              description: "Connect Facebook and Instagram to your inbox.",
            },
          ].map((item, i) => (
            <button
              className="help-step"
              key={item.page}
              onClick={() => {
                navigate(item.page as Page);
                setDialog(null);
              }}
            >
              <span>{i + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <ArrowUpRight size={18} />
            </button>
          ))}
          {!demo && (
            <Button
              variant="ghost"
              onClick={() => void supabase?.auth.signOut()}
            >
              <LogOut size={16} /> Sign out
            </Button>
          )}
        </Modal>
      )}
    </div>
  );
}
