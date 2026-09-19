import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  Facebook,
  FileText,
  Flower2,
  Instagram,
  Link2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useStore } from "../store";
import { request } from "../api";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Modal,
  PageHeading,
  PlatformIcon,
  Toggle,
} from "../components";
import { ActivityChart } from "./Overview";
import type {
  AITask,
  Automation,
  Business,
  Draft,
  Knowledge,
} from "../../shared/contracts";

export function AutomationsPage() {
  const { data, mutate, toast } = useStore();
  const [edit, setEdit] = useState<Automation | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("All automations");
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await mutate(
        `/automations${edit ? `/${edit.id}` : ""}`,
        edit ? "PUT" : "POST",
        {
          name: form.get("name"),
          keywords: String(form.get("keywords"))
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          reply: form.get("reply"),
          priority: Number(form.get("priority")),
          enabled: edit?.enabled ?? true,
        },
      );
      setEdit(undefined);
      toast("Automation saved. A little less busywork.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        title="Make the everyday effortless."
        description="Simple rules for the questions you hear again and again."
      >
        <Button onClick={() => setEdit(null)}>
          <Plus size={16} /> Create automation
        </Button>
      </PageHeading>
      <div className="feature-banner peach-banner">
        <div className="feature-icon">
          <Zap size={28} />
        </div>
        <div>
          <h2>The right reply. Right on cue.</h2>
          <p>
            Automations answer first, so your assistant only steps in when you
            need it.
          </p>
        </div>
        <Badge color="orange">No AI tokens needed</Badge>
      </div>
      <div className="section-heading">
        <div className="tabs">
          {["All automations", "Active", "Paused"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={filter === t ? "selected" : ""}
            >
              {t}
              <span>
                {t === "All automations"
                  ? data.automations.length
                  : data.automations.filter((a) =>
                      t === "Active" ? a.enabled : !a.enabled,
                    ).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="automation-grid">
        {data.automations
          .filter(
            (a) =>
              filter === "All automations" ||
              (filter === "Active" ? a.enabled : !a.enabled),
          )
          .map((a, i) => (
            <section className="card automation-card" key={a.id}>
              <div className="automation-top">
                <span
                  className={`action-icon ${["purple", "peach", "mint", "rose"][i % 4]}`}
                >
                  <Zap size={20} />
                </span>
                <Toggle
                  label={`Enable ${a.name}`}
                  checked={a.enabled}
                  onChange={async (v) => {
                    const {
                      id: _id,
                      organization_id: _org,
                      uses: _uses,
                      ...fields
                    } = a;
                    try {
                      await mutate(`/automations/${a.id}`, "PUT", {
                        ...fields,
                        enabled: v,
                      });
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                />
              </div>
              <h2>{a.name}</h2>
              <p className="muted">When a message includes</p>
              <div className="keyword-chips">
                {a.keywords.map((k) => (
                  <span key={k}>{k}</span>
                ))}
              </div>
              <div className="automation-connection">
                <span />
                <ArrowRight size={13} />
                <small>send a thoughtful reply</small>
              </div>
              <div className="automation-reply">{a.reply}</div>
              <div className="automation-footer">
                <span>
                  <Zap size={12} />
                  {a.uses} times helpful
                </span>
                <button className="text-link" onClick={() => setEdit(a)}>
                  Edit rule <Edit3 size={13} />
                </button>
              </div>
            </section>
          ))}
        <button className="new-automation-card" onClick={() => setEdit(null)}>
          <span>
            <Plus size={24} />
          </span>
          <h3>A little less repetition</h3>
          <p>Create your next helpful shortcut.</p>
        </button>
      </div>
      {edit !== undefined && (
        <Modal
          title={edit ? "Edit automation" : "Create an automation"}
          onClose={() => setEdit(undefined)}
        >
          <form onSubmit={(e) => void save(e)} className="modal-form">
            <label>
              Rule name
              <input
                name="name"
                required
                maxLength={150}
                defaultValue={edit?.name}
                placeholder="A warm first hello"
              />
            </label>
            <label>
              Keywords
              <input
                name="keywords"
                required
                defaultValue={edit?.keywords.join(", ")}
                placeholder="hello, hi, hey"
              />
              <small>
                Comma-separated words or phrases. Exact word matches trigger
                this reply.
              </small>
            </label>
            <label>
              Your approved reply
              <textarea
                name="reply"
                required
                rows={4}
                maxLength={1500}
                defaultValue={edit?.reply}
                placeholder="Hi there! How can we help?"
              />
            </label>
            <label>
              Priority
              <input
                name="priority"
                type="number"
                min={0}
                max={100}
                defaultValue={edit?.priority ?? 50}
              />
              <small>Lower numbers run first.</small>
            </label>
            <div className="modal-actions">
              {edit && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={async () => {
                    try {
                      await mutate(`/automations/${edit.id}`, "DELETE");
                      setEdit(undefined);
                      toast("Automation deleted");
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                >
                  <Trash2 size={15} /> Delete
                </Button>
              )}
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEdit(undefined)}
              >
                Cancel
              </Button>
              <Button type="submit" busy={busy}>
                Save automation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function KnowledgePage() {
  const { data, mutate, toast, generate } = useStore();
  const [edit, setEdit] = useState<Knowledge | null | undefined>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All sources");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await mutate(
        `/knowledge${edit ? `/${edit.id}` : ""}`,
        edit ? "PUT" : "POST",
        {
          title: f.get("title"),
          kind: f.get("kind"),
          content: f.get("content"),
          verified: f.get("verified") === "on",
        },
      );
      setEdit(undefined);
      toast("Business knowledge saved.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Good answers start here."
        description="Give your assistant the knowledge that makes your business yours."
      >
        <Button
          variant="secondary"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await generate(
                "generate-faqs",
                "Suggest FAQs using our verified business information.",
              );
              toast("FAQ suggestions saved to Content planner for review.");
            } catch (e) {
              toast((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Sparkles size={16} /> Suggest FAQs
        </Button>
        <Button onClick={() => setEdit(null)}>
          <Plus size={16} /> Add knowledge
        </Button>
      </PageHeading>
      <div className="knowledge-summary">
        <div className="card knowledge-count">
          <span className="action-icon purple">
            <BookOpen size={23} />
          </span>
          <div>
            <strong>{data.knowledge.length}</strong>
            <span>Knowledge sources</span>
          </div>
        </div>
        <div className="card knowledge-count">
          <span className="action-icon mint">
            <ShieldCheck size={23} />
          </span>
          <div>
            <strong>{data.knowledge.filter((k) => k.verified).length}</strong>
            <span>Verified & ready to use</span>
          </div>
        </div>
        <div className="knowledge-tip">
          <Sparkles size={20} />
          <p>
            Your assistant only uses <strong>verified information.</strong>
            <br />A quick review today means a better answer tomorrow.
          </p>
        </div>
      </div>
      <section className="card">
        <div className="resource-toolbar">
          <div className="tabs">
            {["All sources", "Products", "FAQs", "Policies"].map((t) => (
              <button
                key={t}
                className={filter === t ? "selected" : ""}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="search-input">
            <Search size={15} />
            <input
              aria-label="Search knowledge"
              placeholder="Search knowledge…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="knowledge-list">
          {data.knowledge
            .filter(
              (k) =>
                (filter === "All sources" ||
                  k.kind ===
                    { Products: "product", FAQs: "faq", Policies: "policy" }[
                      filter
                    ]) &&
                (k.title + " " + k.content)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((k, i) => (
              <button
                key={k.id}
                className="knowledge-row"
                onClick={() => setEdit(k)}
              >
                <span
                  className={`knowledge-type-icon ${["purple", "mint", "peach"][i % 3]}`}
                >
                  {k.kind === "product" ? (
                    <Flower2 size={20} />
                  ) : k.kind === "faq" ? (
                    <BookOpen size={20} />
                  ) : (
                    <FileText size={20} />
                  )}
                </span>
                <div>
                  <strong>{k.title}</strong>
                  <p>{k.content}</p>
                </div>
                <span className="knowledge-kind">{k.kind}</span>
                <Badge color={k.verified ? "green" : "orange"}>
                  {k.verified ? (
                    <>
                      <CheckCircle2 size={11} /> Verified
                    </>
                  ) : (
                    "Needs review"
                  )}
                </Badge>
                <Edit3 size={15} />
              </button>
            ))}
          {!data.knowledge.length && (
            <Empty
              title="A little knowledge goes a long way"
              description="Add your first product, policy, or frequently asked question."
            />
          )}
        </div>
      </section>
      {edit !== undefined && (
        <Modal
          title={edit ? "Edit knowledge source" : "A new piece of knowledge"}
          onClose={() => setEdit(undefined)}
        >
          <form className="modal-form" onSubmit={(e) => void save(e)}>
            <label>
              Title
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={edit?.title}
                placeholder="What do customers need to know?"
              />
            </label>
            <label>
              Source type
              <select name="kind" defaultValue={edit?.kind ?? "faq"}>
                <option value="faq">Frequently asked question</option>
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="policy">Policy</option>
              </select>
            </label>
            <label>
              Verified business information
              <textarea
                name="content"
                required
                maxLength={3000}
                rows={6}
                defaultValue={edit?.content}
                placeholder="Include the exact details your assistant should use."
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="verified"
                defaultChecked={edit?.verified ?? false}
              />
              I have reviewed this information and confirm it is correct.
            </label>
            <div className="modal-actions">
              {edit && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={async () => {
                    await mutate(`/knowledge/${edit.id}`, "DELETE");
                    setEdit(undefined);
                    toast("Knowledge source deleted");
                  }}
                >
                  <Trash2 size={15} /> Delete
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEdit(undefined)}
              >
                Cancel
              </Button>
              <Button busy={busy} type="submit">
                Save knowledge
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function ContentPage() {
  const { data, mutate, generate, toast, demo } = useStore();
  const [dialog, setDialog] = useState<"create" | "generate" | Draft | null>(
    null,
  );
  const [filter, setFilter] = useState("All content");
  const [busy, setBusy] = useState(false);
  const [draftText, setDraftText] = useState("");
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      if (dialog === "generate") {
        await generate(f.get("task") as AITask, String(f.get("prompt")));
        toast(
          demo
            ? "Sample draft created for review"
            : "AI draft created for review",
        );
      } else
        await mutate("/drafts", "POST", {
          title: f.get("title"),
          content: f.get("content"),
          platform: f.get("platform"),
        });
      setDialog(null);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const statusAction = async (d: Draft, status: string) => {
    try {
      await mutate(`/drafts/${d.id}`, "PATCH", { status });
      setDialog(null);
      toast(
        status === "approved"
          ? "Draft approved. You can now schedule it."
          : "Draft updated.",
      );
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <>
      <PageHeading
        title="Something good to share."
        description="From a little spark of inspiration to your next great post."
      >
        <Button variant="secondary" onClick={() => setDialog("create")}>
          <Plus size={16} /> Write a post
        </Button>
        <Button onClick={() => setDialog("generate")}>
          <Sparkles size={16} /> Create with AI
        </Button>
      </PageHeading>
      <div className="feature-banner lavender-banner">
        <div className="feature-icon">
          <Sparkles size={27} />
        </div>
        <div>
          <h2>Your ideas. A little extra inspiration.</h2>
          <p>
            Let AI help with the first draft. You always have the final say.
          </p>
        </div>
        <Badge color="purple">
          <ShieldCheck size={12} /> Review before publishing
        </Badge>
      </div>
      <div className="section-heading">
        <div className="tabs">
          {["All content", "Drafts", "Approved", "Scheduled", "Published"].map(
            (t) => (
              <button
                key={t}
                className={filter === t ? "selected" : ""}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ),
          )}
        </div>
        <span className="muted-label">
          {data.drafts.length} pieces of possibility
        </span>
      </div>
      <div className="content-grid">
        {data.drafts
          .filter(
            (d) =>
              filter === "All content" ||
              d.status ===
                (filter === "Drafts" ? "draft" : filter.toLowerCase()),
          )
          .map((d, i) => (
            <section className="card post-card" key={d.id}>
              <div className={`post-art post-art-${i % 3}`}>
                <span className="post-petal petal-one" />
                <span className="post-petal petal-two" />
                <span className="post-petal petal-three" />
                <span className="post-art-word">
                  {i % 2 === 0 ? "a little\njoy." : "let good\nthings bloom."}
                </span>
                <span className="post-art-brand">{data.business.name}</span>
                <Badge
                  color={
                    d.status === "approved"
                      ? "green"
                      : d.status === "scheduled"
                        ? "purple"
                        : "gray"
                  }
                >
                  {d.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="post-body">
                <div className="post-channel">
                  <PlatformIcon platform={d.platform} />
                  {d.platform === "instagram" ? "Instagram" : "Facebook"}
                  {d.ai_generated && (
                    <span>
                      <Sparkles size={11} /> AI-generated
                    </span>
                  )}
                </div>
                <h3>{d.title}</h3>
                <p>{d.content}</p>
                <div className="post-footer">
                  <span>
                    {d.scheduled_at ? (
                      <>
                        <CalendarDays size={12} />
                        {new Date(d.scheduled_at).toLocaleDateString()}
                      </>
                    ) : (
                      "Ready for your thoughtful touch"
                    )}
                  </span>
                  <button
                    onClick={() => {
                      setDraftText(d.content);
                      setDialog(d);
                    }}
                  >
                    Review <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            </section>
          ))}
        <button
          className="new-automation-card content-create"
          onClick={() => setDialog("generate")}
        >
          <span>
            <Sparkles size={25} />
          </span>
          <h3>Your next good idea</h3>
          <p>
            Start with a thought.
            <br />
            We’ll help with the words.
          </p>
          <span className="text-link">
            Create a draft <ArrowRight size={14} />
          </span>
        </button>
      </div>
      {(dialog === "create" || dialog === "generate") && (
        <Modal
          title={
            dialog === "generate"
              ? "A little help finding the words"
              : "Create a post"
          }
          onClose={() => setDialog(null)}
        >
          <form className="modal-form" onSubmit={(e) => void create(e)}>
            {dialog === "generate" ? (
              <>
                <div className="info-callout">
                  <Sparkles size={18} />
                  <p>
                    {demo
                      ? "Preview uses sample content."
                      : "AI uses your verified business knowledge."}{" "}
                    Every draft is saved for your review.
                  </p>
                </div>
                <label>
                  What are we creating?
                  <select name="task">
                    <option value="generate-post-caption">
                      Social post caption
                    </option>
                    <option value="generate-faqs">FAQ suggestions</option>
                    <option value="generate-business-profile">
                      Business profile
                    </option>
                    <option value="generate-welcome-message">
                      Welcome message
                    </option>
                    <option value="generate-fallback-message">
                      Fallback message
                    </option>
                    <option value="generate-automation-suggestions">
                      Automation ideas
                    </option>
                  </select>
                </label>
                <label>
                  What’s on your mind?
                  <textarea
                    name="prompt"
                    required
                    rows={4}
                    placeholder="For example: A warm introduction to our Everyday Bouquet."
                    maxLength={4000}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Post title
                  <input name="title" required maxLength={200} />
                </label>
                <label>
                  Channel
                  <select name="platform">
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </label>
                <label>
                  Your caption
                  <textarea name="content" required rows={6} maxLength={4000} />
                </label>
              </>
            )}
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialog(null)}
              >
                Cancel
              </Button>
              <Button busy={busy} type="submit">
                <Sparkles size={15} />
                {dialog === "generate" ? "Generate draft" : "Save draft"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {dialog && typeof dialog === "object" && (
        <Modal title="Give it your final touch" onClose={() => setDialog(null)}>
          <div className="modal-form">
            <div className="draft-review-heading">
              <Badge color="purple">
                {dialog.kind.replace("generate-", "").replaceAll("-", " ")}
              </Badge>
              <Badge color={dialog.status === "approved" ? "green" : "gray"}>
                {dialog.status}
              </Badge>
            </div>
            <h3>{dialog.title}</h3>
            <label>
              Draft content
              <textarea
                rows={8}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                maxLength={4000}
              />
            </label>
            {draftText !== dialog.content && (
              <Button
                onClick={async () => {
                  try {
                    await mutate(`/drafts/${dialog.id}`, "PATCH", {
                      content: draftText,
                      status: "draft",
                    });
                    setDialog(null);
                    toast(
                      "Edits saved. Review and approve your updated draft.",
                    );
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                Save edits
              </Button>
            )}
            {dialog.status === "approved" &&
              ["post", "generate-post-caption"].includes(dialog.kind) && (
                <form
                  className="schedule-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    try {
                      await mutate(`/drafts/${dialog.id}`, "PATCH", {
                        status: "scheduled",
                        scheduled_at: new Date(
                          String(f.get("date")),
                        ).toISOString(),
                        social_account_id: f.get("account"),
                        ...(f.get("image")
                          ? { image_url: f.get("image") }
                          : {}),
                      });
                      setDialog(null);
                      toast(
                        demo
                          ? "Schedule saved in demo. Nothing will be published."
                          : "Your post is scheduled.",
                      );
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                >
                  <h4>Give your post its moment</h4>
                  <label>
                    Publish date & time
                    <input name="date" type="datetime-local" required />
                  </label>
                  <label>
                    Connected account
                    <select name="account" required>
                      <option value="">Choose a channel</option>
                      {data.accounts
                        .filter(
                          (a) => a.connected && a.platform === dialog.platform,
                        )
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  {dialog.platform === "instagram" && (
                    <label>
                      Public image URL
                      <input
                        name="image"
                        type="url"
                        required
                        placeholder="https://…"
                      />
                      <small>
                        The decorative preview above is not a publishable image.
                      </small>
                    </label>
                  )}
                  <Button type="submit" disabled={draftText !== dialog.content}>
                    <CalendarDays size={15} /> Schedule post
                  </Button>
                </form>
              )}
            <div className="modal-actions">
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await mutate(`/drafts/${dialog.id}`, "DELETE");
                    setDialog(null);
                    toast("Draft deleted");
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                <Trash2 size={15} /> Delete
              </Button>
              {dialog.ai_generated && (
                <Button
                  variant="secondary"
                  busy={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await generate(
                        dialog.kind.startsWith("generate-")
                          ? (dialog.kind as AITask)
                          : "generate-post-caption",
                        dialog.title,
                      );
                      setDialog(null);
                      toast("A new draft is ready for review.");
                    } catch (e) {
                      toast((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Regenerate
                </Button>
              )}
              {dialog.status === "draft" && (
                <Button
                  disabled={draftText !== dialog.content}
                  onClick={() => void statusAction(dialog, "approved")}
                >
                  <Check size={15} /> Approve draft
                </Button>
              )}
              {dialog.status === "scheduled" && (
                <Button
                  variant="secondary"
                  onClick={() => void statusAction(dialog, "draft")}
                >
                  Cancel schedule
                </Button>
              )}
            </div>
            <p className="form-note">
              Approving content does not automatically add it to verified
              business knowledge. Add reviewed facts in Business knowledge.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}

export function ChannelsPage() {
  const { data, mutate, toast, demo } = useStore();
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(false);
  async function connect() {
    if (demo) {
      setSetup(true);
      return;
    }
    setBusy(true);
    try {
      const { url } = await request<{ url: string }>("/meta/connect", "POST");
      location.assign(url);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Bring your conversations together."
        description="Your customers’ favorite places. One beautifully connected workspace."
      >
        <Button busy={busy} onClick={() => void connect()}>
          <Plus size={16} /> Connect a channel
        </Button>
      </PageHeading>
      <div className="channels-grid">
        {(["facebook", "instagram"] as const).map((platform) => {
          const accounts = data.accounts.filter(
            (a) => a.platform === platform && a.connected,
          );
          return (
            <section className="card channel-card" key={platform}>
              <div className="channel-card-top">
                <span className={`channel-big-icon ${platform}`}>
                  {platform === "facebook" ? (
                    <Facebook size={30} />
                  ) : (
                    <Instagram size={30} />
                  )}
                </span>
                <Badge color={accounts.length ? "green" : "gray"} dot>
                  {accounts.length ? "Connected" : "Not connected"}
                </Badge>
              </div>
              <h2>
                {platform === "facebook" ? "Facebook Messenger" : "Instagram"}
              </h2>
              <p>
                {platform === "facebook"
                  ? "Make your business page feel a little more personal. Manage messages, answer questions, and stay close to your customers."
                  : "Turn a quick DM into a real connection. Bring your Instagram conversations right into your shared inbox."}
              </p>
              <div className="channel-features">
                <span>
                  <Check size={13} /> Unified inbox
                </span>
                <span>
                  <Check size={13} /> AI replies
                </span>
                <span>
                  <Check size={13} /> Post scheduling
                </span>
              </div>
              {accounts.map((a) => (
                <div className="connected-account" key={a.id}>
                  <span className="workspace-logo">
                    <Flower2 size={21} />
                  </span>
                  <div>
                    <strong>{a.name}</strong>
                    <small>
                      {demo ? "Sample account" : "Business account connected"}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Disconnect ${a.name} from ${platform}`}
                    onClick={async () => {
                      try {
                        await mutate(`/accounts/${a.id}`, "DELETE");
                        toast(
                          "Channel disconnected. Your conversation history is preserved.",
                        );
                      } catch (e) {
                        toast((e as Error).message);
                      }
                    }}
                  >
                    <Link2 size={16} />
                  </button>
                </div>
              ))}
              <Button
                variant="secondary"
                busy={busy}
                onClick={() => void connect()}
              >
                <Plus size={15} />
                {accounts.length
                  ? "Connect another account"
                  : `Connect ${platform === "facebook" ? "Facebook" : "Instagram"}`}
                <ArrowUpRight size={14} />
              </Button>
            </section>
          );
        })}
      </div>
      <div className="connection-trust">
        <ShieldCheck size={25} />
        <div>
          <h3>Your connections are in good hands.</h3>
          <p>
            Account credentials stay on the server, encrypted at rest. Each
            workspace only sees its own conversations.
          </p>
        </div>
      </div>
      <section className="card connection-steps">
        <h2>A few small steps to connected</h2>
        <div>
          {[
            {
              title: "Choose your business account",
              desc: "Sign in with Meta and choose the pages you manage.",
            },
            {
              title: "Give the right permissions",
              desc: "Allow Relay to receive and reply to your business messages.",
            },
            {
              title: "Let the conversation begin",
              desc: "New messages appear in your unified inbox.",
            },
          ].map((s, i) => (
            <div key={s.title}>
              <span>{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
      {setup && (
        <Modal
          title="Make this workspace your own"
          onClose={() => setSetup(false)}
        >
          <div className="setup-guide">
            <span className="setup-illustration">
              <Link2 size={32} />
            </span>
            <h3>You’re exploring a demo workspace.</h3>
            <p>
              To connect real accounts, configure the backend and sign in to
              your own workspace.
            </p>
            <ol>
              <li>
                Set your Supabase project and server credentials in the
                environment file.
              </li>
              <li>
                Apply the included migration and create your owner workspace.
              </li>
              <li>
                Configure your Meta application, permissions, and webhook URL.
              </li>
              <li>
                Set the public Supabase frontend configuration and restart the
                app.
              </li>
            </ol>
            <p className="form-note">
              The repository README includes the complete setup steps. No
              credentials should be entered in this demo.
            </p>
            <Button onClick={() => setSetup(false)}>
              Got it <Check size={15} />
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function TeamPage() {
  const { data, mutate, toast, demo } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeading
        title="Good work happens together."
        description="The people behind every thoughtful conversation."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Invite a teammate
        </Button>
      </PageHeading>
      <div className="team-banner">
        <div className="team-banner-avatars">
          {data.members.slice(0, 3).map((m, i) => (
            <Avatar name={m.display_name} index={i} key={m.user_id} />
          ))}
        </div>
        <div>
          <h2>A small team. A big difference.</h2>
          <p>
            Share the inbox, pick up where someone left off, and make every
            customer feel heard.
          </p>
        </div>
        <Badge color="purple">{data.members.length} team members</Badge>
      </div>
      <section className="card team-table">
        <div className="team-table-head">
          <span>Team member</span>
          <span>Role</span>
          <span>Workspace</span>
          <span>Access</span>
        </div>
        {data.members.map((m, i) => (
          <div className="team-row" key={m.user_id}>
            <div>
              <Avatar name={m.display_name} index={i} />
              <span>
                <strong>{m.display_name}</strong>
                <small>
                  {m.role === "owner" ? "Workspace owner" : "Team member"}
                </small>
              </span>
            </div>
            <Badge color={m.role === "owner" ? "purple" : "gray"}>
              {m.role}
            </Badge>
            <span>{data.organization.name}</span>
            <Badge color="green" dot>
              Member
            </Badge>
          </div>
        ))}
      </section>
      <div className="role-explainer">
        {[
          {
            title: "Owner",
            text: "Manages the workspace, team, and all business settings.",
          },
          {
            title: "Admin",
            text: "Manages conversations, content, knowledge, and assistant settings.",
          },
          {
            title: "Agent",
            text: "Helps customers, handles handoffs, and replies in the inbox.",
          },
        ].map((r) => (
          <div key={r.title}>
            <ShieldCheck size={18} />
            <h3>{r.title}</h3>
            <p>{r.text}</p>
          </div>
        ))}
      </div>
      {open && (
        <Modal title="Make room for a teammate" onClose={() => setOpen(false)}>
          <form
            className="modal-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await mutate("/team", "POST", {
                  email: f.get("email"),
                  display_name: f.get("name"),
                  role: f.get("role"),
                });
                setOpen(false);
                toast(
                  demo
                    ? "Sample teammate added. No invitation was sent."
                    : "Invitation sent.",
                );
              } catch (e) {
                toast((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Name
              <input name="name" required maxLength={100} />
            </label>
            <label>
              Email address
              <input name="email" type="email" required />
            </label>
            <label>
              Workspace role
              <select name="role">
                <option value="agent">Agent</option>
                {data.role === "owner" && <option value="admin">Admin</option>}
              </select>
            </label>
            <div className="info-callout">
              <Users size={18} />
              <p>
                {demo
                  ? "This adds a sample teammate to your demo workspace."
                  : "We’ll send a sign-in invitation to your teammate’s email address."}
              </p>
            </div>
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" busy={busy}>
                Send invitation <ArrowUpRight size={14} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function SettingsPage() {
  const { data, mutate, toast } = useStore();
  const [business, setBusiness] = useState<Business>({ ...data.business });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Business profile");
  const fields: Record<string, string> = {
    name: "Business name",
    category: "Business category",
    description: "What makes your business special?",
    location: "Business location",
    contact: "Public contact information",
    hours: "Business hours",
    delivery: "Delivery methods & fees",
    payments: "Accepted payment methods",
    policies: "Returns, refunds & other policies",
  };
  return (
    <>
      <PageHeading
        title="The details that make you, you."
        description="Keep your business information clear, helpful, and up to date."
      >
        <Button
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await mutate("/business", "PUT", business);
              toast("Your verified business profile is saved.");
            } catch (e) {
              toast((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Check size={16} /> Save changes
        </Button>
      </PageHeading>
      <div className="settings-layout">
        <aside className="settings-nav">
          {[
            "Business profile",
            "Delivery & policies",
            "Workspace security",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {t}
              <ChevronRight size={14} />
            </button>
          ))}
        </aside>
        <section className="card business-settings">
          {tab === "Workspace security" ? (
            <>
              <h2>A workspace you can trust</h2>
              <p className="muted">The foundation of every good connection.</p>
              {[
                {
                  title: "Organization isolation",
                  desc: "Each workspace has its own data boundary, enforced by membership checks and database policies.",
                },
                {
                  title: "Server-side credentials",
                  desc: "OpenAI and Meta credentials never reach your browser.",
                },
                {
                  title: "Human control",
                  desc: "Handoffs pause automation. AI content stays a draft until your team approves it.",
                },
                {
                  title: "Usage limits",
                  desc: "Global and workspace budgets reserve usage before AI requests are made.",
                },
              ].map((s) => (
                <div className="security-row" key={s.title}>
                  <ShieldCheck size={22} />
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                  <CheckCircle2 size={18} />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="business-profile-heading">
                <span className="workspace-logo">
                  <Flower2 size={29} />
                </span>
                <div>
                  <h2>{business.name}</h2>
                  <p>Tell your assistant what your customers should know.</p>
                </div>
              </div>
              <div className="settings-form">
                {Object.entries(fields)
                  .filter(([key]) =>
                    tab === "Business profile"
                      ? !["delivery", "payments", "policies"].includes(key)
                      : ["delivery", "payments", "policies"].includes(key),
                  )
                  .map(([key, label]) => (
                    <label key={key}>
                      {label}
                      {["description", "delivery", "policies"].includes(key) ? (
                        <textarea
                          rows={4}
                          value={business[key as keyof Business]}
                          onChange={(e) =>
                            setBusiness((b) => ({
                              ...b,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <input
                          value={business[key as keyof Business]}
                          onChange={(e) =>
                            setBusiness((b) => ({
                              ...b,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </label>
                  ))}
                <div className="info-callout">
                  <ShieldCheck size={17} />
                  <p>
                    Saving confirms this is verified business information. Your
                    assistant can use these facts in customer replies.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

export function AnalyticsPage() {
  const { data, demo, toast } = useStore();
  const tokens = data.usage.reduce((n, u) => n + u.total_tokens, 0);
  const costs = data.usage.reduce((n, u) => n + (u.estimated_cost ?? 0), 0);
  const exportCsv = () => {
    const csv = [
      "Date,Model,Input tokens,Output tokens,Total tokens,Estimated USD,Status",
      ...data.usage.map((u) =>
        [
          u.created_at,
          u.model,
          u.input_tokens,
          u.output_tokens,
          u.total_tokens,
          u.estimated_cost ?? "",
          u.request_status,
        ].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "relay-ai-usage.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Usage report exported");
  };
  return (
    <>
      <PageHeading
        title="See the bigger picture."
        description="A clearer view of your conversations and the AI that helps them along."
      >
        <Button variant="secondary" onClick={exportCsv}>
          <Download size={16} /> Export usage
        </Button>
      </PageHeading>
      <div className="analytics-stats">
        {[
          {
            label: "AI requests",
            value: data.usage.length.toLocaleString(),
            icon: Sparkles,
          },
          { label: "Tokens used", value: tokens.toLocaleString(), icon: Zap },
          {
            label: "Estimated spend",
            value: `$${costs.toFixed(4)}`,
            icon: FileText,
          },
          {
            label: "Monthly token budget",
            value: data.settings.monthly_token_limit.toLocaleString(),
            icon: ShieldCheck,
          },
        ].map((s) => (
          <div className="card analytics-stat" key={s.label}>
            <span className="action-icon purple">
              <s.icon size={19} />
            </span>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <section className="card analytics-chart">
        <div className="card-heading">
          <div>
            <h2>Conversations over time</h2>
            <p>
              {demo
                ? "Sample activity across your channels"
                : "Recorded activity is shown in the request table below."}
            </p>
          </div>
          <Badge color="purple">
            {demo ? "Sample data" : "Your workspace"}
          </Badge>
        </div>
        <ActivityChart />
      </section>
      <section className="card usage-table">
        <div className="card-heading">
          <div>
            <h2>AI usage, in the open</h2>
            <p>
              Actual provider token counts are recorded for live requests.
              Unknown costs are shown as unavailable.
            </p>
          </div>
        </div>
        <div className="usage-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Model</th>
                <th>Input / output tokens</th>
                <th>Estimated cost</th>
                <th>Latency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.map((u) => (
                <tr key={u.id}>
                  <td>
                    {new Date(u.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    {u.model}
                    {u.is_test && <Badge>Test</Badge>}
                  </td>
                  <td>
                    {u.input_tokens.toLocaleString()}{" "}
                    <span className="muted">/</span>{" "}
                    {u.output_tokens.toLocaleString()}
                  </td>
                  <td>
                    {u.estimated_cost === null
                      ? "Unavailable"
                      : `$${u.estimated_cost.toFixed(5)}`}
                  </td>
                  <td>{(u.latency_ms / 1000).toFixed(2)}s</td>
                  <td>
                    <Badge
                      color={
                        u.request_status === "completed" ? "green" : "orange"
                      }
                    >
                      {u.request_status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.usage.length && (
            <Empty
              title="Your first request is a fresh start"
              description="AI usage appears here after your assistant begins helping."
            />
          )}
        </div>
      </section>
    </>
  );
}
