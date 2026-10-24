"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <h1 className="text-3xl font-bold">Algo deu errado</h1>
      <p className="mt-3 text-ink-soft">Nada foi perdido. Tente de novo; se continuar, fale com o suporte.</p>
      <Button className="mt-6" onClick={reset}>Tentar de novo</Button>
    </div>
  );
}
