import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ tipo?: string; next?: string }> }) {
  const sp = await searchParams;
  const role = sp.tipo === "profissional" ? "pro" : "client";
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">{role === "pro" ? "Cadastro de profissional" : "Criar conta"}</h1>
      <p className="mb-6 mt-1 text-ink-soft">
        {role === "pro"
          ? "Depois do cadastro, você completa o perfil e envia os documentos para análise."
          : "Para acompanhar suas solicitações e falar com os profissionais."}
      </p>
      <Card>
        <SignupForm role={role} next={sp.next} />
      </Card>
      <p className="mt-6 text-center">
        {role === "pro" ? (
          <>Quer contratar um serviço? <Link href="/cadastro" className="font-semibold text-brand underline">Cadastro de cliente</Link></>
        ) : (
          <>É profissional? <Link href="/cadastro?tipo=profissional" className="font-semibold text-brand underline">Cadastre-se aqui</Link></>
        )}
      </p>
      <p className="mt-2 text-center">
        Já tem conta? <Link href="/entrar" className="font-semibold text-brand underline">Entrar</Link>
      </p>
    </div>
  );
}
