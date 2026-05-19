import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client.custom";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { pickLang } from "@/lib/i18n";
import { MelaLogo } from "@/components/MelaLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Search, Wine } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin_/pairings")({
  head: () => ({
    meta: [
      { title: "Drink Pairings — Mela" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pairings,
});

function Pairings() {
  const { lang } = useLang();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user || !(roles.includes("owner") || roles.includes("chef"))) {
      navigate({ to: "/staff/login" });
    }
  }, [user, roles, loading, navigate]);

  const load = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("category")
      .order("sort_order");
    setItems((data ?? []) as unknown as MenuItem[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_pairings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const drinks = useMemo(() => items.filter((i) => i.is_drink && i.is_available), [items]);
  const foods = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((i) => !i.is_drink);
    if (!q) return list;
    return list.filter((i) =>
      pickLang(i.name, lang).toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q),
    );
  }, [items, query, lang]);

  const grouped = useMemo(() => {
    const m = new Map<string, MenuItem[]>();
    for (const f of foods) {
      const arr = m.get(f.category) ?? [];
      arr.push(f);
      m.set(f.category, arr);
    }
    return Array.from(m.entries());
  }, [foods]);

  const updatePairing = async (foodId: string, drinkId: string | null) => {
    setSavingId(foodId);
    const { error } = await supabase
      .from("menu_items")
      .update({ recommended_item_id: drinkId })
      .eq("id", foodId);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pairing updated");
    setItems((prev) =>
      prev.map((i) => (i.id === foodId ? { ...i, recommended_item_id: drinkId } : i)),
    );
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/"><MelaLogo /></Link>
            <span className="rounded-full border border-gold/40 bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              <Wine className="mr-1 inline h-3 w-3" /> Pairings
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-gold hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl">Drink Pairings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the recommended drink shown to guests for each food item.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search food or category…"
              className="w-full rounded-full border border-border bg-input py-2 pl-9 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>
        </div>

        {drinks.length === 0 && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            No available drinks found. Add drinks in the menu first to enable pairings.
          </div>
        )}

        {grouped.length === 0 ? (
          <p className="text-muted-foreground">No food items match.</p>
        ) : (
          grouped.map(([cat, list]) => (
            <section key={cat} className="mb-8">
              <h2 className="mb-3 font-display text-2xl capitalize text-gold">{cat}</h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <ul className="divide-y divide-border">
                  {list.map((food) => {
                    const current = items.find((d) => d.id === food.recommended_item_id);
                    return (
                      <li
                        key={food.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {food.image_url ? (
                            <img
                              src={food.image_url}
                              alt={pickLang(food.name, lang)}
                              className="h-14 w-14 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-14 w-14 shrink-0 rounded-lg bg-muted" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-display text-lg">
                              {pickLang(food.name, lang)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {Number(food.price).toFixed(0)} ETB
                              {current && (
                                <span className="ml-2 text-gold">
                                  ↳ {pickLang(current.name, lang)}
                                </span>
                              )}
                              {!current && (
                                <span className="ml-2 text-muted-foreground/70">
                                  No pairing
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="w-full sm:w-72">
                          <Select
                            value={food.recommended_item_id ?? "__none"}
                            onValueChange={(v) =>
                              updatePairing(food.id, v === "__none" ? null : v)
                            }
                            disabled={savingId === food.id}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pick a drink" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">No pairing</SelectItem>
                              {drinks.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {pickLang(d.name, lang)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
