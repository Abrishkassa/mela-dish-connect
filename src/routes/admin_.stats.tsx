import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client.custom";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { t, pickLang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MelaLogo } from "@/components/MelaLogo";
import { BarChart3, ChefHat, Crown, LogOut, Settings, Star } from "lucide-react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { MultiLang } from "@/lib/types";

export const Route = createFileRoute("/admin_/stats")({
  head: () => ({
    meta: [
      { title: "Stats — Mela Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminStats,
});

type Range = "today" | "week" | "all";

interface OrderRow {
  id: string;
  table_number: number;
  total: number;
  status: string;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  menu_item_id: string;
  name_snapshot: MultiLang;
  quantity: number;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  order_id: string;
  table_number: number;
  rating: number;
  meal_comment: string | null;
  restaurant_comment: string | null;
  system_comment: string | null;
  created_at: string;
}

function rangeStart(range: Range): Date | null {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  return null;
}

function AdminStats() {
  const { lang } = useLang();
  const { user, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [topRange, setTopRange] = useState<Range>("today");
  const [fbRange, setFbRange] = useState<Range>("week");
  const [fbMinRating, setFbMinRating] = useState<number>(0);

  useEffect(() => {
    if (loading) return;
    if (!user || !roles.includes("owner")) navigate({ to: "/staff/login" });
  }, [user, roles, loading, navigate]);

  useEffect(() => {
    const load = async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const [ordersRes, itemsRes, fbRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, table_number, total, status, created_at")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("order_items")
          .select("id, menu_item_id, name_snapshot, quantity, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      setOrders((ordersRes.data ?? []) as OrderRow[]);
      setOrderItems((itemsRes.data ?? []) as unknown as OrderItemRow[]);
      setFeedback((fbRes.data ?? []) as FeedbackRow[]);
    };
    load();
    const ch = supabase
      .channel("admin_stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Daily orders per table — today and 7-day trend
  const ordersPerTableToday = useMemo(() => {
    const start = rangeStart("today")!;
    const map = new Map<number, number>();
    orders
      .filter((o) => new Date(o.created_at) >= start && o.status !== "cancelled")
      .forEach((o) => map.set(o.table_number, (map.get(o.table_number) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([table, count]) => ({ table: `T${table}`, count }))
      .sort((a, b) => Number(a.table.slice(1)) - Number(b.table.slice(1)));
  }, [orders]);

  const ordersPer7Days = useMemo(() => {
    const days: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = orders.filter(
        (o) =>
          new Date(o.created_at) >= d &&
          new Date(o.created_at) < next &&
          o.status !== "cancelled",
      ).length;
      days.push({
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        count,
      });
    }
    return days;
  }, [orders]);

  // Top items by range
  const topItems = useMemo(() => {
    const start = rangeStart(topRange);
    const filtered = start
      ? orderItems.filter((it) => new Date(it.created_at) >= start)
      : orderItems;
    const map = new Map<string, { name: string; qty: number }>();
    filtered.forEach((it) => {
      const name = pickLang(it.name_snapshot, lang) || "Item";
      const key = it.menu_item_id;
      const cur = map.get(key) ?? { name, qty: 0 };
      cur.qty += it.quantity;
      cur.name = name;
      map.set(key, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orderItems, topRange, lang]);

  // Filtered feedback
  const filteredFeedback = useMemo(() => {
    const start = rangeStart(fbRange);
    return feedback.filter((f) => {
      if (start && new Date(f.created_at) < start) return false;
      if (fbMinRating > 0 && f.rating < fbMinRating) return false;
      return true;
    });
  }, [feedback, fbRange, fbMinRating]);

  // Map order_id -> meal names (from order_items)
  const mealsByOrder = useMemo(() => {
    const map = new Map<string, string>();
    const grouped = new Map<string, OrderItemRow[]>();
    orderItems.forEach((it) => {
      const k = (it as unknown as { order_id: string }).order_id;
      const arr = grouped.get(k) ?? [];
      arr.push(it);
      grouped.set(k, arr);
    });
    grouped.forEach((arr, k) => {
      map.set(k, arr.map((it) => pickLang(it.name_snapshot, lang)).join(", "));
    });
    return map;
  }, [orderItems, lang]);

  const avgRating = useMemo(() => {
    if (filteredFeedback.length === 0) return 0;
    return (
      filteredFeedback.reduce((s, f) => s + f.rating, 0) / filteredFeedback.length
    );
  }, [filteredFeedback]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/"><MelaLogo /></Link>
            <span className="rounded-full border border-gold/40 bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              <BarChart3 className="mr-1 inline h-3 w-3" /> {t("stats", lang)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin" className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-gold hover:text-gold">
              <Crown className="mr-1.5 inline h-4 w-4" /> {t("admin", lang)}
            </Link>
            <Link to="/kitchen" className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-gold hover:text-gold">
              <ChefHat className="mr-1.5 inline h-4 w-4" /> {t("kitchen", lang)}
            </Link>
            <LanguageSwitcher compact />
            <ThemeToggle compact />
            <button
              onClick={() => signOut()}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-destructive hover:text-destructive"
            >
              <LogOut className="mr-1.5 inline h-4 w-4" /> {t("log_out", lang)}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Orders per table — KPI + heatmap + trend */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-gradient-gold">
                {t("stats_orders_per_table", lang)}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Today · live</p>
            </div>
            {(() => {
              const totalToday = ordersPerTableToday.reduce((s, x) => s + x.count, 0);
              const activeTables = ordersPerTableToday.length;
              const peak = ordersPerTableToday.reduce(
                (m, x) => (x.count > m.count ? x : m),
                { table: "—", count: 0 },
              );
              const avg = activeTables ? (totalToday / activeTables).toFixed(1) : "0";
              return (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Kpi label="Orders" value={String(totalToday)} />
                  <Kpi label="Active tables" value={String(activeTables)} />
                  <Kpi label="Peak" value={`${peak.table} · ${peak.count}`} />
                  <Kpi label="Avg / table" value={avg} />
                </div>
              );
            })()}
          </div>

          {ordersPerTableToday.length === 0 ? (
            <Empty label={t("stats_no_data", lang)} />
          ) : (
            (() => {
              const max = Math.max(...ordersPerTableToday.map((x) => x.count), 1);
              return (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                  {ordersPerTableToday.map((row) => {
                    const intensity = row.count / max;
                    return (
                      <div
                        key={row.table}
                        className="group relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-gold/20 transition-smooth hover:scale-105 hover:border-gold"
                        style={{
                          background: `linear-gradient(135deg, color-mix(in oklab, hsl(var(--primary)) ${
                            10 + intensity * 70
                          }%, transparent), color-mix(in oklab, hsl(var(--primary)) ${
                            5 + intensity * 40
                          }%, transparent))`,
                          boxShadow:
                            intensity > 0.6
                              ? "0 0 24px -8px hsl(var(--primary) / 0.6)"
                              : undefined,
                        }}
                        title={`${row.table} — ${row.count} orders`}
                      >
                        <span className="font-display text-2xl text-foreground">{row.count}</span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {row.table}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}

          <div className="mt-8 flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Last 7 days
            </h3>
            <span className="text-xs text-muted-foreground">
              {ordersPer7Days.reduce((s, d) => s + d.count, 0)} total
            </span>
          </div>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ordersPer7Days} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top items */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-gradient-gold">
              {t("stats_top_items", lang)}
            </h2>
            <RangePicker value={topRange} onChange={setTopRange} lang={lang} />
          </div>
          {topItems.length === 0 ? (
            <Empty label={t("stats_no_data", lang)} />
          ) : (
            <ol className="space-y-2">
              {topItems.map((it, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-4 rounded-xl border border-border bg-background/40 px-4 py-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold font-display text-primary-foreground">
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate font-display text-lg">{it.name}</span>
                  <span className="text-sm text-muted-foreground">×{it.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Feedback */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-gradient-gold">
              {t("stats_feedback", lang)}
            </h2>
            <div className="flex items-center gap-3">
              {filteredFeedback.length > 0 && (
                <span className="flex items-center gap-1 text-sm text-gold">
                  <Star className="h-4 w-4 fill-gold" />
                  {avgRating.toFixed(1)} · {filteredFeedback.length}
                </span>
              )}
              <RangePicker value={fbRange} onChange={setFbRange} lang={lang} />
              <select
                value={fbMinRating}
                onChange={(e) => setFbMinRating(Number(e.target.value))}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs"
              >
                <option value={0}>All ratings</option>
                <option value={5}>5★ only</option>
                <option value={4}>≥ 4★</option>
                <option value={3}>≥ 3★</option>
                <option value={2}>≥ 2★</option>
                <option value={1}>≥ 1★</option>
              </select>
            </div>
          </div>
          {filteredFeedback.length === 0 ? (
            <Empty label={t("stats_no_data", lang)} />
          ) : (
            <ul className="space-y-3">
              {filteredFeedback.map((f) => (
                <li key={f.id} className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-gold/40 px-2 py-0.5 text-xs text-gold">
                        Table {f.table_number}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${
                              n <= f.rating ? "fill-gold text-gold" : "text-muted-foreground/40"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.created_at).toLocaleString()}
                    </span>
                  </div>
                  {mealsByOrder.get(f.order_id) && (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      Order: {mealsByOrder.get(f.order_id)}
                    </p>
                  )}
                  {f.meal_comment && (
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">Meal: </span>{f.meal_comment}
                    </p>
                  )}
                  {f.restaurant_comment && (
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">Restaurant: </span>{f.restaurant_comment}
                    </p>
                  )}
                  {f.system_comment && (
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">System: </span>{f.system_comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function RangePicker({
  value,
  onChange,
  lang,
}: {
  value: Range;
  onChange: (v: Range) => void;
  lang: "en" | "am" | "sid";
}) {
  const opts: { v: Range; label: string }[] = [
    { v: "today", label: t("stats_today", lang) },
    { v: "week", label: t("stats_week", lang) },
    { v: "all", label: t("stats_all", lang) },
  ];
  return (
    <div className="inline-flex rounded-full border border-border bg-background/40 p-1">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-smooth ${
            value === o.v
              ? "bg-gradient-gold text-primary-foreground shadow-glow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <Settings className="h-8 w-8 opacity-30" />
      <p className="mt-2 text-sm">{label}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-lg text-foreground">{value}</div>
    </div>
  );
}
