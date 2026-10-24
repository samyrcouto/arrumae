import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <p className="font-display text-6xl font-extrabold text-tape">404</p>
      <h1 className="mt-2 text-3xl font-bold">Não encontramos esta página</h1>
      <p className="mt-3 text-ink-soft">O endereço pode estar errado ou o conteúdo não está disponível para a sua conta.</p>
      <LinkButton href="/" className="mt-6">Voltar ao início</LinkButton>
    </div>
  );
}
