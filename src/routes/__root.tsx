import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { LanguageProvider } from "@/lib/lang-context";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl font-semibold text-gradient-gold">404</h1>
        <h2 className="mt-4 font-display text-2xl text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
          >
            Back to Mela
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mela — Hawassa's Digital Menu" },
      { name: "description", content: "Tri-lingual QR menu for the resorts of Lake Hawassa. Order from your table in English, Amharic, or Sidaamu Afoo." },
      { name: "author", content: "Mela" },
      { name: "theme-color", content: "#2a1f15" },
      { property: "og:title", content: "Mela — Hawassa's Digital Menu" },
      { property: "og:description", content: "Tri-lingual QR menu for the resorts of Lake Hawassa. Order from your table in English, Amharic, or Sidaamu Afoo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Mela — Hawassa's Digital Menu" },
      { name: "twitter:description", content: "Tri-lingual QR menu for the resorts of Lake Hawassa. Order from your table in English, Amharic, or Sidaamu Afoo." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/29c0f4a3-903b-4b77-a14b-34956bdd373c/id-preview-531f0715--427c2dc3-475e-4945-a658-efbb55585925.lovable.app-1777109171029.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/29c0f4a3-903b-4b77-a14b-34956bdd373c/id-preview-531f0715--427c2dc3-475e-4945-a658-efbb55585925.lovable.app-1777109171029.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" />
      </AuthProvider>
    </LanguageProvider>
  );
}
