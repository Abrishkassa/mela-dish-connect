import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client.custom";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { t, pickLang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MelaLogo } from "@/components/MelaLogo";
import { ChefHat, Crown, LogOut, Pencil, Plus, Trash2, Utensils } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { CATEGORY_KEYS } from "@/lib/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Owner Admin — Mela" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

interface Form {
  id: string | null;
  name_en: string;
  name_am: string;
  name_sid: string;
  desc_en: string;
  desc_am: string;
  desc_sid: string;
  price: string;
  category: string;
  image_url: string;
  is_drink: boolean;
  is_available: boolean;
  recommended_item_id: string | null;
  sort_order: number;
}

const empty = (): Form => ({
  id: null,
  name_en: "",
  name_am: "",
  name_sid: "",
  desc_en: "",
  desc_am: "",
  desc_sid: "",
  price: "",
  category: "mains",
  image_url: "",
  is_drink: false,
  is_available: true,
  recommended_item_id: null,
  sort_order: 0,
});

function Admin() {
  const { lang } = useLang();
  const { user, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty());

  useEffect(() => {
    if (loading) return;
    if (!user || !roles.includes("owner")) navigate({ to: "/staff/login" });
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
      .channel("admin_menu")
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

  const drinks = useMemo(() => items.filter((i) => i.is_drink), [items]);

  const startNew = () => {
    setForm(empty());
    setOpen(true);
  };
  const startEdit = (i: MenuItem) => {
    setForm({
      id: i.id,
      name_en: i.name.en ?? "",
      name_am: i.name.am ?? "",
      name_sid: i.name.sid ?? "",
      desc_en: (i.description as Record<string, string>)?.en ?? "",
      desc_am: (i.description as Record<string, string>)?.am ?? "",
      desc_sid: (i.description as Record<string, string>)?.sid ?? "",
      price: String(i.price),
      category: i.category,
      image_url: i.image_url ?? "",
      is_drink: i.is_drink,
      is_available: i.is_available,
      recommended_item_id: i.recommended_item_id,
      sort_order: i.sort_order,
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      name: { en: form.name_en, am: form.name_am, sid: form.name_sid },
      description: { en: form.desc_en, am: form.desc_am, sid: form.desc_sid },
      price: Number(form.price),
      category: form.category,
      image_url: form.image_url || null,
      is_drink: form.is_drink,
      is_available: form.is_available,
      recommended_item_id: form.recommended_item_id,
      sort_order: form.sort_order,
    };
    if (form.id) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("menu_items").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Deleted");
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/"><MelaLogo /></Link>
            <span className="rounded-full border border-gold/40 bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              <Crown className="mr-1 inline h-3 w-3" /> {t("admin", lang)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/kitchen" className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-gold hover:text-gold">
              <ChefHat className="mr-1.5 inline h-4 w-4" /> {t("kitchen", lang)}
            </Link>
            <LanguageSwitcher compact />
            <button
              onClick={() => signOut()}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-destructive hover:text-destructive"
            >
              <LogOut className="mr-1.5 inline h-4 w-4" /> {t("log_out", lang)}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-4xl">Menu</h1>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> {t("add_item", lang)}
          </button>
        </div>

        {CATEGORY_KEYS.map((cat) => {
          const list = items.filter((i) => i.category === cat);
          if (list.length === 0) return null;
          return (
            <section key={cat} className="mb-8">
              <h2 className="mb-3 font-display text-2xl text-gold capitalize">{cat}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((item) => (
                  <article key={item.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={pickLang(item.name, lang)} className="h-20 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Utensils className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate font-display text-lg">{pickLang(item.name, lang)}</p>
                      <p className="text-xs text-muted-foreground">{Number(item.price).toFixed(0)} ETB · {item.is_available ? t("available", lang) : t("out_of_stock", lang)}</p>
                      {item.recommended_item_id && (
                        <p className="mt-1 truncate text-xs text-gold">
                          ↳ {pickLang(items.find((x) => x.id === item.recommended_item_id)?.name as never, lang)}
                        </p>
                      )}
                      <div className="mt-auto flex gap-1 pt-2">
                        <button onClick={() => startEdit(item)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:border-gold hover:text-gold">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(item.id)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-gold/40 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {form.id ? t("edit_item", lang) : t("add_item", lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <Field label={t("name_en", lang)} value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} />
            <Field label={t("name_am", lang)} value={form.name_am} onChange={(v) => setForm({ ...form, name_am: v })} />
            <Field label={t("name_sid", lang)} value={form.name_sid} onChange={(v) => setForm({ ...form, name_sid: v })} />
            <Field label={t("price", lang)} value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />

            <Field label="Description (EN)" value={form.desc_en} onChange={(v) => setForm({ ...form, desc_en: v })} />
            <Field label="መግለጫ (AM)" value={form.desc_am} onChange={(v) => setForm({ ...form, desc_am: v })} />
            <Field label="Xawishsha (SID)" value={form.desc_sid} onChange={(v) => setForm({ ...form, desc_sid: v })} />
            <Field label={t("image_url", lang)} value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("category", lang)}</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, is_drink: v === "drinks" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_KEYS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("recommended", lang)}</label>
              <Select
                value={form.recommended_item_id ?? "__none"}
                onValueChange={(v) => setForm({ ...form, recommended_item_id: v === "__none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t("none", lang)}</SelectItem>
                  {drinks.filter((d) => d.id !== form.id).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{pickLang(d.name, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3 md:col-span-2">
              <span className="text-sm">{t("available", lang)}</span>
              <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-5 py-2 text-sm hover:text-foreground">{t("cancel", lang)}</button>
            <button onClick={save} className="rounded-full bg-gradient-gold px-6 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-95">{t("save", lang)}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
    </div>
  );
}
