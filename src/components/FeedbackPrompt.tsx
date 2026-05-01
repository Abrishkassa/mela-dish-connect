import { useState } from "react";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client.custom";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

interface Props {
  orderId: string;
  tableNumber: number;
}

export function FeedbackPrompt({ orderId, tableNumber }: Props) {
  const { lang } = useLang();
  const storageKey = `mela_feedback_${orderId}`;
  const [submitted, setSubmitted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "1";
  });
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [meal, setMeal] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [system, setSystem] = useState("");
  const [busy, setBusy] = useState(false);

  if (submitted) {
    return (
      <section className="mt-6 flex items-center gap-3 rounded-3xl border border-gold/40 bg-gold/5 p-5 animate-fade-up">
        <CheckCircle2 className="h-6 w-6 text-gold" />
        <p className="font-display text-lg text-gold">{t("feedback_thanks", lang)}</p>
      </section>
    );
  }

  const submit = async () => {
    if (rating < 1) {
      toast.error("Please select a star rating");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      order_id: orderId,
      table_number: tableNumber,
      rating,
      meal_comment: meal || null,
      restaurant_comment: restaurant || null,
      system_comment: system || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (typeof window !== "undefined") localStorage.setItem(storageKey, "1");
    setSubmitted(true);
    toast.success(t("feedback_thanks", lang));
  };

  return (
    <section className="mt-6 rounded-3xl border border-gold/40 bg-card p-6 shadow-elegant animate-fade-up">
      <h2 className="font-display text-xl text-gradient-gold">{t("feedback_title", lang)}</h2>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("feedback_rating_label", lang)}
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hoverRating || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} stars`}
                className="rounded-full p-1 transition-smooth hover:scale-110"
              >
                <Star
                  className={`h-9 w-9 transition-smooth ${
                    filled ? "fill-gold text-gold" : "text-muted-foreground"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <FeedbackField
          label={t("feedback_meal_label", lang)}
          value={meal}
          onChange={setMeal}
          optionalLabel={t("feedback_optional", lang)}
        />
        <FeedbackField
          label={t("feedback_restaurant_label", lang)}
          value={restaurant}
          onChange={setRestaurant}
          optionalLabel={t("feedback_optional", lang)}
        />
        <FeedbackField
          label={t("feedback_system_label", lang)}
          value={system}
          onChange={setSystem}
          optionalLabel={t("feedback_optional", lang)}
        />
      </div>

      <button
        onClick={submit}
        disabled={busy || rating < 1}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-3 font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-95 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {busy ? "…" : t("feedback_submit", lang)}
      </button>
    </section>
  );
}

function FeedbackField({
  label,
  value,
  onChange,
  optionalLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optionalLabel: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="text-[10px] opacity-60">{optionalLabel}</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
    </div>
  );
}
