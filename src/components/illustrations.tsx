/**
 * Ilustrações próprias do Arrumaê (SVG inline, sem dependências).
 * Estilo: formas chapadas com contorno tinta, paleta da marca (globals.css).
 * Para trocar por fotos no futuro, basta substituir o componente onde é usado.
 */
import type { ReactNode } from "react";

const INK = "var(--color-ink)";
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Sparkle({ x, y, r = 8 }: { x: number; y: number; r?: number }) {
  return (
    <path
      d={`M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`}
      fill="var(--color-tape)"
      {...S}
      strokeWidth={2}
    />
  );
}

/** Trena esticada: assinatura visual da marca. */
function TapeBlade({ x, y, w }: { x: number; y: number; w: number }) {
  const ticks: ReactNode[] = [];
  for (let i = 6; i < w - 2; i += 8)
    ticks.push(<path key={i} d={`M${x + i} ${y} v${i % 40 === 6 ? 7 : 4}`} stroke={INK} strokeWidth={1.4} />);
  return (
    <g>
      <rect x={x} y={y} width={w} height={13} rx={2} fill="var(--color-tape)" {...S} strokeWidth={2.5} />
      {ticks}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Cena principal: sala sendo arrumada
// ---------------------------------------------------------------------------

export function HeroScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 440" className={className} role="img" aria-label="Ilustração: sala com prateleira instalada, quadro alinhado, caixa de ferramentas e trena">
      <rect x="18" y="26" width="484" height="392" rx="40" fill="var(--color-tape-soft)" />
      {/* parede: textura de pontos */}
      {Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 10 }, (_, c) => <circle key={`${r}-${c}`} cx={58 + c * 44} cy={62 + r * 44} r={2} fill="var(--color-tape)" opacity={0.55} />),
      )}

      {/* luminária pendente */}
      <path d="M432 26v120" stroke={INK} strokeWidth={3} />
      <path d="M392 196l40-50 40 50z" fill="var(--color-tape)" opacity={0.28} />
      <path d="M404 146h56l-10 30h-36z" fill="var(--color-brand)" {...S} />
      <circle cx="432" cy="182" r="7" fill="var(--color-tape)" {...S} strokeWidth={2.5} />

      {/* quadro alinhado + selo de ok */}
      <rect x="236" y="72" width="128" height="92" rx="6" fill="#fff" {...S} />
      <rect x="248" y="84" width="104" height="68" rx="3" fill="var(--color-brand-soft)" />
      <circle cx="326" cy="104" r="11" fill="var(--color-tape)" {...S} strokeWidth={2.5} />
      <path d="M250 150l30-34 22 22 16-14 34 26z" fill="var(--color-brand)" {...S} strokeWidth={2.5} />
      <circle cx="364" cy="72" r="16" fill="var(--color-brand)" {...S} />
      <path d="M356 72l6 6 11-12" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* prateleira com nível e objetos */}
      <rect x="62" y="206" width="210" height="14" rx="3" fill="var(--color-wood)" {...S} />
      <path d="M86 220v18h14M248 220v18h-14" fill="none" {...S} />
      <rect x="80" y="160" width="16" height="46" rx="2" fill="var(--color-brand)" {...S} strokeWidth={2.5} />
      <rect x="98" y="168" width="14" height="38" rx="2" fill="var(--color-clay)" {...S} strokeWidth={2.5} />
      <rect x="114" y="174" width="12" height="32" rx="2" fill="var(--color-tape)" {...S} strokeWidth={2.5} />
      <rect x="150" y="190" width="86" height="16" rx="5" fill="var(--color-tape)" {...S} strokeWidth={2.5} />
      <rect x="180" y="194" width="26" height="8" rx="4" fill="#d6f0d0" stroke={INK} strokeWidth={1.8} />
      <circle cx="193" cy="198" r="2.6" fill="var(--color-leaf)" />
      <path d="M246 206h20l-3-18h-14z" fill="var(--color-clay)" {...S} strokeWidth={2.5} />
      <path d="M256 188c-10-6-12-16-8-24 8 4 10 14 8 24zm0 0c6-10 14-12 20-8-4 8-12 10-20 8z" fill="var(--color-leaf)" {...S} strokeWidth={2.2} />

      {/* chão */}
      <path d="M40 368h440" stroke={INK} strokeWidth={3} strokeLinecap="round" />

      {/* caixa de ferramentas */}
      <path d="M104 300c0-22 52-22 52 0" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <rect x="72" y="300" width="116" height="66" rx="8" fill="var(--color-clay)" {...S} />
      <path d="M72 322h116" {...S} />
      <rect x="120" y="314" width="20" height="14" rx="3" fill="var(--color-tape)" {...S} strokeWidth={2.5} />
      <path d="M92 300l-8-34" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M92 300l-8-34" stroke="var(--color-tape)" strokeWidth={4.5} strokeLinecap="round" />
      <rect x="150" y="262" width="34" height="14" rx="3" fill="#cfd6d8" {...S} strokeWidth={2.5} transform="rotate(14 167 269)" />
      <path d="M164 276l-4 24" stroke={INK} strokeWidth={6} strokeLinecap="round" />

      {/* trena */}
      <rect x="226" y="314" width="62" height="54" rx="14" fill="var(--color-tape)" {...S} />
      <circle cx="254" cy="340" r="12" fill="#fff" {...S} strokeWidth={2.5} />
      <circle cx="254" cy="340" r="3.5" fill={INK} />
      <TapeBlade x={286} y={352} w={150} />
      <path d="M436 352v13" stroke={INK} strokeWidth={4} strokeLinecap="round" />

      {/* vaso */}
      <path d="M440 368l-6-40h44l-6 40z" fill="var(--color-brand)" {...S} />
      <path d="M456 328c-22-8-28-30-20-48 18 6 24 28 20 48zm0 0c8-24 26-32 40-26-6 18-24 26-40 26zm0 0c-2-26 6-42 18-46 4 16-4 34-18 46z" fill="var(--color-leaf)" {...S} strokeWidth={2.4} />

      <Sparkle x={210} y={110} r={9} />
      <Sparkle x={392} y={250} r={7} />
      <Sparkle x={58} y={268} r={7} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Ilustrações por categoria (120×120)
// ---------------------------------------------------------------------------

function Spot({ bg, children, label }: { bg: string; children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className="h-full w-full">
      <circle cx="60" cy="60" r="56" fill={bg} />
      {children}
    </svg>
  );
}

function Electric() {
  return (
    <Spot bg="var(--color-tape-soft)" label="Lâmpada com raio">
      {[[-1, -1], [1, -1], [-1.3, 0.2], [1.3, 0.2]].map(([dx, dy], i) => (
        <path key={i} d={`M${60 + dx * 32} ${48 + dy * 22}l${dx * 9} ${dy * 6}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      ))}
      <circle cx="60" cy="50" r="24" fill="var(--color-tape)" {...S} />
      <path d="M63 33 52 52h9l-5 15 13-21h-9z" fill={INK} />
      <path d="M49 70h22v14a5 5 0 0 1-5 5H54a5 5 0 0 1-5-5z" fill="#cfd6d8" {...S} />
      <path d="M50 77h20M50 83h20" stroke={INK} strokeWidth={2} />
    </Spot>
  );
}

function Plumbing() {
  return (
    <Spot bg="var(--color-brand-soft)" label="Torneira pingando">
      <rect x="14" y="42" width="40" height="14" rx="4" fill="#cfd6d8" {...S} />
      <rect x="48" y="36" width="22" height="26" rx="5" fill="var(--color-brand)" {...S} />
      <path d="M68 42h14a10 10 0 0 1 10 10v8H82v-6h-14z" fill="var(--color-brand)" {...S} />
      <rect x="53" y="22" width="12" height="14" fill="var(--color-tape)" {...S} />
      <rect x="45" y="18" width="28" height="7" rx="3.5" fill="var(--color-tape)" {...S} />
      <path d="M87 68s-7 9-7 14a7 7 0 0 0 14 0c0-5-7-14-7-14z" fill="var(--color-water)" {...S} strokeWidth={2.5} />
      <path d="M87 94s-4 5-4 8a4 4 0 0 0 8 0c0-3-4-8-4-8z" fill="var(--color-water)" {...S} strokeWidth={2} />
      <g transform="rotate(-40 40 86)">
        <rect x="16" y="82" width="30" height="9" rx="4.5" fill="var(--color-clay)" {...S} strokeWidth={2.5} />
        <path d="M44 76h10a6 6 0 0 1 6 6v2h-8v5h8v2a6 6 0 0 1-6 6H44z" fill="#cfd6d8" {...S} strokeWidth={2.5} />
      </g>
    </Spot>
  );
}

function Furniture() {
  return (
    <Spot bg="var(--color-clay-soft)" label="Cômoda sendo montada">
      <rect x="28" y="28" width="50" height="62" rx="4" fill="var(--color-wood)" {...S} />
      <path d="M28 49h50M28 70h50" {...S} />
      {[39, 60, 81].map((y) => (
        <rect key={y} x="46" y={y - 3} width="14" height="5" rx="2.5" fill={INK} />
      ))}
      <path d="M33 90v8M73 90v8" {...S} strokeWidth={4} />
      <path d="M86 40v36h12" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M86 40v36h12" fill="none" stroke="var(--color-brand)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </Spot>
  );
}

function Repairs() {
  return (
    <Spot bg="var(--color-tape-soft)" label="TV na parede e furadeira">
      <rect x="40" y="56" width="10" height="8" fill="#cfd6d8" {...S} strokeWidth={2.5} />
      <rect x="16" y="28" width="62" height="40" rx="5" fill={INK} />
      <rect x="21" y="33" width="52" height="30" rx="2" fill="var(--color-brand)" />
      <path d="M27 40l10-4M27 47l18-7" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <rect x="66" y="78" width="34" height="15" rx="7" fill="var(--color-clay)" {...S} />
      <rect x="74" y="90" width="11" height="19" rx="3" fill="var(--color-clay)" {...S} />
      <rect x="57" y="81" width="10" height="9" rx="1.5" fill="#cfd6d8" {...S} strokeWidth={2.5} />
      <path d="M44 85.5h13" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Sparkle x={36} y={86} r={6} />
    </Spot>
  );
}

function AirConditioning() {
  return (
    <Spot bg="var(--color-brand-soft)" label="Ar-condicionado split">
      <rect x="16" y="30" width="88" height="32" rx="9" fill="#fff" {...S} />
      <path d="M26 52h68" {...S} strokeWidth={2.5} />
      <circle cx="92" cy="40" r="3" fill="var(--color-leaf)" />
      {[34, 56, 78].map((x) => (
        <path key={x} d={`M${x} 70c-6 6 6 10 0 16s6 10 0 16`} fill="none" stroke="var(--color-brand)" strokeWidth={3.5} strokeLinecap="round" />
      ))}
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round">
        <path d="M100 76v24M88 88h24M91.5 79.5l17 17M108.5 79.5l-17 17" />
      </g>
    </Spot>
  );
}

const SPOTS: Record<string, () => ReactNode> = {
  eletrica: Electric,
  encanador: Plumbing,
  "montagem-de-moveis": Furniture,
  "pequenos-reparos": Repairs,
  "ar-condicionado": AirConditioning,
};

/** Ilustração da categoria; categorias novas sem ilustração usam o ícone da marca. */
export function CategoryArt({ slug, className = "size-24" }: { slug: string; className?: string }) {
  const Art = SPOTS[slug];
  return (
    <span className={className} aria-hidden={!Art}>
      {Art ? <Art /> : (
        <Spot bg="var(--color-tape-soft)" label="Serviço">
          <path d="M34 62 60 38l26 24" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M42 58v26h36V58" fill="none" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        </Spot>
      )}
    </span>
  );
}

/** Faixa decorativa de trena (horizontal, ocupa a largura do contêiner). */
export function TapeStrip({ className }: { className?: string }) {
  return <div className={className ? `tape-measure ${className}` : "tape-measure"} aria-hidden />;
}
