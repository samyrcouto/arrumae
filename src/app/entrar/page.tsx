import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Alert, Card } from "@/components/ui";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; senha?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : user.role === "pro" ? "/profissional" : "/cliente");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-3xl font-bold">Entrar</h1>
      {sp.senha === "alterada" && <div className="mb-4"><Alert tone="ok">Senha alterada. Entre com a nova senha.</Alert></div>}
      <Card>
        <LoginForm next={sp.next} />
      </Card>
      <p className="mt-6 text-center">
        Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-brand underline">Cadastre-se</Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink-soft">
        Esqueceu a senha? Fale com o <Link href="/suporte" className="underline">suporte</Link> — a recuperação por e-mail ainda está em construção.
      </p>
    </div>
  );
}
