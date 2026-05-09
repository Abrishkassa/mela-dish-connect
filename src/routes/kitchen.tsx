import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client.custom";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { t, pickLang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MelaLogo } from "@/components/MelaLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, ChefHat, CheckCircle2, Clock, Flame, LogOut, Receipt, Settings } from "lucide-react";
import type { MenuItem, MultiLang } from "@/lib/types";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen Display — Mela" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Kitchen,
});

interface OrderItem {
  id: string;
  menu_item_id: string;
  name_snapshot: MultiLang;
  unit_price: number;
  quantity: number;
}

interface Order {
  id: string;
  table_number: number;
  status: "pending" | "cooking" | "served" | "cancelled";
  total: number;
  call_waiter: boolean;
  request_bill: boolean;
  created_at: string;
  notes: string | null;
  order_items: OrderItem[];
}

function isTakeawayNote(notes: string | null | undefined): boolean {
  if (!notes) return false;
  try {
    const p = JSON.parse(notes);
    return !!p?.takeaway;
  } catch {
    return false;
  }
}

function Kitchen() {
  const { lang } = useLang();
  const { user, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tab, setTab] = useState<"orders" | "stock">("orders");
  const [now, setNow] = useState(() => Date.now());

  // Tick every 30s so elapsed times & overdue flags update live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user || (!roles.includes("chef") && !roles.includes("owner"))) {
      navigate({ to: "/staff/login" });
    }
  }, [user, roles, loading, navigate]);

  useEffect(() => {
    const loadOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .in("status", ["pending", "cooking"])
        .order("created_at", { ascending: true });
      setOrders((data ?? []) as unknown as Order[]);
    };
    const loadItems = async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .order("category")
        .order("sort_order");
      setItems((data ?? []) as unknown as MenuItem[]);
    };
    loadOrders();
    loadItems();

    const channel = supabase
      .channel("kitchen_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          loadOrders();
          if (payload.eventType === "INSERT") {
            const o = payload.new as Order;
            if (o.call_waiter) toast(`🔔 Table ${o.table_number} — Waiter call`);
            else if (o.request_bill) toast(`🧾 Table ${o.table_number} — Bill request`);
            else toast(`🍽 New order · Table ${o.table_number}`);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadOrders(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => loadItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, status: "cooking" | "served") => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const toggleAvail = async (item: MenuItem) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    if (error) toast.error(error.message);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/"><MelaLogo /></Link>
            <span className="rounded-full border border-gold/40 bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              <ChefHat className="mr-1 inline h-3 w-3" /> {t("kitchen", lang)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {roles.includes("owner") && (
              <Link to="/admin" className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-gold hover:text-gold">
                <Settings className="mr-1.5 inline h-4 w-4" />
                {t("admin", lang)}
              </Link>
            )}
            <LanguageSwitcher compact />
            <ThemeToggle compact />
            <button
              onClick={() => signOut()}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-destructive hover:text-destructive"
            >
              <LogOut className="mr-1.5 inline h-4 w-4" />
              {t("log_out", lang)}
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-2 px-6 pb-3">
          <TabBtn active={tab === "orders"} onClick={() => setTab("orders")}>
            Orders ({orders.length})
          </TabBtn>
          <TabBtn active={tab === "stock"} onClick={() => setTab("stock")}>
            Stock ({items.length})
          </TabBtn>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {tab === "orders" ? (
          orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <ChefHat className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-display text-2xl text-muted-foreground">{t("no_orders", lang)}</p>
            </div>
          ) : (
            <>
              {(() => {
                const overdueCount = orders.filter(
                  (o) => !o.call_waiter && !o.request_bill && (now - new Date(o.created_at).getTime()) / 60000 > 30,
                ).length;
                if (overdueCount === 0) return null;
                return (
                  <div className="mb-4 flex items-center gap-3 rounded-2xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-destructive animate-pulse-glow">
                    <Bell className="h-5 w-5" />
                    <span className="font-medium">
                      {overdueCount} order{overdueCount > 1 ? "s" : ""} overdue (&gt; 30 min)
                    </span>
                  </div>
                );
              })()}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {orders.map((o) => (
                  <OrderCard key={o.id} order={o} lang={lang} now={now} onUpdate={updateStatus} />
                ))}
              </div>
            </>
          )
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
                {item.image_url && (
                  <img src={item.image_url} alt={pickLang(item.name, lang)} className="h-14 w-14 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg">{pickLang(item.name, lang)}</p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{item.category}</p>
                </div>
                <Switch
                  checked={item.is_available}
                  onCheckedChange={() => toggleAvail(item)}
                  aria-label="Available"
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-smooth ${
        active ? "bg-gradient-gold text-primary-foreground shadow-glow" : "border border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function OrderCard({
  order, lang, now, onUpdate,
}: {
  order: Order;
  lang: "en" | "am" | "sid";
  now: number;
  onUpdate: (id: string, s: "cooking" | "served") => void;
}) {
  const minutes = Math.floor((now - new Date(order.created_at).getTime()) / 60000);
  const isFlag = order.call_waiter || order.request_bill;
  const isOverdue = !isFlag && minutes > 30 && (order.status === "pending" || order.status === "cooking");
  const isTakeaway = isTakeawayNote(order.notes);
  const flagIcon = order.call_waiter ? <Bell className="h-5 w-5" /> : <Receipt className="h-5 w-5" />;
  const flagText = order.call_waiter ? "Waiter Call" : "Bill Request";

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-card p-4 shadow-card transition-smooth animate-fade-up ${
        isOverdue
          ? "border-destructive bg-destructive/5 animate-pulse-glow ring-2 ring-destructive/40"
          : isFlag
            ? "border-spice/60 animate-pulse-glow"
            : isTakeaway
              ? "border-gold ring-1 ring-gold/40"
              : order.status === "cooking"
                ? "border-gold/60"
                : "border-border"
      }`}
    >
      <header className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-2xl text-foreground">
          Table {order.table_number}
          {isTakeaway && (
            <span className="rounded-full border border-gold bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">
              🥡 Takeaway
            </span>
          )}
        </span>
        <span
          className={`flex items-center gap-1 text-xs ${
            isOverdue ? "font-semibold text-destructive" : "text-muted-foreground"
          }`}
        >
          {isOverdue && <Bell className="h-3 w-3" />}
          <Clock className="h-3 w-3" /> {minutes}m
          {isOverdue && <span className="ml-1 uppercase tracking-wider">{t("overdue", lang)}</span>}
        </span>
      </header>

      {isFlag ? (
        <div className="flex items-center gap-3 rounded-xl border border-spice/50 bg-spice/10 p-4 text-spice">
          {flagIcon}
          <span className="font-medium">{flagText}</span>
        </div>
      ) : (
        <ul className="flex-1 space-y-1.5 text-sm">
          {order.order_items.map((it) => (
            <li key={it.id} className="flex justify-between">
              <span className="text-foreground">
                <span className="text-gold">{it.quantity}×</span> {pickLang(it.name_snapshot, lang)}
              </span>
              <span className="text-muted-foreground">{(Number(it.unit_price) * it.quantity).toFixed(0)}</span>
            </li>
          ))}
        </ul>
      )}

      {!isFlag && (
        <>
          <div className="my-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("total", lang)}</span>
            <span className="font-display text-lg text-gold">{Number(order.total).toFixed(0)} ETB</span>
          </div>
          <div className="flex gap-2">
            {order.status === "pending" && (
              <button
                onClick={() => onUpdate(order.id, "cooking")}
                className="flex-1 rounded-full bg-gradient-gold py-2 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-95"
              >
                <Flame className="mr-1 inline h-4 w-4" />
                {t("mark_cooking", lang)}
              </button>
            )}
            {order.status === "cooking" && (
              <button
                onClick={() => onUpdate(order.id, "served")}
                className="flex-1 rounded-full border border-gold bg-card py-2 text-sm font-medium text-gold transition-smooth hover:bg-gold/10"
              >
                <CheckCircle2 className="mr-1 inline h-4 w-4" />
                {t("mark_served", lang)}
              </button>
            )}
          </div>
        </>
      )}
      {isFlag && (
        <button
          onClick={() => onUpdate(order.id, "served")}
          className="mt-3 rounded-full bg-gradient-gold py-2 text-sm font-medium text-primary-foreground"
        >
          <CheckCircle2 className="mr-1 inline h-4 w-4" /> Acknowledge
        </button>
      )}
    </article>
  );
}
