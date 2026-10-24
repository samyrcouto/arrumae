"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const CONSENT_KEY = "dc_consent";
const UTM_KEY = "dc_utm";

type Utm = { utmSource?: string; utmMedium?: string; utmCampaign?: string };

function readConsent(): "analytics" | "essential" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "analytics" || v === "essential" ? v : null;
  } catch {
    return null;
  }
}

/** Atribuição de campanha (primeiro toque da sessão). Não contém dados pessoais. */
export function getUtm(): Utm {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) ?? "{}") as Utm;
  } catch {
    return {};
  }
}

function anonId(): string | null {
  if (readConsent() !== "analytics") return null;
  try {
    let id = localStorage.getItem("dc_aid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("dc_aid", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(name: string, props: Record<string, string | number | boolean> = {}) {
  const body = JSON.stringify({
    name,
    path: location.pathname,
    anonId: anonId(),
    referrerHost: document.referrer ? new URL(document.referrer).host : null,
    ...getUtm(),
    props,
  });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else void fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    /* analytics nunca quebra a página */
  }
}

const consentListeners = new Set<() => void>();
const consentStore = {
  subscribe(cb: () => void) {
    consentListeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      consentListeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  },
  get: () => readConsent(),
  // No servidor ainda não sabemos a escolha: não renderiza o aviso.
  getServer: () => "pending" as const,
};

/** Captura UTM, registra visualizações e mostra o aviso de cookies. */
export function Analytics() {
  const pathname = usePathname();
  const search = useSearchParams();
  const consent = useSyncExternalStore(consentStore.subscribe, consentStore.get, consentStore.getServer);

  useEffect(() => {
    const utm: Utm = {
      utmSource: search.get("utm_source") ?? undefined,
      utmMedium: search.get("utm_medium") ?? undefined,
      utmCampaign: search.get("utm_campaign") ?? undefined,
    };
    try {
      if (utm.utmSource && !sessionStorage.getItem(UTM_KEY)) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    } catch {
      /* armazenamento indisponível */
    }
    track(pathname.startsWith("/servicos") ? "landing_view" : "page_view");
  }, [pathname, search]);

  if (consent !== null) return null;
  const choose = (v: "analytics" | "essential") => {
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {
      /* ignore */
    }
    consentListeners.forEach((cb) => cb());
  };
  return (
    <div role="dialog" aria-label="Aviso de privacidade" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-card p-4 shadow-lg">
      <p className="text-[0.95rem]">
        Usamos apenas cookies essenciais para você entrar na conta. Com sua permissão, também medimos o uso do site de forma
        anônima para melhorar o serviço. Não usamos rastreadores de terceiros.{" "}
        <a href="/privacidade" className="font-semibold text-brand underline">Saiba mais</a>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => choose("analytics")} className="min-h-11 rounded-full bg-brand px-4 font-semibold text-white">
          Permitir medição anônima
        </button>
        <button onClick={() => choose("essential")} className="min-h-11 rounded-full border border-line px-4 font-semibold">
          Somente essenciais
        </button>
      </div>
    </div>
  );
}
