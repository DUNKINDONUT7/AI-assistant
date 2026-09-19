import { useEffect, useState } from "react";
import { ArrowUpRight, Flower2 } from "lucide-react";
import { supabase, request } from "./api";
import { useStore } from "./store";
import { Button } from "./components";
export function AuthScreen() {
  const { error, refresh, toast } = useStore();
  const [signup, setSignup] = useState(location.hash === "#signup");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const needsWorkspace = error === "Workspace access is unavailable.";
  useEffect(() => {
    void supabase?.auth
      .getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)));
  }, [error]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      if (signedIn && needsWorkspace) {
        await request("/onboarding", "POST", {
          name: f.get("business"),
          display_name: f.get("name"),
        });
        await refresh();
        return;
      }
      if (!supabase)
        throw new Error(
          "Configure the public Supabase URL and publishable key to sign in.",
        );
      const credentials = {
        email: String(f.get("email")),
        password: String(f.get("password")),
      };
      const result = signup
        ? await supabase!.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: location.origin },
          })
        : await supabase!.auth.signInWithPassword(credentials);
      if (result.error)
        throw new Error(
          "Unable to sign in. Check your details or confirm your email first.",
        );
      if (signup && !result.data.session)
        toast("Check your email to confirm your account, then sign in.");
      else await refresh();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <a className="auth-back" href="#home">
        ? Back to Relay
      </a>
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark">
            r<span />
          </span>
          relay<span className="brand-dot">.</span>
        </div>
        <h1>
          {needsWorkspace
            ? "A home for your business."
            : "Your business, in sync."}
        </h1>
        <p>
          {needsWorkspace
            ? "Let’s give your workspace a name. You can add the rest of your business information in Settings."
            : signup
              ? "Create your account and start a more connected day."
              : "Sign in to your workspace to keep the conversation going."}
        </p>
        <form onSubmit={(e) => void submit(e)}>
          {signedIn && needsWorkspace ? (
            <>
              <label>
                Your name
                <input name="name" required maxLength={100} />
              </label>
              <label>
                Business name
                <input name="business" required maxLength={150} />
              </label>
            </>
          ) : (
            <>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@yourbusiness.com"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={signup ? "new-password" : "current-password"}
                />
              </label>
            </>
          )}
          <Button type="submit" busy={busy}>
            {signedIn && needsWorkspace ? (
              <>
                <Flower2 size={16} /> Create workspace
              </>
            ) : (
              <>
                {signup ? "Create account" : "Sign in"}{" "}
                <ArrowUpRight size={16} />
              </>
            )}
          </Button>
        </form>
        {!needsWorkspace && (
          <Button variant="ghost" onClick={() => setSignup(!signup)}>
            {signup
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Button>
        )}
        <p className="error-text">
          {needsWorkspace
            ? "Your new workspace will be private to you and your invited team."
            : error}
        </p>
        <Button variant="ghost" onClick={() => void refresh()}>
          Try reconnecting
        </Button>
        {signedIn && (
          <Button variant="ghost" onClick={() => void supabase?.auth.signOut()}>
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
