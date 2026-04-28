import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client.custom";
import { useLang } from "@/lib/lang-context";
import { t, pickLang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MelaLogo } from "@/components/MelaLogo";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Plus,
  Sparkles,
} from "lucide-react";
import type { MultiLang } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/track/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Tracking — Mela" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackOrder,
});

interface OrderItem {
  id: string;
  name_snapshot: MultiLang;
  unit_price: number;
  quantity: number;
}

interface Order {
  id: string;
  table_number: number;
  status: "pending" | "cooking" | "served" | "cancelled";
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

function TrackOrder() {
  const { orderId } = Route.useParams();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [askAddMore, setAskAddMore] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .maybeSingle();
      setOrder((data as unknown as Order) ?? null);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`order_${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${orderId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gradient-gold" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl text-foreground">Order not found</h1>
          <Link to="/" className="mt-6 inline-flex rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-medium text-primary-foreground">
            Home
          </Link>
        </div>
      </div>
    );
  }

  const isLive = order.status === "pending" || order.status === "cooking";
  const placedMinutes = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / 60000,
  );

  const goAddMore = () => {
    navigate({
      to: "/table/$tableNumber",
      params: { tableNumber: String(order.table_number) },
      search: { addTo: order.id },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center"><MelaLogo /></Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-gold/40 bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              {t("table", lang)} {order.table_number}
            </span>
            <LanguageSwitcher compact />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-8">
        {/* Status timeline */}
        <section className="rounded-3xl border border-gold/30 bg-card p-6 shadow-elegant animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("order_status", lang)}
          </p>
          <h1 className="mt-2 font-display text-3xl text-gradient-gold">
            {order.status === "pending" && t("status_pending", lang)}
            {order.status === "cooking" && t("status_cooking", lang)}
            {order.status === "served" && t("status_served", lang)}
            {order.status === "cancelled" && "Cancelled"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />
            {t("placed_at", lang)} {new Date(order.created_at).toLocaleTimeString()} · {placedMinutes}m
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <Step
              active={["pending", "cooking", "served"].includes(order.status)}
              done={["cooking", "served"].includes(order.status)}
              icon={<Sparkles className="h-4 w-4" />}
              label={t("pending", lang)}
            />
            <Step
              active={["cooking", "served"].includes(order.status)}
              done={order.status === "served"}
              icon={<Flame className="h-4 w-4" />}
              label={t("cooking", lang)}
            />
            <Step
              active={order.status === "served"}
              done={order.status === "served"}
              icon={<CheckCircle2 className="h-4 w-4" />}
              label={t("served", lang)}
            />
          </div>
        </section>

        {/* Items */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-3 font-display text-2xl text-foreground">
            <span className="h-px w-8 bg-gradient-gold" />
            {t("your_order", lang)}
          </h2>
          <ul className="space-y-2">
            {order.order_items?.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3"
              >
                <span className="text-foreground">
                  <span className="text-gold">{it.quantity}×</span>{" "}
                  {pickLang(it.name_snapshot, lang)}
                </span>
                <span className="text-muted-foreground">
                  {(Number(it.unit_price) * it.quantity).toFixed(0)} ETB
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-muted-foreground">{t("total", lang)}</span>
            <span className="font-display text-2xl text-gold">
              {Number(order.total).toFixed(0)} ETB
            </span>
          </div>
        </section>

        {/* Add more CTA — only while order is live */}
        {isLive && (
          <button
            onClick={() => setAskAddMore(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-gold bg-card py-3.5 font-medium text-gold transition-smooth hover:bg-gold/10"
          >
            <Plus className="h-5 w-5" />
            {t("add_more_items", lang)}
          </button>
        )}

        {order.status === "served" && (
          <Link
            to="/table/$tableNumber"
            params={{ tableNumber: String(order.table_number) }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-3.5 font-medium text-primary-foreground shadow-glow"
          >
            <ChefHat className="h-5 w-5" />
            New Order
          </Link>
        )}
      </main>

      <AlertDialog open={askAddMore} onOpenChange={setAskAddMore}>
        <AlertDialogContent className="border-gold/40 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">
              {t("add_more_items", lang)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("add_more_prompt", lang)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              {t("no_thanks", lang)}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={goAddMore}
              className="rounded-full bg-gradient-gold text-primary-foreground"
            >
              {t("yes_add_more", lang)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Step({
  active,
  done,
  icon,
  label,
}: {
  active: boolean;
  done: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-smooth ${
        done
          ? "border-gold/60 bg-gold/10 text-gold"
          : active
            ? "border-gold/40 bg-card text-foreground animate-pulse-glow"
            : "border-border bg-background/40 text-muted-foreground"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          done || active ? "bg-gradient-gold text-primary-foreground" : "bg-muted"
        }`}
      >
        {icon}
      </span>
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}
