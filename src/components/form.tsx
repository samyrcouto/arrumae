"use client";

import { type ReactNode, use, useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/action-result";
import { Alert, Button, type ButtonVariant, cx } from "./ui";

import { FormCtx } from "./form-context";

/**
 * Formulário ligado a uma Server Action com estado (erros por campo).
 * Funciona sem JavaScript (progressive enhancement); com JS, mostra erros
 * sem recarregar a página.
 */
export function ActionForm({
  action,
  children,
  className,
  encType,
  resetOnSuccess,
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  encType?: "multipart/form-data";
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <FormCtx value={state}>
      <form ref={formRef} action={formAction} className={cx("space-y-4", className)} encType={encType} noValidate>
        {state?.message && (
          <Alert tone={state.ok ? "ok" : "danger"}>{state.message}</Alert>
        )}
        {children}
      </form>
    </FormCtx>
  );
}

export function useFieldError(name: string) {
  return use(FormCtx)?.fieldErrors?.[name];
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingLabel = "Enviando…",
  name,
  value,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-busy={pending} className={className} name={name} value={value}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/70 focus:border-brand focus:outline-none aria-[invalid=true]:border-danger";

type FieldProps = {
  label: string;
  name: string;
  hint?: ReactNode;
  className?: string;
};

function FieldShell({ label, name, hint, className, id, children }: FieldProps & { id: string; children: ReactNode }) {
  const error = useFieldError(name);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ label, name, hint, className, ...props }: FieldProps & Omit<React.ComponentProps<"input">, "name">) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <FieldShell label={label} name={name} hint={hint} className={className} id={id}>
      <input
        id={id}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={inputCls}
        {...props}
      />
    </FieldShell>
  );
}

export function Textarea({ label, name, hint, className, ...props }: FieldProps & Omit<React.ComponentProps<"textarea">, "name">) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <FieldShell label={label} name={name} hint={hint} className={className} id={id}>
      <textarea
        id={id}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cx(inputCls, "min-h-28")}
        {...props}
      />
    </FieldShell>
  );
}

export function Select({
  label,
  name,
  hint,
  className,
  options,
  ...props
}: FieldProps & Omit<React.ComponentProps<"select">, "name"> & { options: { value: string; label: string }[] }) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <FieldShell label={label} name={name} hint={hint} className={className} id={id}>
      <select id={id} name={name} aria-invalid={!!error} className={inputCls} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Checkbox({ name, children, defaultChecked, required }: { name: string; children: ReactNode; defaultChecked?: boolean; required?: boolean }) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={!!error}
          className="mt-1 size-5 shrink-0 accent-brand"
        />
        <span className="text-[0.95rem]">{children}</span>
      </label>
      {error && <p className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

/** Grupo de opções grandes (radio) — mais fácil no celular que um select. */
export function ChoiceGroup({
  name,
  legend,
  options,
  defaultValue,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string; description?: string }[];
  defaultValue?: string;
}) {
  const error = useFieldError(name);
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer flex-col rounded-xl border border-line bg-white p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
          >
            <span className="flex items-center gap-2 font-semibold">
              <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="accent-brand" />
              {o.label}
            </span>
            {o.description && <span className="mt-0.5 text-sm text-ink-soft">{o.description}</span>}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}
