import { LinkButton } from "@/components/ui";

export default function NoPermission() {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <h1 className="text-3xl font-bold">Esta área não é para o seu tipo de conta</h1>
      <p className="mt-3 text-ink-soft">Se acha que isso é um engano, fale com o suporte.</p>
      <LinkButton href="/" className="mt-6">Voltar ao início</LinkButton>
    </div>
  );
}
