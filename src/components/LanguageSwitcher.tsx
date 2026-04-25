import { LANGS } from "@/lib/i18n";
import { useLang } from "@/lib/lang-context";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change language"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-2 text-sm font-medium text-foreground backdrop-blur transition-smooth hover:border-gold/60 hover:text-gold"
      >
        <Globe className="h-4 w-4" />
        {!compact && <span>{current.native}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={l.code === lang ? "text-gold" : ""}
          >
            <span className="font-display text-base">{l.native}</span>
            <span className="ml-auto text-xs text-muted-foreground">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
