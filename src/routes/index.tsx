import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MelaLogo } from "@/components/MelaLogo";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/i18n";
import { ChefHat, Languages, QrCode, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mela — Hawassa's Digital Menu" },
      {
        name: "description",
        content:
          "A tri-lingual QR menu crafted for Lake Hawassa's resorts. Customers order from their phone in English, Amharic, or Sidaamu Afoo.",
      },
      { property: "og:title", content: "Mela — Hawassa's Digital Menu" },
      { property: "og:description", content: "Tri-lingual QR ordering for Hawassa hotels & resorts." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { lang } = useLang();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Hero */}
      <section className="relative min-h-screen">
        <img
          src={heroImg}
          alt="Lake Hawassa resort dining at dusk"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-overlay" />

        {/* Top nav */}
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
          <MelaLogo />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              to="/staff/login"
              className="rounded-full border border-border bg-card/50 px-4 py-2 text-sm font-medium backdrop-blur transition-smooth hover:border-gold/60 hover:text-gold"
            >
              {t("staff_login", lang)}
            </Link>
          </div>
        </header>

        {/* Hero content */}
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start justify-center px-6 pb-24 pt-24 md:pt-40">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-card/40 px-3 py-1 text-xs uppercase tracking-[0.25em] text-gold backdrop-blur animate-fade-up">
            <Sparkles className="h-3 w-3" /> {t("brand_tagline", lang)}
          </span>
          <h1 className="font-display text-5xl font-medium leading-[1.05] text-foreground md:text-7xl lg:text-8xl animate-fade-up" style={{ animationDelay: "80ms" }}>
            {t("scan_to_order", lang)}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "160ms" }}>
            {t("hero_sub", lang)}
          </p>

          <div className="mt-10 flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
            <Link
              to="/table/$tableNumber"
              params={{ tableNumber: "5" }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-3.5 font-medium text-primary-foreground shadow-glow transition-smooth hover:scale-[1.02]"
            >
              <QrCode className="h-4 w-4" />
              {t("view_demo", lang)}
            </Link>
            <Link
              to="/staff/login"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-7 py-3.5 font-medium backdrop-blur transition-smooth hover:border-gold/60 hover:text-gold"
            >
              {t("staff_login", lang)}
            </Link>
          </div>
        </div>

        {/* Feature strip */}
        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border/50 bg-background/80 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 md:grid-cols-3">
            <Feature icon={<Languages className="h-5 w-5" />} title="Three Languages" desc="English · አማርኛ · Sidaamu Afoo" />
            <Feature icon={<ChefHat className="h-5 w-5" />} title="Chef's Pairings" desc="Curated drink suggestions for every dish" />
            <Feature icon={<QrCode className="h-5 w-5" />} title="QR Ordering" desc="No app. No payment friction. Just scan." />
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-glow">
        {icon}
      </div>
      <div>
        <h3 className="font-display text-lg text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
