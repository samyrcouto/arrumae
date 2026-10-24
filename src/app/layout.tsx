import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Analytics } from "@/components/analytics";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { brand } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: brand.colors.primary, width: "device-width", initialScale: 1 };

function EnvBanner() {
  const env = process.env.APP_ENV ?? "development";
  if (env === "production") return null;
  return (
    <div className="tape-band px-4 py-1 text-center text-xs font-bold uppercase tracking-wide">
      <span className="rounded bg-ink px-2 py-0.5 text-paper">
        Ambiente de {env === "staging" ? "homologação" : "desenvolvimento"} — dados marcados como DEMO não são reais
      </span>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col antialiased">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Pular para o conteúdo
        </a>
        <EnvBanner />
        <SiteHeader />
        <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
          {children}
        </main>
        <SiteFooter />
        <Suspense>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
