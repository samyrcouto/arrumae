/**
 * Personagens semi-realistas dos profissionais (SVG, meio corpo, 400×500).
 * Estilo: sem contorno, formas com sombreado suave (luz vinda do alto à
 * esquerda), proporções naturais. Tudo configurável por props.
 *
 * Regras de marca: roupas sem logo (profissionais são autônomos) e selos
 * apenas com fatos verdadeiros — nunca notas ou números inventados.
 */

type Tone = { base: string; shade: string; light: string; lip: string };
type Cloth = { base: string; shade: string; light: string };

export const SKIN = {
  deep: { base: "#6f4630", shade: "#57331f", light: "#875a40", lip: "#4b281b" },
  brown: { base: "#a66b46", shade: "#875335", light: "#ba805a", lip: "#7a3c29" },
  tan: { base: "#cd9268", shade: "#b0774f", light: "#dca47b", lip: "#a65843" },
  light: { base: "#efc6a4", shade: "#d9a783", light: "#f7d8bd", lip: "#c27565" },
} satisfies Record<string, Tone>;

export const HAIR = { black: "#1c1714", brown: "#3e2a1e", auburn: "#6a321e" } as const;

export const CLOTH = {
  petrol: { base: "#0e4a57", shade: "#093540", light: "#1a6474" },
  clay: { base: "#d9653b", shade: "#b44d29", light: "#ea845c" },
  sand: { base: "#efe6d6", shade: "#d3c6b0", light: "#fbf6ec" },
  leaf: { base: "#3f8f6b", shade: "#2e7254", light: "#5aa883" },
  ink: { base: "#27303d", shade: "#1a212b", light: "#3a4555" },
} satisfies Record<string, Cloth>;

export type RealPersonProps = {
  skin: Tone;
  hair: "short" | "buzz" | "bun" | "curly";
  hairColor?: string;
  headwear?: "none" | "hardhat" | "cap";
  capColor?: Cloth;
  shirt: Cloth;
  beard?: boolean;
  earrings?: boolean;
  tool?: "drill" | "none";
};

function Eye({ cx, iris = "#3a2417" }: { cx: number; iris?: string }) {
  const y = 134;
  return (
    <g>
      <path d={`M${cx - 12} ${y}Q${cx} ${y - 9} ${cx + 12} ${y}Q${cx} ${y + 7} ${cx - 12} ${y}Z`} fill="#fbf8f4" />
      <circle cx={cx + 0.5} cy={y} r="5.6" fill={iris} />
      <circle cx={cx + 0.5} cy={y} r="2.7" fill="#120c08" />
      <circle cx={cx + 2.4} cy={y - 2} r="1.5" fill="#fff" />
      <path d={`M${cx - 13} ${y - 0.5}Q${cx} ${y - 11} ${cx + 13} ${y - 1}`} fill="none" stroke="#24160f" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}

function Drill({ skin }: { skin: Tone }) {
  return (
    <g transform="rotate(-16 150 372)">
      {/* bateria e empunhadura */}
      <rect x="122" y="396" width="54" height="24" rx="6" fill="#2a3037" />
      <rect x="122" y="396" width="54" height="7" rx="3" fill="#f2b33d" />
      <rect x="134" y="326" width="30" height="76" rx="11" fill="#20252b" />
      {/* corpo do motor */}
      <rect x="112" y="290" width="122" height="46" rx="21" fill="#d9653b" />
      <path d="M118 322h110a21 21 0 0 1-17 14h-80a21 21 0 0 1-13-14z" fill="#b44d29" />
      <rect x="128" y="298" width="56" height="7" rx="3.5" fill="#fff" opacity="0.35" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={194 + i * 9} y="303" width="4" height="20" rx="2" fill="#7a3119" opacity="0.6" />
      ))}
      {/* mandril e broca */}
      <rect x="230" y="298" width="26" height="30" rx="6" fill="#2a3037" />
      <rect x="236" y="300" width="4" height="26" rx="2" fill="#454d56" />
      <rect x="255" y="309" width="46" height="9" rx="3" fill="#b9c1c7" />
      {[262, 272, 282, 292].map((x) => (
        <path key={x} d={`M${x} 309l5 9`} stroke="#8a949b" strokeWidth="2" />
      ))}
      {/* gatilho */}
      <rect x="156" y="334" width="10" height="16" rx="4" fill="#3a4148" />
      {/* mão segurando a empunhadura */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="124" y={340 + i * 14} width="50" height="15" rx="7.5" fill={skin.base} />
          <path d={`M128 ${354 + i * 14}h42`} stroke={skin.shade} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
        </g>
      ))}
      <path d="M124 344c-6-10-2-22 10-24 10-2 16 6 16 14z" fill={skin.base} />
      <path d="M124 344c-2-6 0-12 6-15" fill="none" stroke={skin.shade} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
    </g>
  );
}

/** Profissional semi-realista, segurando uma ferramenta na altura do peito. Renderiza um <g>. */
export function RealPerson({
  skin,
  hair,
  hairColor = HAIR.black,
  headwear = "none",
  capColor = CLOTH.petrol,
  shirt,
  beard,
  earrings,
  tool = "drill",
}: RealPersonProps) {
  return (
    <g>
      {/* cabelo que fica atrás da cabeça */}
      {hair === "bun" && <circle cx="238" cy={headwear === "none" ? 66 : 92} r="24" fill={hairColor} />}
      {hair === "curly" && headwear === "none" && (
        <g fill={hairColor}>
          {[[158, 96, 28], [182, 70, 30], [218, 70, 30], [242, 96, 28], [148, 128, 22], [252, 128, 22], [200, 60, 26]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      )}

      {/* tronco com camisa polo */}
      <path d="M40 500l6-148c4-60 38-90 86-102l40-14c12 10 44 10 56 0l40 14c48 12 82 42 86 102l6 148z" fill={shirt.base} />
      <path d="M268 250c48 12 82 42 86 102l6 148h-58c6-82 0-170-34-250z" fill={shirt.shade} opacity="0.6" />
      <path d="M132 250c-32 12-58 34-68 70 26-24 54-40 86-48z" fill={shirt.light} opacity="0.5" />
      <path d="M96 430c10 20 14 44 12 70M300 420c-8 26-10 54-8 80" fill="none" stroke={shirt.shade} strokeWidth="3" opacity="0.5" strokeLinecap="round" />
      {/* bolso com caneta */}
      <rect x="258" y="296" width="6" height="30" rx="3" fill="#f2b33d" />
      <rect x="256" y="294" width="10" height="6" rx="2" fill="#2a3037" />
      <path d="M244 312h56v44a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8z" fill={shirt.shade} opacity="0.45" />
      <path d="M244 312h56" stroke={shirt.shade} strokeWidth="3" />

      {/* pescoço */}
      <path d="M176 186v54c12 10 36 10 48 0v-54z" fill={skin.base} />
      <path d="M176 196c10 16 38 16 48 0v24c-14 10-34 10-48 0z" fill={skin.shade} opacity="0.75" />
      {/* gola polo e botões */}
      <path d="M172 236l-24 10 28 40 18-34z" fill={shirt.light} />
      <path d="M228 236l24 10-28 40-18-34z" fill={shirt.base} />
      <path d="M228 236l24 10-28 40-18-34z" fill={shirt.light} opacity="0.65" />
      <rect x="194" y="252" width="12" height="58" rx="3" fill={shirt.shade} opacity="0.55" />
      <circle cx="200" cy="266" r="3" fill={shirt.light} />
      <circle cx="200" cy="290" r="3" fill={shirt.light} />

      {/* orelhas */}
      <ellipse cx="150" cy="142" rx="10" ry="17" fill={skin.base} />
      <path d="M150 132c-4 4-4 16 0 20" fill="none" stroke={skin.shade} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="250" cy="142" rx="10" ry="17" fill={skin.shade} />
      {earrings && (
        <g fill="none" stroke="#e0a526" strokeWidth="3">
          <circle cx="149" cy="163" r="6" />
          <circle cx="251" cy="163" r="6" />
        </g>
      )}

      {/* rosto */}
      <path d="M152 120c-2-32 20-56 48-56s50 24 48 56c2 32-4 58-20 74-10 10-20 14-28 14s-18-4-28-14c-16-16-22-42-20-74z" fill={skin.base} />
      <path d="M236 96c14 28 12 66-6 96-10 10-20 14-26 15 20-21 32-57 32-111z" fill={skin.shade} opacity="0.6" />
      <path d="M166 88c10-12 24-18 38-18-16 6-28 16-34 30z" fill={skin.light} opacity="0.6" />
      <ellipse cx="172" cy="160" rx="11" ry="7" fill="#e07a5f" opacity="0.14" />
      <ellipse cx="228" cy="160" rx="11" ry="7" fill="#e07a5f" opacity="0.14" />

      {beard && (
        <g fill={hairColor}>
          <path d="M154 140c2 38 22 70 46 72 24-2 44-34 46-72-6 22-14 36-26 44-10-6-30-6-40 0-12-8-20-22-26-44z" />
          <path d="M180 170q20-10 40 0-20 6-40 0z" />
        </g>
      )}

      {/* sobrancelhas, olhos, nariz e boca */}
      <path d="M165 119q13-10 29-5-14 0-28 8z" fill={hairColor} />
      <path d="M235 119q-13-10-29-5 14 0 28 8z" fill={hairColor} />
      <Eye cx={180} />
      <Eye cx={220} />
      <path d="M204 140c3 10 8 18 6 22l-6 2c3-8 1-16 0-24z" fill={skin.shade} opacity="0.8" />
      <path d="M189 161q11 8 22 0" fill="none" stroke={skin.shade} strokeWidth="3" strokeLinecap="round" />
      <path d="M180 177q20 20 40 0-20 4-40 0z" fill="#5a2117" />
      <path d="M184 178q16 10 32 0-16 3-32 0z" fill="#fff" />
      <path d="M180 177q10-5 20-2 10-3 20 2-20 3-40 0z" fill={skin.lip} />
      <path d="M190 189q10 5 20 0-10 6-20 0z" fill={skin.lip} opacity="0.7" />

      {/* cabelo por cima */}
      {hair === "short" && headwear === "none" && (
        <g fill={hairColor}>
          <path d="M150 126c-6-42 18-72 54-72s54 30 46 72c-4-20-12-32-24-38-16 8-44 8-64 4-8 10-11 20-12 34z" />
          <path d="M150 124c0 10 2 18 4 22l4-24z" />
          <path d="M250 124c0 10-2 18-4 22l-4-24z" />
        </g>
      )}
      {hair === "buzz" && headwear === "none" && (
        <path d="M152 118c-2-34 20-56 48-56s50 22 48 56c-8-22-24-32-48-32s-40 10-48 32z" fill={hairColor} opacity="0.92" />
      )}
      {hair === "bun" && headwear === "none" && (
        <path d="M150 124c-4-40 20-66 50-66s54 26 50 66c-6-24-24-38-50-38s-44 14-50 38z" fill={hairColor} />
      )}
      {hair === "curly" && headwear === "none" && (
        <g fill={hairColor}>
          {[164, 180, 196, 212, 228].map((x, i) => (
            <circle key={x} cx={x + (i % 2) * 2} cy={i % 2 ? 90 : 86} r="12" />
          ))}
        </g>
      )}
      {headwear !== "none" && (hair === "bun" || hair === "curly") && (
        <path d="M152 106c-2 12 0 22 2 30l6-28zM248 106c2 12 0 22-2 30l-6-28z" fill={hairColor} />
      )}

      {/* chapéus */}
      {headwear === "hardhat" && (
        <g>
          <path d="M142 104c0-46 28-72 58-72s58 26 58 72z" fill="#f2b33d" />
          <path d="M228 38c20 12 30 36 30 66h-26c4-26 2-48-4-66z" fill="#d9971f" opacity="0.75" />
          <path d="M160 64c6-12 16-20 28-24-10 12-18 26-22 44z" fill="#fff" opacity="0.28" />
          <rect x="191" y="33" width="18" height="72" rx="8" fill="#f7c65e" />
          <rect x="191" y="33" width="18" height="72" rx="8" fill="#000" opacity="0.05" />
          <path d="M124 100q76-12 152 0 8 10-2 15-74-10-148 0-10-5-2-15z" fill="#e3a02b" />
        </g>
      )}
      {headwear === "cap" && (
        <g>
          <path d="M150 104c-2-40 22-58 52-58s52 18 50 58z" fill={capColor.base} />
          <path d="M228 52c16 10 24 28 24 52h-22c2-22 0-38-2-52z" fill={capColor.shade} opacity="0.7" />
          <path d="M201 47v54" stroke={capColor.shade} strokeWidth="2.5" opacity="0.7" />
          <circle cx="201" cy="48" r="4" fill={capColor.shade} />
          <path d="M146 100q54-14 108 0 10 12-4 16-50-12-100 0-14-4-4-16z" fill={capColor.shade} />
        </g>
      )}

      {/* braço e ferramenta */}
      {tool === "drill" && (
        <g>
          <path d="M92 500c4-48 14-90 30-122l48 8c-8 36-12 76-10 114z" fill={skin.base} />
          <path d="M150 384l20 2c-8 36-12 76-10 114h-16c0-40 2-80 6-116z" fill={skin.shade} opacity="0.55" />
          <Drill skin={skin} />
        </g>
      )}
    </g>
  );
}

/** Selo flutuante com informação verdadeira (nunca notas ou números inventados). */
function TruthBadge({ x, y, w, title, sub }: { x: number; y: number; w: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={x + 4} y={y + 6} width={w} height="60" rx="14" fill="#18202c" opacity="0.12" />
      <rect x={x} y={y} width={w} height="60" rx="14" fill="#fff" />
      <circle cx={x + 30} cy={y + 30} r="14" fill="var(--color-brand)" />
      <path d={`M${x + 23} ${y + 30}l5 5 9-10`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x={x + 54} y={y + 26} fontFamily="var(--font-sans)" fontSize="16" fontWeight="700" fill="var(--color-ink)">{title}</text>
      <text x={x + 54} y={y + 45} fontFamily="var(--font-sans)" fontSize="13" fill="var(--color-ink-soft)">{sub}</text>
    </g>
  );
}

const HERO_VARIANTS = {
  eletricista: {
    label: "Ilustração: eletricista sorridente de capacete segurando uma furadeira",
    person: { skin: SKIN.brown, hair: "bun", hairColor: HAIR.black, headwear: "hardhat", shirt: CLOTH.petrol, earrings: true },
    badge: { title: "Documentos", sub: "conferidos pela equipe" },
  },
  montador: {
    label: "Ilustração: montador sorridente de boné segurando uma furadeira",
    person: { skin: SKIN.deep, hair: "short", hairColor: HAIR.black, headwear: "cap", capColor: CLOTH.petrol, beard: true, shirt: CLOTH.clay },
    badge: { title: "Sem taxa", sub: "para ver os pedidos" },
  },
} satisfies Record<string, { label: string; person: RealPersonProps; badge: { title: string; sub: string } }>;

/** Profissional em destaque sobre fundo de casinha (home e página de profissionais). */
export function HeroPro({ className, variant = "eletricista" }: { className?: string; variant?: keyof typeof HERO_VARIANTS }) {
  const v = HERO_VARIANTS[variant];
  return (
    <svg viewBox="0 0 440 470" className={className} role="img" aria-label={v.label}>
      <path d="M50 470V226L220 84l170 142v244z" fill="var(--color-tape-soft)" stroke="var(--color-tape-soft)" strokeWidth="28" strokeLinejoin="round" />
      <path d="M24 214 220 50l196 164" fill="none" stroke="var(--color-tape)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(36 -30)">
        <RealPerson {...v.person} />
      </g>
      <TruthBadge x={234} y={318} w={200} title={v.badge.title} sub={v.badge.sub} />
    </svg>
  );
}

/** Equipe de profissionais diversos. */
export function ProTeam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 360" className={className} role="img" aria-label="Ilustração: três profissionais sorridentes">
      <ellipse cx="380" cy="352" rx="360" ry="22" fill="#18202c" opacity="0.08" />
      <g transform="translate(0 30) scale(0.66)">
        <RealPerson skin={SKIN.light} hair="short" hairColor={HAIR.brown} headwear="cap" capColor={CLOTH.leaf} shirt={CLOTH.sand} tool="none" />
      </g>
      <g transform="translate(496 30) scale(0.66)">
        <RealPerson skin={SKIN.deep} hair="buzz" hairColor={HAIR.black} beard shirt={CLOTH.clay} tool="none" />
      </g>
      <g transform="translate(228 0) scale(0.72)">
        <RealPerson skin={SKIN.tan} hair="curly" hairColor={HAIR.auburn} headwear="hardhat" shirt={CLOTH.petrol} earrings />
      </g>
    </svg>
  );
}
