import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client.custom";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { pickLang } from "@/lib/i18n";
import { MelaLogo } from "@/components/MelaLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Search, Wine, CheckSquare, Square } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

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
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDrinkId, setBulkDrinkId] = useState<string>("");
  const [applying, setApplying] = useState(false);

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

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (list: MenuItem[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = list.every((i) => next.has(i.id));
      if (allIn) list.forEach((i) => next.delete(i.id));
      else list.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === foods.length && foods.length > 0) return new Set();
      return new Set(foods.map((f) => f.id));
    });
  };

  const exitBulk = () => {
    setBulkMode(false);
    setSelected(new Set());
    setBulkDrinkId("");
  };

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

  const applyBulk = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one food item");
      return;
    }
    if (!bulkDrinkId) {
      toast.error("Pick a drink to apply");
      return;
    }
    const ids = Array.from(selected);
    const drinkId = bulkDrinkId === "__none" ? null : bulkDrinkId;
    setApplying(true);
    const { error } = await supabase
      .from("menu_items")
      .update({ recommended_item_id: drinkId })
      .in("id", ids);
    setApplying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Updated ${ids.length} item${ids.length === 1 ? "" : "s"}`);
    setItems((prev) =>
      prev.map((i) => (selected.has(i.id) ? { ...i, recommended_item_id: drinkId } : i)),
    );
    exitBulk();
  };

  if (loading || !user) return null;

  const allSelected = foods.length > 0 && selected.size === foods.length;

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            <Button
              variant={bulkMode ? "default" : "outline"}
              onClick={() => (bulkMode ? exitBulk() : setBulkMode(true))}
              className={bulkMode ? "bg-gold text-background hover:bg-gold/90" : ""}
            >
              {bulkMode ? "Exit bulk" : "Bulk mode"}
            </Button>
          </div>
        </div>

        {drinks.length === 0 && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            No available drinks found. Add drinks in the menu first to enable pairings.
          </div>
        )}

        {bulkMode && (
          <div className="sticky top-2 z-20 mb-6 flex flex-col gap-3 rounded-2xl border border-gold/40 bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold"
              >
                {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                {allSelected ? "Deselect all" : "Select all visible"}
              </button>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs">
                {selected.size} selected
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-64">
                <Select value={bulkDrinkId} onValueChange={setBulkDrinkId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a drink to apply…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Clear pairing</SelectItem>
                    {drinks.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {pickLang(d.name, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={applyBulk}
                disabled={applying || selected.size === 0 || !bulkDrinkId}
                className="bg-gold text-background hover:bg-gold/90"
              >
                {applying ? "Applying…" : `Apply to ${selected.size}`}
              </Button>
            </div>
          </div>
        )}

        {grouped.length === 0 ? (
          <p className="text-muted-foreground">No food items match.</p>
        ) : (
          grouped.map(([cat, list]) => {
            const catAllSelected = bulkMode && list.every((i) => selected.has(i.id));
            return (
            <section key={cat} className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-2xl capitalize text-gold">{cat}</h2>
                {bulkMode && (
                  <button
                    onClick={() => toggleCategory(list)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold"
                  >
                    {catAllSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    {catAllSelected ? "Deselect category" : "Select category"}
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <ul className="divide-y divide-border">
                  {list.map((food) => {
                    const current = items.find((d) => d.id === food.recommended_item_id);
                    const isSelected = selected.has(food.id);
                    return (
                      <li
                        key={food.id}
                        className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                          bulkMode && isSelected ? "bg-gold/5" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {bulkMode && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleOne(food.id)}
                              aria-label="Select item"
                            />
                          )}
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
                        {!bulkMode && (
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
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
            );
          })
        )}
      </main>
    </div>
  );
}
