export function MelaLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-display text-2xl font-semibold tracking-tight ${className}`}>
      <span className="text-gradient-gold">Sunny</span>
      <span className="ml-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">Burger</span>
    </span>
  );
}
