import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client.custom";
import { CartProvider, useCart } from "@/lib/cart-context";
import { useLang } from "@/lib/lang-context";
import { t, pickLang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MelaLogo } from "@/components/MelaLogo";
import { categoryLabelKey, CATEGORY_KEYS, type MenuItem } from "@/lib/types";
import { ChefHat, Minus, Plus, ShoppingBag, Sparkles, Bell, Receipt, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

const MEAL_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "soft drinks", label: "Soft Drinks" },
  { value: "hot drinks", label: "Hot Drinks" },
];

export const Route = createFileRoute("/table/$tableNumber")({
  head: ({ params }) => ({
    meta: [
      { title: `Table ${params.tableNumber} — Mela Menu` },
      { name: "description", content: `Order from your table at Mela. Tri-lingual digital menu.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { addTo?: string } => {
    const addTo = typeof search.addTo === "string" ? search.addTo : undefined;
    return addTo ? { addTo } : {};
  },
  component: () => (
    <CartProvider>
      <TableMenu />
    </CartProvider>
  ),
});

function TableMenu() {
  const { tableNumber } = Route.useParams();
  const search = Route.useSearch() as { addTo?: string };
  const navigate = useNavigate();
  const { lang } = useLang();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairingFor, setPairingFor] = useState<MenuItem | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [checkingActive, setCheckingActive] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [takeaway, setTakeaway] = useState(false);

  const tableNum = parseInt(tableNumber, 10);
  const appendingToOrderId = search?.addTo ?? null;

  // On mount, check if this table already has an active (pending/cooking) order
  useEffect(() => {
    if (!Number.isFinite(tableNum)) {
      setCheckingActive(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status")
        .eq("table_number", tableNum)
        .in("status", ["pending", "cooking"])
        .eq("call_waiter", false)
        .eq("request_bill", false)
        .order("created_at", { ascending: false })
        .limit(1);
      const existing = data?.[0];
      if (existing && existing.id !== appendingToOrderId) {
        setActiveOrderId(existing.id);
      }
      setCheckingActive(false);
    };
    check();
  }, [tableNum, appendingToOrderId]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .order("sort_order", { ascending: true });
      setItems((data ?? []) as unknown as MenuItem[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("menu_items_public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const itemsById = useMemo(() => {
    const m = new Map<string, MenuItem>();
    items.forEach((i) => m.set(i.id, i));
    return m;
  }, [items]);

  const grouped = useMemo(() => {
    const g: Record<string, MenuItem[]> = {};
    for (const cat of CATEGORY_KEYS) g[cat] = [];
    for (const it of items) {
      if (g[it.category]) g[it.category].push(it);
      else (g[it.category] ??= []).push(it);
    }
    return g;
  }, [items]);

  const cart = useCart();

  const handleAdd = (item: MenuItem) => {
    cart.add(item);
    if (item.recommended_item_id) {
      const rec = itemsById.get(item.recommended_item_id);
      if (rec && rec.is_available) {
        setPairingFor(item);
        return;
      }
    }
    toast.success(pickLang(item.name, lang));
  };

  const sendOrder = async () => {
    if (cart.lines.length === 0) return;
    if (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > 999) {
      toast.error("Invalid table number");
      return;
    }

    let orderId = appendingToOrderId;

    // Append to existing order if requested
    if (orderId) {
      const oid = orderId;
      const { error: itemsErr } = await supabase.from("order_items").insert(
        cart.lines.map((l) => ({
          order_id: oid,
          menu_item_id: l.item.id,
          name_snapshot: l.item.name,
          unit_price: Number(l.item.price),
          quantity: l.qty,
        })),
      );
      if (itemsErr) {
        toast.error(itemsErr.message);
        return;
      }
      // Bump total
      const { data: existing } = await supabase
        .from("orders")
        .select("total")
        .eq("id", orderId)
        .single();
      if (existing) {
        await supabase
          .from("orders")
          .update({ total: Number(existing.total) + cart.total })
          .eq("id", orderId);
      }
    } else {
      const newOrderId = crypto.randomUUID();
      const { error } = await supabase
        .from("orders")
        .insert({
          id: newOrderId,
          table_number: tableNum,
          status: "pending" as const,
          total: cart.total,
          call_waiter: false,
          request_bill: false,
          notes: JSON.stringify({ takeaway }),
        });

      if (error) {
        toast.error(error?.message ?? "Could not send order");
        return;
      }

      orderId = newOrderId;

      const { error: itemsErr } = await supabase.from("order_items").insert(
        cart.lines.map((l) => ({
          order_id: newOrderId,
          menu_item_id: l.item.id,
          name_snapshot: l.item.name,
          unit_price: Number(l.item.price),
          quantity: l.qty,
        })),
      );
      if (itemsErr) {
        toast.error(itemsErr.message);
        return;
      }
    }

    toast.success(t("order_sent", lang));
    cart.clear();
    navigate({ to: "/track/$orderId", params: { orderId: orderId! } });
  };

  const callWaiter = async () => {
    const { error } = await supabase.rpc("call_waiter", { p_table_number: tableNum });
    if (error) toast.error(error.message);
    else toast.success(t("waiter_called", lang));
  };

  const requestBill = async () => {
    const { error } = await supabase.rpc("request_bill", { p_table_number: tableNum });
    if (error) toast.error(error.message);
    else toast.success(t("bill_requested", lang));
  };

  const recommendedItem = pairingFor?.recommended_item_id
    ? itemsById.get(pairingFor.recommended_item_id) ?? null
    : null;

  // Active-order gate: if this table already has a live order (and we're not adding to it), redirect to tracking
  if (checkingActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gradient-gold" />
      </div>
    );
  }

  if (activeOrderId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-3xl border border-gold/40 bg-card p-8 text-center shadow-elegant">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-glow">
            <Receipt className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl text-foreground">{t("active_order_exists", lang)}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("table", lang)} {tableNumber}
          </p>
          <Link
            to="/track/$orderId"
            params={{ orderId: activeOrderId }}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-gold px-6 py-3 font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-95"
          >
            {t("view_order", lang)}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center">
            <MelaLogo />
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-gold/40 bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              {t("table", lang)} {tableNumber}
            </span>
            <LanguageSwitcher compact />
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      {/* Meal-type filter chips */}
      <div className="sticky top-[57px] z-30 -mx-0 border-b border-border/40 bg-background">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MEAL_FILTERS.map((f) => {
            const active = activeFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider transition-smooth ${
                  active
                    ? "bg-gradient-gold text-primary-foreground shadow-glow"
                    : "border border-border bg-card text-muted-foreground hover:border-gold hover:text-gold"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <main className="mx-auto max-w-3xl px-4 pt-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : activeFilter === "all" ? (
          Object.keys(grouped).map((cat) =>
            grouped[cat] && grouped[cat].length > 0 ? (
              <section key={cat} className="mb-10">
                <h2 className="mb-4 flex items-center gap-3 font-display text-3xl text-foreground">
                  <span className="h-px w-8 bg-gradient-gold" />
                  {(CATEGORY_KEYS as readonly string[]).includes(cat)
                    ? t(categoryLabelKey(cat) as never, lang)
                    : cat.replace(/\b\w/g, (c) => c.toUpperCase())}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {grouped[cat].map((item) => (
                    <MenuCard key={item.id} item={item} onAdd={handleAdd} />
                  ))}
                </div>
              </section>
            ) : null,
          )
        ) : (
          (() => {
            const filtered = items.filter(
              (it) => (it.category ?? "").toLowerCase().trim() === activeFilter,
            );
            if (filtered.length === 0) {
              return (
                <div className="py-16 text-center text-muted-foreground">
                  No items in this category yet.
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <MenuCard key={item.id} item={item} onAdd={handleAdd} />
                ))}
              </div>
            );
          })()
        )}
      </main>

      {/* Floating actions */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-3">
        <button
          onClick={callWaiter}
          aria-label={t("call_waiter", lang)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-elegant transition-smooth hover:border-gold hover:text-gold"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          onClick={requestBill}
          aria-label={t("request_bill", lang)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-elegant transition-smooth hover:border-gold hover:text-gold"
        >
          <Receipt className="h-5 w-5" />
        </button>
      </div>

      {/* Cart bar */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between rounded-full bg-gradient-gold px-6 py-4 text-primary-foreground disabled:opacity-50" style={{transform: 'translateZ(0)', willChange: 'auto'}}>
            <span className="flex items-center gap-3 font-medium">
              <ShoppingBag className="h-5 w-5" />
              {cart.count > 0
                ? `${cart.count} · ${t("cart", lang)}`
                : t("cart", lang)}
            </span>
            <span className="font-display text-lg">
              {cart.total.toFixed(0)} ETB
            </span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl border-gold/30 bg-card">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">
              {t("table", lang)} {tableNumber} — {t("cart", lang)}
            </SheetTitle>
          </SheetHeader>
          {cart.lines.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t("empty_cart", lang)}</p>
          ) : (
            <>
              <ul className="max-h-[50vh] space-y-3 overflow-y-auto py-4">
                {cart.lines.map((l) => (
                  <li
                    key={l.item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{pickLang(l.item.name, lang)}</p>
                      <p className="text-sm text-muted-foreground">{Number(l.item.price).toFixed(0)} ETB</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => cart.decrement(l.item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:border-gold"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-medium">{l.qty}</span>
                      <button
                        onClick={() => cart.add(l.item)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:border-gold"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTakeaway(false)}
                  className={`rounded-full py-2.5 text-sm font-medium transition-smooth ${
                    !takeaway
                      ? "bg-gradient-gold text-primary-foreground shadow-glow"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🍽️ Dine-in
                </button>
                <button
                  type="button"
                  onClick={() => setTakeaway(true)}
                  className={`rounded-full py-2.5 text-sm font-medium transition-smooth ${
                    takeaway
                      ? "bg-gradient-gold text-primary-foreground shadow-glow"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🥡 Takeaway
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-muted-foreground">{t("total", lang)}</span>
                <span className="font-display text-2xl text-gold">{cart.total.toFixed(0)} ETB</span>
              </div>
              <button
                onClick={sendOrder}
                className="mt-4 w-full rounded-full bg-gradient-gold py-3.5 font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-95"
              >
                {t("send_order", lang)}
              </button>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Chef recommendation modal */}
      <Dialog open={!!pairingFor} onOpenChange={(o) => !o && setPairingFor(null)}>
        <DialogContent className="border-gold/40 bg-card sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-glow">
              <ChefHat className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center font-display text-2xl text-gold">
              <Sparkles className="mr-2 inline h-4 w-4" />
              {t("chefs_pairing", lang)}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("pairing_intro", lang)}
            </DialogDescription>
          </DialogHeader>

          {recommendedItem && (
            <div className="my-2 flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4">
              {recommendedItem.image_url && (
                <img
                  src={recommendedItem.image_url}
                  alt={pickLang(recommendedItem.name, lang)}
                  className="h-16 w-16 rounded-lg object-cover"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg text-foreground">{pickLang(recommendedItem.name, lang)}</p>
                <p className="text-sm text-muted-foreground">{Number(recommendedItem.price).toFixed(0)} ETB</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              onClick={() => setPairingFor(null)}
              className="rounded-full border border-border bg-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
            >
              {t("no_thanks", lang)}
            </button>
            <button
              onClick={() => {
                if (recommendedItem) cart.add(recommendedItem);
                setPairingFor(null);
              }}
              disabled={!recommendedItem}
              className="rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-95 disabled:opacity-50"
            >
              {t("add_pairing", lang)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuCard({ item, onAdd }: { item: MenuItem; onAdd: (i: MenuItem) => void }) {
  const { lang } = useLang();
  const unavailable = !item.is_available;

  return (
    <article
      className={`group relative flex gap-4 rounded-2xl border border-border bg-card p-3 ${
        unavailable ? "opacity-60" : ""
      }`}
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={pickLang(item.name, lang)}
          className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
          loading="lazy"
        />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:h-28 sm:w-28">
          <ChefHat className="h-6 w-6" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-display text-lg text-foreground sm:text-xl">
            {pickLang(item.name, lang)}
          </h3>
          {item.recommended_item_id && (
            <span className="shrink-0 rounded-full border border-gold/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
              <ChefHat className="mr-1 inline h-3 w-3" />
              Pairing
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {pickLang(item.description as never, lang)}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-display text-lg text-gold">{Number(item.price).toFixed(0)} ETB</span>
          {unavailable ? (
            <span className="rounded-full border border-destructive/50 px-3 py-1 text-xs text-destructive">
              <X className="mr-1 inline h-3 w-3" />
              {t("out_of_stock", lang)}
            </span>
          ) : (
            <button
              onClick={() => onAdd(item)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-4 py-1.5 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              {t("add_to_cart", lang)}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
