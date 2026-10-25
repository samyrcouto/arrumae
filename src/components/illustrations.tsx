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

// ---------------------------------------------------------------------------
// Personagens: profissionais desenhados (meio corpo, 240×300)
// ---------------------------------------------------------------------------

export const SKIN = { deep: "#6b4226", brown: "#9a6440", tan: "#c98a5a", light: "#e8b48a", fair: "#f3cfae" } as const;
const HAIR = { black: "#1f1a17", brown: "#4a3222", auburn: "#7a3b22" } as const;

export type PersonProps = {
  skin: string;
  hair: "short" | "afro" | "bun" | "long" | "none";
  hairColor?: string;
  headwear?: "none" | "hardhat" | "cap";
  capColor?: string;
  shirt: string;
  beard?: boolean;
  glasses?: boolean;
  earrings?: boolean;
  belt?: boolean;
  tool?: "drill" | "wrench" | "screwdriver" | "tape" | "none";
};

function HeldTool({ tool, skin }: { tool: PersonProps["tool"]; skin: string }) {
  const fist = <circle cx="166" cy="214" r="14" fill={skin} {...S} />;
  switch (tool) {
    case "drill":
      return (
        <g>
          <rect x="158" y="182" width="17" height="30" rx="4" fill="var(--color-clay)" {...S} />
          <rect x="146" y="160" width="60" height="26" rx="12" fill="var(--color-clay)" {...S} />
          <rect x="154" y="166" width="18" height="6" rx="3" fill="#fff" opacity={0.5} />
          <rect x="204" y="166" width="14" height="14" rx="2" fill="#cfd6d8" {...S} strokeWidth={2.5} />
          <path d="M218 173h18" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
          {fist}
        </g>
      );
    case "wrench":
      return (
        <g>
          <g transform="rotate(28 166 214)">
            <rect x="158" y="150" width="16" height="70" rx="8" fill="#cfd6d8" {...S} />
            <path d="M152 150v-16a14 14 0 0 1 28 0v16h-8v-12h-12v12z" fill="#cfd6d8" {...S} />
          </g>
          {fist}
        </g>
      );
    case "screwdriver":
      return (
        <g>
          <rect x="159" y="172" width="14" height="34" rx="6" fill="var(--color-tape)" {...S} />
          <path d="M166 172v-34" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          {fist}
        </g>
      );
    case "tape":
      return (
        <g>
          <rect x="146" y="176" width="44" height="40" rx="11" fill="var(--color-tape)" {...S} />
          <circle cx="168" cy="196" r="8" fill="#fff" {...S} strokeWidth={2.5} />
          <rect x="188" y="204" width="34" height="9" rx="2" fill="var(--color-tape)" {...S} strokeWidth={2.5} />
          <circle cx="160" cy="216" r="13" fill={skin} {...S} />
        </g>
      );
    default:
      return null;
  }
}

/** Profissional desenhado, braços cruzados, segurando uma ferramenta. Renderiza um <g>. */
export function Person({
  skin,
  hair,
  hairColor = HAIR.black,
  headwear = "none",
  capColor = "var(--color-brand)",
  shirt,
  beard,
  glasses,
  earrings,
  belt,
  tool = "none",
}: PersonProps) {
  return (
    <g>
      {/* cabelo atrás da cabeça */}
      {hair === "afro" && <circle cx="120" cy="88" r="55" fill={hairColor} {...S} />}
      {hair === "long" && <path d="M76 98Q70 40 120 40t44 58l6 66q-50 14-100 0z" fill={hairColor} {...S} />}
      {hair === "bun" && headwear === "none" && <circle cx="120" cy="46" r="17" fill={hairColor} {...S} />}
      {hair === "bun" && headwear !== "none" && <circle cx="156" cy="70" r="14" fill={hairColor} {...S} />}

      {/* tronco */}
      <path d="M34 300v-62q0-62 62-74h48q62 12 62 74v62z" fill={shirt} {...S} />
      {belt && (
        <g>
          <rect x="46" y="270" width="148" height="16" rx="3" fill="var(--color-wood)" {...S} />
          <rect x="64" y="276" width="26" height="24" rx="3" fill="var(--color-wood)" {...S} />
          <rect x="150" y="276" width="26" height="24" rx="3" fill="var(--color-wood)" {...S} />
        </g>
      )}
      {/* pescoço e gola */}
      <path d="M104 132v36q16 10 32 0v-36z" fill={skin} {...S} />
      <path d="M96 164q24 24 48 0" fill="none" {...S} />

      {/* orelhas e cabeça */}
      <circle cx="80" cy="106" r="9" fill={skin} {...S} />
      <circle cx="160" cy="106" r="9" fill={skin} {...S} />
      <ellipse cx="120" cy="100" rx="40" ry="45" fill={skin} {...S} />
      {earrings && (
        <g>
          <circle cx="78" cy="122" r="5" fill="var(--color-tape)" {...S} strokeWidth={2} />
          <circle cx="162" cy="122" r="5" fill="var(--color-tape)" {...S} strokeWidth={2} />
        </g>
      )}

      {/* cabelo por cima */}
      {hair === "short" && headwear === "none" && (
        <path d="M80 100q-6-46 38-48 46-2 42 48-6-24-28-28-22 8-46 6-4 8-6 22z" fill={hairColor} {...S} />
      )}
      {(hair === "bun" || hair === "long") && headwear === "none" && (
        <path d="M80 98q0-44 40-44t40 44q-14-26-40-28-26 2-40 28z" fill={hairColor} {...S} />
      )}
      {hair === "afro" && headwear === "none" && (
        <path d="M82 92q4-34 38-36 34 2 38 36-16-14-38-14t-38 14z" fill={hairColor} />
      )}
      {beard && <path d="M82 108q2 44 38 44t38-44q-8 26-38 28-30-2-38-28z" fill={hairColor} {...S} />}

      {/* rosto */}
      <circle cx="98" cy="120" r="6" fill="var(--color-clay)" opacity={0.28} />
      <circle cx="142" cy="120" r="6" fill="var(--color-clay)" opacity={0.28} />
      <path d="M97 92q8-6 15-1M128 91q7-5 15 1" fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
      <circle cx="105" cy="104" r="4.4" fill={INK} />
      <circle cx="135" cy="104" r="4.4" fill={INK} />
      {glasses && (
        <g fill="none" stroke={INK} strokeWidth={3}>
          <circle cx="105" cy="104" r="12" />
          <circle cx="135" cy="104" r="12" />
          <path d="M117 104h6M93 102l-12-4M147 102l12-4" />
        </g>
      )}
      <path d="M120 107q5 8-2 12" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M105 125q15 16 30 0z" fill="#fff" {...S} strokeWidth={2.6} />

      {/* chapéus */}
      {headwear === "hardhat" && (
        <g>
          <path d="M76 86q2-44 44-46 42 2 44 46z" fill="var(--color-tape)" {...S} />
          <path d="M120 42v42M100 48v36M140 48v36" stroke={INK} strokeWidth={2.4} />
          <rect x="68" y="80" width="104" height="12" rx="6" fill="var(--color-tape)" {...S} />
        </g>
      )}
      {headwear === "cap" && (
        <g>
          <path d="M80 88q0-40 40-40t40 40z" fill={capColor} {...S} />
          <path d="M152 84q36-2 42 10h-46z" fill={capColor} {...S} />
          <circle cx="120" cy="50" r="4" fill={INK} />
        </g>
      )}

      {/* braços cruzados */}
      <rect x="32" y="196" width="40" height="52" rx="18" fill={shirt} {...S} />
      <rect x="168" y="196" width="40" height="52" rx="18" fill={shirt} {...S} />
      <rect x="54" y="212" width="132" height="34" rx="17" fill={skin} {...S} />
      <path d="M118 214v30" stroke={INK} strokeWidth={2.4} opacity={0.5} />
      <HeldTool tool={tool} skin={skin} />
    </g>
  );
}

/** Selo flutuante com informação verdadeira (nunca notas ou números inventados). */
function TruthBadge({ x, y, w, title, sub }: { x: number; y: number; w: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={x + 4} y={y + 5} width={w} height="58" rx="12" fill={INK} opacity={0.12} />
      <rect x={x} y={y} width={w} height="58" rx="12" fill="#fff" stroke="var(--color-line)" strokeWidth={2} />
      <rect x={x} y={y} width="8" height="58" rx="4" fill="var(--color-brand)" />
      <circle cx={x + 30} cy={y + 29} r="12" fill="var(--color-brand)" />
      <path d={`M${x + 24} ${y + 29}l4 4 8-9`} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <text x={x + 50} y={y + 25} fontFamily="var(--font-sans)" fontSize="15" fontWeight="700" fill={INK}>{title}</text>
      <text x={x + 50} y={y + 44} fontFamily="var(--font-sans)" fontSize="12.5" fill="var(--color-ink-soft)">{sub}</text>
    </g>
  );
}

const HERO_VARIANTS = {
  eletricista: {
    label: "Ilustração: eletricista sorridente de capacete segurando uma furadeira",
    person: { skin: SKIN.brown, hair: "bun", hairColor: HAIR.black, headwear: "hardhat", shirt: "var(--color-brand)", earrings: true, belt: true, tool: "drill" },
    badge: { title: "Documentos", sub: "conferidos pela equipe" },
  },
  montador: {
    label: "Ilustração: montador sorridente de boné segurando uma furadeira",
    person: { skin: SKIN.deep, hair: "short", hairColor: HAIR.black, headwear: "cap", capColor: "var(--color-brand)", beard: true, shirt: "var(--color-clay)", belt: true, tool: "drill" },
    badge: { title: "Sem taxa", sub: "para ver os pedidos" },
  },
} satisfies Record<string, { label: string; person: PersonProps; badge: { title: string; sub: string } }>;

/** Profissional em destaque sobre fundo de casinha (home e página de profissionais). */
export function HeroPro({ className, variant = "eletricista" }: { className?: string; variant?: keyof typeof HERO_VARIANTS }) {
  const v = HERO_VARIANTS[variant];
  return (
    <svg viewBox="0 0 440 440" className={className} role="img" aria-label={v.label}>
      {/* fundo em forma de casa, como o símbolo da marca */}
      <path d="M58 440V214L220 76l162 138v226z" fill="var(--color-tape-soft)" stroke="var(--color-tape-soft)" strokeWidth={28} strokeLinejoin="round" />
      <path d="M30 206 220 44l190 162" fill="none" stroke="var(--color-tape)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="372" cy="112" r="26" fill="var(--color-brand-soft)" />
      <g transform="translate(88 110) scale(1.1)">
        <Person {...v.person} />
      </g>
      <TruthBadge x={6} y={318} w={196} title={v.badge.title} sub={v.badge.sub} />
      <Sparkle x={74} y={120} r={10} />
      <Sparkle x={398} y={270} r={8} />
    </svg>
  );
}

/** Equipe de profissionais diversos (seção de profissionais). */
export function ProTeam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 360" className={className} role="img" aria-label="Ilustração: três profissionais sorridentes com ferramentas">
      <ellipse cx="320" cy="350" rx="300" ry="26" fill={INK} opacity={0.08} />
      <g transform="translate(10 66) scale(0.98)">
        <Person skin={SKIN.light} hair="short" hairColor={HAIR.brown} headwear="cap" capColor="var(--color-leaf)" shirt="#fff" glasses tool="wrench" />
      </g>
      <g transform="translate(400 66) scale(0.98)">
        <Person skin={SKIN.deep} hair="short" hairColor={HAIR.black} beard shirt="var(--color-clay)" tool="screwdriver" />
      </g>
      <g transform="translate(196 30) scale(1.08)">
        <Person skin={SKIN.tan} hair="bun" hairColor={HAIR.auburn} headwear="hardhat" shirt="var(--color-brand)" belt tool="tape" />
      </g>
      <Sparkle x={50} y={60} r={10} />
      <Sparkle x={600} y={90} r={8} />
    </svg>
  );
}
