"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createRequestAction } from "@/server/actions/requests";
import { getUtm, track } from "./analytics";
import { SignupFields } from "./auth-forms";
import { CategoryArt } from "./illustrations";
import { ChoiceGroup, Input, Textarea } from "./form";
import { FormContextProvider } from "./form-context";
import { Alert, Button, cx } from "./ui";

type Category = { id: string; slug: string; name: string; shortDescription: string; examples: string[]; outOfScope: string[] };

const STEP_FIELDS: Record<number, string[]> = {
  0: ["categoryId", "title", "description", "photos"],
  1: ["cep", "neighborhood", "addressLine", "addressComplement", "urgency", "preferredWindow"],
  2: ["name", "email", "phone", "password", "acceptTerms"],
};

function Submit({ loggedIn }: { loggedIn: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Enviando pedido…" : loggedIn ? "Enviar pedido" : "Criar conta e enviar pedido"}
    </Button>
  );
}

export function RequestWizard({
  categories,
  initialCategory,
  initialTitle,
  loggedIn,
  regionsText,
}: {
  categories: Category[];
  initialCategory?: string;
  initialTitle?: string;
  loggedIn: boolean;
  regionsText: string;
}) {
  const [state, formAction] = useActionState(createRequestAction, null);
  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState(categories.find((c) => c.slug === initialCategory)?.id ?? "");
  const [token] = useState(() => crypto.randomUUID());
  const [photoCount, setPhotoCount] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const category = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    track("request_started", initialCategory ? { category: initialCategory } : {});
  }, [initialCategory]);

  // Se o servidor devolver erro, volta para a etapa do primeiro campo com problema
  // (ajuste de estado durante a renderização, padrão recomendado pelo React).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.fieldErrors) {
      const first = Object.keys(state.fieldErrors)[0];
      setStep(Number(Object.entries(STEP_FIELDS).find(([, f]) => f.includes(first))?.[0] ?? step));
    }
  }
  useEffect(() => {
    if (state && !state.ok) topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state]);

  // UTM é lido no envio (fica no sessionStorage do navegador).
  const fillUtm = (e: React.FormEvent<HTMLFormElement>) => {
    const utm = getUtm();
    const f = e.currentTarget;
    (f.elements.namedItem("utmSource") as HTMLInputElement).value = utm.utmSource ?? "";
    (f.elements.namedItem("utmMedium") as HTMLInputElement).value = utm.utmMedium ?? "";
    (f.elements.namedItem("utmCampaign") as HTMLInputElement).value = utm.utmCampaign ?? "";
  };

  const go = (n: number) => {
    setStep(n);
    track("request_step", { step: n });
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const steps = ["O que precisa", "Onde e quando", loggedIn ? "Confirmar" : "Seus dados"];

  return (
    <div ref={topRef} className="scroll-mt-24">
      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Etapas">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}>
            <div className={cx("h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-line")} />
            <p className={cx("mt-1.5 text-sm", i === step ? "font-semibold" : "text-ink-soft")}>{s}</p>
          </li>
        ))}
      </ol>

      <FormContextProvider value={state}>
        <form action={formAction} onSubmit={fillUtm} className="space-y-5" noValidate>
          {state?.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
          <input type="hidden" name="submissionToken" value={token} />
          <input type="hidden" name="utmSource" defaultValue="" />
          <input type="hidden" name="utmMedium" defaultValue="" />
          <input type="hidden" name="utmCampaign" defaultValue="" />
          <input type="hidden" name="categoryId" value={categoryId} />

          {/* Etapa 1 */}
          <div hidden={step !== 0} className="space-y-5">
            <fieldset>
              <legend className="mb-2 font-semibold">Tipo de serviço</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    aria-pressed={c.id === categoryId}
                    className={cx(
                      "flex items-center gap-3 rounded-2xl border bg-white p-3 text-left",
                      c.id === categoryId ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-line",
                    )}
                  >
                    <CategoryArt slug={c.slug} className="size-12 shrink-0" />
                    <span className="font-semibold">{c.name}</span>
                  </button>
                ))}
              </div>
              {state?.fieldErrors?.categoryId && <p className="mt-1 text-sm font-medium text-danger">{state.fieldErrors.categoryId}</p>}
            </fieldset>

            {category && (
              <div className="rounded-2xl bg-paper p-4 text-[0.95rem]">
                <p><strong>Exemplos:</strong> {category.examples.join(" · ")}</p>
                {category.outOfScope.length > 0 && (
                  <p className="mt-1 text-ink-soft"><strong>Não atendemos:</strong> {category.outOfScope.join(" · ")}</p>
                )}
              </div>
            )}

            <Input label="Resumo do serviço" name="title" placeholder="Ex.: Trocar chuveiro elétrico" maxLength={80} defaultValue={initialTitle} required />
            <Textarea
              label="Descreva o que está acontecendo"
              name="description"
              maxLength={2000}
              placeholder="Ex.: O chuveiro parou de esquentar. Já comprei um novo, 220V. Fica no banheiro do 2º andar."
              hint="Quanto mais detalhes (medidas, marca, voltagem, andar), mais preciso o preço."
              required
            />
            <div>
              <label htmlFor="photos" className="mb-1.5 block font-semibold">Fotos (opcional, até 5)</label>
              <input
                id="photos"
                name="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setPhotoCount(e.target.files?.length ?? 0)}
                className="block w-full rounded-xl border border-dashed border-line bg-white p-3 file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand"
              />
              <p className="mt-1 text-sm text-ink-soft">
                {photoCount > 5 ? <span className="text-danger">Selecione no máximo 5 fotos.</span> : "Fotos ajudam o profissional a entender o problema. Removemos a localização das imagens."}
              </p>
            </div>
            <Button type="button" onClick={() => go(1)} disabled={!categoryId} className="w-full sm:w-auto">
              Continuar
            </Button>
          </div>

          {/* Etapa 2 */}
          <div hidden={step !== 1} className="space-y-5">
            <Alert tone="tape">Atendemos por enquanto: {regionsText}.</Alert>
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <Input label="CEP" name="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9} required />
              <Input label="Bairro" name="neighborhood" autoComplete="address-level3" required />
            </div>
            <Input
              label="Rua e número"
              name="addressLine"
              autoComplete="address-line1"
              hint="Só será mostrado ao profissional que você escolher, depois do agendamento."
              required
            />
            <Input label="Complemento (opcional)" name="addressComplement" autoComplete="address-line2" placeholder="Apto, bloco, referência" />
            <ChoiceGroup
              name="urgency"
              legend="Para quando?"
              defaultValue="this_week"
              options={[
                { value: "today", label: "Hoje", description: "É urgente" },
                { value: "this_week", label: "Esta semana", description: "Nos próximos dias" },
                { value: "flexible", label: "Sem pressa", description: "Quando der" },
              ]}
            />
            <Input label="Melhores dias e horários (opcional)" name="preferredWindow" placeholder="Ex.: sábado de manhã ou depois das 18h" maxLength={160} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => go(0)}>Voltar</Button>
              <Button type="button" onClick={() => go(2)}>Continuar</Button>
            </div>
          </div>

          {/* Etapa 3 */}
          <div hidden={step !== 2} className="space-y-5">
            {loggedIn ? (
              <p className="text-ink-soft">Tudo certo? Ao enviar, profissionais verificados da sua região serão avisados.</p>
            ) : (
              <>
                <p className="text-ink-soft">
                  Crie sua conta para acompanhar as propostas. Seus dados não são mostrados aos profissionais antes de você
                  escolher um deles.
                </p>
                <SignupFields role="client" />
              </>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => go(1)}>Voltar</Button>
              <Submit loggedIn={loggedIn} />
            </div>
            <p className="text-sm text-ink-soft">Pedir é grátis e sem compromisso.</p>
          </div>
        </form>
      </FormContextProvider>
    </div>
  );
}
