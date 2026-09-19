import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Heart,
  Instagram,
  Facebook,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  Inbox,
  CalendarDays,
  Flower2,
} from "lucide-react";
import "./landing.css";
const faqs = [
  {
    q: "What can Relay help my business with?",
    a: "Relay brings Facebook Messenger and Instagram messages into a shared inbox. You can create automatic replies, train an AI assistant with verified business information, draft social content, and schedule approved posts.",
  },
  {
    q: "Will the AI make up information about my business?",
    a: "Customer replies are assembled from the business facts you verify. When the assistant cannot find a reliable answer, it asks your team to step in. It cannot create orders, confirm payments, or book appointments on its own.",
  },
  {
    q: "Can I take over a conversation?",
    a: "Yes. Take over from the inbox at any time. Automatic replies pause when a team member takes over, when a customer asks for a person, or when the conversation involves a sensitive issue.",
  },
  {
    q: "Do I need to connect both Facebook and Instagram?",
    a: "No. Start with the channel your customers already use. Instagram messaging requires a professional account connected through the Meta setup flow.",
  },
  {
    q: "Can I review AI content before it goes out?",
    a: "Yes. Generated captions, FAQs, and business content are saved as drafts. You can edit, regenerate, delete, or approve them. Social posts must be approved before you can schedule them.",
  },
];
export function Landing() {
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<number | null>(0);
  const [category, setCategory] = useState("Beauty & wellness");
  useEffect(() => {
    document.title = "Relay — Big dreams. Less busywork.";
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  function go(hash: string) {
    location.hash = hash;
    setMenu(false);
    if (["features", "how-it-works", "faq"].includes(hash))
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0 });
  }
  return (
    <div className="landing">
      <div className="announcement">
        <span>A little AI. A lot more you.</span>
        <span className="announcement-divider" />
        <a href="#features" onClick={() => go("features")}>
          Meet your business’s new favorite assistant <ArrowUpRight size={12} />
        </a>
      </div>
      <header className="landing-nav">
        <a className="landing-logo" href="#home" aria-label="Relay home">
          relay<span>✳</span>
        </a>
        <nav className={menu ? "open" : ""}>
          <a href="#features" onClick={() => go("features")}>
            Why Relay
          </a>
          <a href="#how-it-works" onClick={() => go("how-it-works")}>
            How it works
          </a>
          <a href="#faq" onClick={() => go("faq")}>
            Good questions
          </a>
        </nav>
        <div className="landing-nav-actions">
          <a
            href="#login"
            className="landing-login"
            onClick={() => go("login")}
          >
            Log in <ArrowUpRight size={14} />
          </a>
          <a
            href="#signup"
            className="pill-button small"
            onClick={() => go("signup")}
          >
            Let’s get started <ArrowRight size={15} />
          </a>
          <button
            className="landing-menu"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close navigation" : "Open navigation"}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        <section className="landing-hero landing-container">
          <div className="hero-editorial">
            <div className="landing-eyebrow">
              <span /> For the business you’re building
            </div>
            <h1>
              Big dreams.
              <br />
              Less{" "}
              <span className="word-underlined">
                busywork.
                <svg
                  viewBox="0 0 440 22"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 14 Q195 -1 434 9 M38 19 Q240 3 390 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p>
              Your messages, your content, your kind of customer care.
              <br className="desktop-break" /> Meet the AI workspace that gives
              you a little more
              <br className="desktop-break" /> time to do what you love.
            </p>
            <div className="hero-cta">
              <a
                href="#signup"
                className="pill-button"
                onClick={() => go("signup")}
              >
                Make room for more <ArrowUpRight size={19} />
              </a>
              <a
                href="#how-it-works"
                className="landing-text-link"
                onClick={() => go("how-it-works")}
              >
                See how it works{" "}
                <span>
                  <ArrowDown size={16} />
                </span>
              </a>
            </div>
            <div className="hero-proof">
              <span>
                <Check size={14} /> Your voice, with a helping hand
              </span>
              <span>
                <Check size={14} /> Always in your control
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-art-frame">
              <img
                src="/images/relay-studio.png"
                alt="Illustration of a business owner creating at her flower studio with a pink laptop"
                fetchPriority="high"
              />
              <div className="visual-label">
                <span className="visual-label-icon">
                  <Heart size={17} />
                </span>
                <div>
                  <strong>Built around your business.</strong>
                  <span>And the person behind it.</span>
                </div>
              </div>
            </div>
            <div className="floating-feature">
              <span>
                <Sparkles size={20} />
              </span>
              <div>
                <strong>Your new right-hand woman.</strong>
                <p>Thoughtful replies. More room to grow.</p>
              </div>
              <span className="floating-check">
                <Check size={13} />
              </span>
            </div>
            <span className="hero-flower" aria-hidden="true">
              ✳
            </span>
            <div className="small-side-note">LESS TABS. MORE POSSIBILITY.</div>
          </div>
        </section>
        <section className="channel-ribbon landing-container">
          <span>Show up where your people are.</span>
          <div>
            <Facebook size={21} />
            <strong>Facebook</strong>
          </div>
          <span className="ribbon-plus">+</span>
          <div>
            <Instagram size={22} />
            <strong>Instagram</strong>
          </div>
          <span className="ribbon-equals">=</span>
          <div className="ribbon-one">
            <Heart size={20} />
            <strong>One happy workspace.</strong>
          </div>
        </section>
        <section
          className="features-section landing-container reveal"
          id="features"
        >
          <div className="landing-section-heading">
            <div>
              <span className="landing-eyebrow">
                A little less “I’ll get back to you”
              </span>
              <h2>
                You do the big things.
                <br />
                We’ll help with the everyday.
              </h2>
            </div>
            <p>
              From the first “hi” to your next great post,
              <br />
              keep your business feeling like you.
            </p>
          </div>
          <div className="landing-feature-grid">
            <article className="landing-feature-card">
              <div className="feature-illustration inbox-illustration">
                <div className="mini-channel instagram">
                  <Instagram size={23} />
                </div>
                <div className="connection-line" />
                <div className="inbox-tile">
                  <Inbox size={40} />
                  <span>All together.</span>
                </div>
                <div className="mini-channel facebook">
                  <Facebook size={23} />
                </div>
                <span className="graphic-spark">✦</span>
              </div>
              <h3>
                Every message.
                <br />
                One lovely little inbox.
              </h3>
              <p>
                Bring Facebook and Instagram together. Reply, assign, and pick
                up right where your team left off.
              </p>
              <a
                href="#signup"
                onClick={() => go("signup")}
                className="feature-arrow"
                aria-label="Get started with your unified inbox"
              >
                <ArrowUpRight size={20} />
              </a>
            </article>
            <article className="landing-feature-card">
              <div className="feature-illustration ai-illustration">
                <span className="graphic-orbit" />
                <div className="ai-tile">
                  <Sparkles size={48} strokeWidth={1.3} />
                </div>
                <span className="little-verified">
                  <ShieldCheck size={14} /> Your verified knowledge
                </span>
                <span className="graphic-spark">✧</span>
              </div>
              <h3>
                Your voice.
                <br />
                With a little AI magic.
              </h3>
              <p>
                A helpful assistant that knows your business, uses your approved
                facts, and knows when to ask your team.
              </p>
              <a
                href="#signup"
                onClick={() => go("signup")}
                className="feature-arrow"
                aria-label="Get started with your AI assistant"
              >
                <ArrowUpRight size={20} />
              </a>
            </article>
            <article className="landing-feature-card">
              <div className="feature-illustration content-illustration">
                <div className="mini-calendar">
                  <span>Your next good idea</span>
                  <div>
                    {Array.from({ length: 14 }, (_, i) => (
                      <i key={i} className={i === 9 ? "picked" : ""}>
                        {i === 9 ? <Heart size={10} /> : i + 1}
                      </i>
                    ))}
                  </div>
                  <span className="calendar-approved">
                    <Check size={10} /> Approved by you
                  </span>
                </div>
                <span className="graphic-spark">✳</span>
              </div>
              <h3>
                A little inspiration.
                <br />A lot worth sharing.
              </h3>
              <p>
                Turn your ideas into captions, give every draft your final
                touch, and plan your next moment in the spotlight.
              </p>
              <a
                href="#signup"
                onClick={() => go("signup")}
                className="feature-arrow"
                aria-label="Get started with content planning"
              >
                <ArrowUpRight size={20} />
              </a>
            </article>
          </div>
        </section>
        <section className="landing-dark-band reveal">
          <div className="landing-container dark-band-inner">
            <div className="dark-band-copy">
              <span className="landing-eyebrow">
                Built for your kind of business
              </span>
              <h2>
                For the dreamers.
                <br />
                The doers.
                <br />
                <span>The “I built this” girls.</span>
              </h2>
              <p>
                The beauty studio. The neighborhood café. The little shop with
                big plans. Whatever you’re building, you deserve a workspace
                that works as hard as you do.
              </p>
              <a
                href="#signup"
                className="pill-button light"
                onClick={() => go("signup")}
              >
                Find your flow <ArrowUpRight size={18} />
              </a>
            </div>
            <div className="business-selector">
              <div className="category-chips">
                {[
                  "Beauty & wellness",
                  "Shops & boutiques",
                  "Food & flowers",
                ].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={category === c ? "selected" : ""}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="business-window">
                <div className="business-window-top">
                  <span className="studio-mark">
                    {category === "Beauty & wellness"
                      ? "✧"
                      : category === "Shops & boutiques"
                        ? "♡"
                        : "✳"}
                  </span>
                  <div>
                    <strong>
                      {category === "Beauty & wellness"
                        ? "Your studio, in sync."
                        : category === "Shops & boutiques"
                          ? "Your next chapter, organized."
                          : "Your good things, growing."}
                    </strong>
                    <p>{category}</p>
                  </div>
                  <Heart size={18} />
                </div>
                <div className="workflow-step">
                  <span>
                    <MessageCircle size={19} />
                  </span>
                  <div>
                    <strong>
                      {category === "Beauty & wellness"
                        ? "Answer service questions"
                        : category === "Shops & boutiques"
                          ? "Share product information"
                          : "Make delivery details easy"}
                    </strong>
                    <p>
                      {category === "Beauty & wellness"
                        ? "Use your verified treatments, hours, and prices."
                        : category === "Shops & boutiques"
                          ? "Keep your customers in the know, with facts you approve."
                          : "Let customers know where, when, and how you deliver."}
                    </p>
                  </div>
                  <Check size={15} />
                </div>
                <div className="workflow-step">
                  <span>
                    <Zap size={19} />
                  </span>
                  <div>
                    <strong>Give repeat questions a shortcut</strong>
                    <p>Your approved answers, ready when you need them.</p>
                  </div>
                  <Check size={15} />
                </div>
                <div className="workflow-step">
                  <span>
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <strong>Show up, beautifully</strong>
                    <p>Draft and schedule content in your own voice.</p>
                  </div>
                  <Check size={15} />
                </div>
                <div className="business-window-note">
                  <ShieldCheck size={15} /> Your business knowledge. Your final
                  say.
                </div>
              </div>
              <div className="business-selector-caption">
                <span>✧</span> A thoughtful workflow, whatever your work.
              </div>
            </div>
          </div>
        </section>
        <section
          className="landing-container steps-section reveal"
          id="how-it-works"
        >
          <div className="landing-section-heading">
            <div>
              <span className="landing-eyebrow">
                From “where do I start?” to “I’ve got this.”
              </span>
              <h2>
                A fresh start.
                <br />
                Three small steps.
              </h2>
            </div>
            <a
              href="#signup"
              className="pill-button outlined"
              onClick={() => go("signup")}
            >
              Let’s make it happen <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="landing-steps">
            {[
              {
                number: "01",
                icon: LinkIcon,
                title: "Bring your world together.",
                text: "Create your workspace and connect the Facebook Pages and Instagram accounts you manage.",
              },
              {
                number: "02",
                icon: BookIcon,
                title: "Make it sound like you.",
                text: "Add your business details, products, and FAQs. Choose your assistant’s tone, then give it a test.",
              },
              {
                number: "03",
                icon: Sparkles,
                title: "Get back to your good work.",
                text: "Let your assistant handle the everyday. Step in for the personal moments. Keep growing on your terms.",
              },
            ].map((s) => (
              <article key={s.number}>
                <div className="step-number">
                  {s.number}
                  <s.icon size={25} />
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-container control-section reveal">
          <div className="control-art">
            <div className="control-flower">✳</div>
            <div className="control-card">
              <span>
                <ShieldCheck size={28} />
              </span>
              <h3>
                A helping hand.
                <br />
                Never out of your hands.
              </h3>
              <div>
                <Check size={15} /> You approve the knowledge.
              </div>
              <div>
                <Check size={15} /> You review the content.
              </div>
              <div>
                <Check size={15} /> You can take over, anytime.
              </div>
            </div>
            <span className="control-sticker">
              Made with
              <br />
              <Heart size={18} /> care.
            </span>
          </div>
          <div className="control-copy">
            <span className="landing-eyebrow">
              Confidence looks good on you
            </span>
            <h2>
              Your business.
              <br />
              Your boundaries.
              <br />
              <span>Always.</span>
            </h2>
            <p>
              AI should make your day easier, not take away your say. Your
              assistant sticks to your verified information, keeps each
              workspace private, and brings in a real person when it matters.
            </p>
            <a
              className="landing-text-link"
              href="#faq"
              onClick={() => go("faq")}
            >
              A little more peace of mind <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
        <section className="landing-container faq-section reveal" id="faq">
          <div>
            <span className="landing-eyebrow">
              A few things you might be wondering
            </span>
            <h2>
              Good questions.
              <br />
              Thoughtful answers.
            </h2>
            <Flower2 className="faq-flower" size={77} strokeWidth={1} />
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div
                className={`faq-item ${open === i ? "expanded" : ""}`}
                key={f.q}
              >
                <button
                  aria-expanded={open === i}
                  aria-controls={`faq-answer-${i}`}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {f.q}
                  <ChevronDown size={18} />
                </button>
                <div id={`faq-answer-${i}`} hidden={open !== i}>
                  <p>{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="final-invite reveal">
          <div className="landing-container">
            <span className="invite-star">✳</span>
            <span className="landing-eyebrow">
              You’ve got the dream. We’ve got your back.
            </span>
            <h2>
              Make a little more room
              <br />
              for <span>what you love.</span>
            </h2>
            <p>A more connected business. A little more breathing room.</p>
            <a
              href="#signup"
              className="pill-button"
              onClick={() => go("signup")}
            >
              Your next chapter starts here <ArrowUpRight size={18} />
            </a>
            <span className="invite-heart" aria-hidden="true">
              ♡
            </span>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-main">
            <div>
              <a href="#home" className="landing-logo light-logo">
                relay<span>✳</span>
              </a>
              <p>
                Good connections.
                <br />
                Beautiful possibilities.
              </p>
            </div>
            <div>
              <span>Make yourself at home</span>
              <a href="#features" onClick={() => go("features")}>
                Why Relay
              </a>
              <a href="#how-it-works" onClick={() => go("how-it-works")}>
                How it works
              </a>
              <a href="#faq" onClick={() => go("faq")}>
                Good questions
              </a>
            </div>
            <div>
              <span>Your next chapter</span>
              <a href="#signup" onClick={() => go("signup")}>
                Create your workspace <ArrowUpRight size={14} />
              </a>
              <a href="#login" onClick={() => go("login")}>
                Log in
              </a>
              <p>
                Built for Facebook & Instagram.
                <br />
                Made for the person behind the business.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Relay. A little more connected.
            </span>
            <span>
              Thoughtfully made <Heart size={12} />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
function LinkIcon({ size }: { size: number }) {
  return <Inbox size={size} />;
}
function BookIcon({ size }: { size: number }) {
  return <MessageCircle size={size} />;
}
