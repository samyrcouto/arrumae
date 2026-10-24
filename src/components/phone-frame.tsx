import Image from "next/image";
import { cx } from "./ui";

/**
 * Moldura de celular com uma captura REAL do app (public/marketing/*.webp,
 * geradas por `npm run vitrine` com dados de demonstração).
 */
export function PhoneFrame({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cx("rounded-[2.2rem] bg-ink p-2 shadow-[0_30px_60px_-25px_rgba(24,32,44,0.55)]", className)}>
      <div className="relative overflow-hidden rounded-[1.7rem] bg-paper">
        <div className="absolute left-1/2 top-1.5 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-ink/80" aria-hidden />
        <Image src={src} alt={alt} width={780} height={1560} className="h-auto w-full" priority={priority} sizes="(min-width: 1024px) 260px, 60vw" />
      </div>
    </div>
  );
}
