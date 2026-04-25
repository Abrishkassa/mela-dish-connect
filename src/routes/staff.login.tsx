import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MelaLogo } from "@/components/MelaLogo";
import { ChefHat, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/login")({
  head: () => ({
    meta: [
      { title: "Staff Login — Mela" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffLogin,
});

function StaffLogin() {
  const { lang } = useLang();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up extras
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"chef" | "owner">("chef");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (roles.includes("owner")) navigate({ to: "/admin" });
    else if (roles.includes("chef")) navigate({ to: "/kitchen" });
  }, [user, roles, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("staff-signup", {
        body: { email, password, full_name: fullName, role, invite_code: inviteCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Account created — signing you in");
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) toast.error(signErr.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-night">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
        <Link to="/"><MelaLogo /></Link>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-100px)] max-w-md flex-col items-center justify-center px-6 py-12">
        <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-3xl text-foreground">
            {mode === "signin" ? t("sign_in", lang) : t("sign_up", lang)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mela staff portal · Hawassa
          </p>

          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field
                label={t("full_name", lang)}
                value={fullName}
                onChange={setFullName}
                required
              />
            )}
            <Field
              label={t("email", lang)}
              type="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label={t("password", lang)}
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("role", lang)}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("chef")}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition-smooth ${
                        role === "chef"
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ChefHat className="h-4 w-4" /> Chef
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("owner")}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition-smooth ${
                        role === "owner"
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Crown className="h-4 w-4" /> Owner
                    </button>
                  </div>
                </div>
                <Field
                  label={t("invite_code", lang)}
                  value={inviteCode}
                  onChange={setInviteCode}
                  required
                />
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-gradient-gold py-3 font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "…" : mode === "signin" ? t("sign_in", lang) : t("sign_up", lang)}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-gold"
          >
            {mode === "signin"
              ? "Need an account? Sign up with invite code"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
    </div>
  );
}
