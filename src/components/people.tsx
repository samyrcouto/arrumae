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
  /** Ferramenta erguida numa das mãos; sem ferramenta, as duas mãos ficam na cintura. */
  tool?: ToolName | "none";
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

/* ---------------------------------------------------------------- ferramentas
 * Desenhadas em coordenadas locais: o punho fica em (0,0) e o cabo passa na
 * vertical por ele. A mão é desenhada por cima, então o cabo "entra" no punho.
 */

function Screwdriver() {
  return (
    <g>
      <rect x="-3.5" y="-128" width="7" height="100" rx="2" fill="#c8392b" />
      <path d="M-3.5 -128h7l-1.5 -12h-4z" fill="#b9c1c7" />
      <rect x="-10" y="-40" width="20" height="78" rx="9" fill="#f2b33d" />
      <rect x="-10" y="-40" width="20" height="12" rx="6" fill="#20252b" />
      <rect x="-10" y="28" width="20" height="10" rx="5" fill="#20252b" />
    </g>
  );
}

function PipeWrench() {
  return (
    <g>
      {/* cabo vermelho com furo */}
      <rect x="-9" y="-30" width="18" height="96" rx="8" fill="#c8392b" />
      <rect x="-9" y="-30" width="6" height="96" rx="3" fill="#e2574a" opacity="0.6" />
      <circle cx="0" cy="54" r="4" fill="#7c1f17" />
      {/* corpo de aço com mordente fixo */}
      <rect x="-8" y="-96" width="16" height="70" rx="3" fill="#9aa3aa" />
      <rect x="-8" y="-96" width="5" height="70" rx="2" fill="#b9c1c7" />
      <path d="M-8 -66h-24a4 4 0 0 0-4 4v4h28z" fill="#7d868d" />
      {/* porca de ajuste serrilhada */}
      <rect x="-13" y="-86" width="26" height="16" rx="4" fill="#5d666d" />
      {[-7, -2, 3, 8].map((x) => <rect key={x} x={x - 1} y="-84" width="2" height="12" rx="1" fill="#3c4349" />)}
      {/* mordente em gancho, abrindo para fora */}
      <path d="M8 -112h-42a6 6 0 0 0-6 6v10h48z" fill="#b9c1c7" />
      <path d="M-40 -100h48v4h-48z" fill="#8a949b" />
    </g>
  );
}

function Gauges() {
  return (
    <g>
      {/* mangueiras pendendo */}
      <path d="M-26 -22c-6 40-22 70-14 110" fill="none" stroke="#2f6fb5" strokeWidth="7" strokeLinecap="round" />
      <path d="M26 -22c8 40 22 66 16 106" fill="none" stroke="#c8392b" strokeWidth="7" strokeLinecap="round" />
      <path d="M0 -20c2 30-4 70 4 104" fill="none" stroke="#f2b33d" strokeWidth="7" strokeLinecap="round" />
      {/* corpo do manifold com registros */}
      <rect x="-38" y="-44" width="76" height="26" rx="6" fill="#aeb6bc" />
      <rect x="-38" y="-44" width="76" height="7" rx="3" fill="#d3d9dd" />
      <rect x="-50" y="-38" width="12" height="14" rx="3" fill="#2f6fb5" />
      <rect x="38" y="-38" width="12" height="14" rx="3" fill="#c8392b" />
      {/* manômetros azul (baixa) e vermelho (alta) */}
      {[[-20, "#2f6fb5"], [20, "#c8392b"]].map(([x, c]) => (
        <g key={x as number}>
          <rect x={(x as number) - 4} y="-52" width="8" height="10" fill="#7d868d" />
          <circle cx={x as number} cy="-70" r="19" fill={c as string} />
          <circle cx={x as number} cy="-70" r="14" fill="#fbf8f4" />
          <path d={`M${(x as number) - 9} -64a11 11 0 0 1 18 0`} fill="none" stroke="#9aa3aa" strokeWidth="2" />
          <path d={`M${x} -70l7 -8`} stroke="#18202c" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx={x as number} cy="-70" r="2.4" fill="#18202c" />
        </g>
      ))}
    </g>
  );
}

function Hammer() {
  return (
    <g>
      <rect x="-8" y="-104" width="16" height="148" rx="7" fill="#b07a45" />
      <rect x="-8" y="-104" width="5" height="148" rx="2.5" fill="#c89160" opacity="0.8" />
      <rect x="-8" y="30" width="16" height="14" rx="6" fill="#20252b" />
      {/* cabeça: face à esquerda, unha (orelha) curva à direita */}
      <path d="M-38 -122h44v26h-44z" fill="#7d868d" />
      <rect x="-46" y="-124" width="12" height="30" rx="3" fill="#9aa3aa" />
      <path d="M6 -122c18 0 30 8 38 22-12-6-24-8-38-6z" fill="#9aa3aa" />
      <rect x="-38" y="-122" width="44" height="7" fill="#b9c1c7" />
    </g>
  );
}

function Drill() {
  return (
    <g>
      <rect x="-24" y="26" width="48" height="22" rx="6" fill="#2a3037" />
      <rect x="-24" y="26" width="48" height="6" rx="3" fill="#f2b33d" />
      <rect x="-13" y="-40" width="26" height="72" rx="10" fill="#20252b" />
      {/* corpo do motor, broca apontando para fora */}
      <rect x="-96" y="-78" width="122" height="44" rx="20" fill="#d9653b" />
      <path d="M-92 -50h114a20 20 0 0 1 -16 16h-82a20 20 0 0 1 -16 -16z" fill="#b44d29" />
      <rect x="-70" y="-71" width="56" height="7" rx="3.5" fill="#fff" opacity="0.35" />
      {[0, 1, 2].map((i) => <rect key={i} x={-6 + i * 9} y="-66" width="4" height="20" rx="2" fill="#7a3119" opacity="0.6" />)}
      <rect x="-118" y="-71" width="26" height="30" rx="6" fill="#2a3037" />
      <rect x="-148" y="-60" width="32" height="9" rx="3" fill="#b9c1c7" />
      {[-142, -132, -122].map((x) => <path key={x} d={`M${x} -60l5 9`} stroke="#8a949b" strokeWidth="2" />)}
      <rect x="-30" y="-36" width="10" height="16" rx="4" fill="#3a4148" />
    </g>
  );
}

const TOOLS = { screwdriver: Screwdriver, wrench: PipeWrench, gauges: Gauges, hammer: Hammer, drill: Drill };
export type ToolName = keyof typeof TOOLS;

/* ------------------------------------------------------------------- braços */

type Pt = [number, number];

/** Membro com sombreado do lado direito (luz vinda da esquerda). */
function Limb({ from, to, w, tone }: { from: Pt; to: Pt; w: number; tone: { base: string; shade: string } }) {
  const d = `M${from[0]} ${from[1]}L${to[0]} ${to[1]}`;
  return (
    <g strokeLinecap="round" fill="none">
      <path d={d} stroke={tone.shade} strokeWidth={w} transform="translate(4 0)" />
      <path d={d} stroke={tone.base} strokeWidth={w - 6} transform="translate(-1 0)" />
    </g>
  );
}

/** Manga curta da polo cobrindo o começo do braço. */
function Sleeve({ from, toward, shirt }: { from: Pt; toward: Pt; shirt: Cloth }) {
  const len = 46;
  const dx = toward[0] - from[0], dy = toward[1] - from[1];
  const k = len / Math.hypot(dx, dy);
  const end: Pt = [from[0] + dx * k, from[1] + dy * k];
  const hem: Pt = [from[0] + dx * k * 0.86, from[1] + dy * k * 0.86];
  return (
    <g>
      <path d={`M${from[0]} ${from[1]}L${end[0]} ${end[1]}`} stroke={shirt.base} strokeWidth="46" strokeLinecap="round" />
      <path d={`M${hem[0]} ${hem[1]}L${end[0]} ${end[1]}`} stroke={shirt.shade} strokeWidth="46" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

/** Punho fechado em volta de um cabo vertical (x=0), visto de frente: quatro dedos dobrados e o polegar por cima. */
function Fist({ skin }: { skin: Tone }) {
  const fingers = [
    { y: -22, len: 36 },
    { y: -10, len: 37 },
    { y: 2, len: 35 },
    { y: 14, len: 30 },
  ];
  return (
    <g>
      {/* dorso / base da mão, do lado do pulso */}
      <path d="M-22 -14c0-10 6-14 14-14h6v52h-6c-8 0-14-4-14-12z" fill={skin.base} />
      <path d="M-22 -10c0-6 3-10 7-12v44c-4-2-7-6-7-10z" fill={skin.light} opacity="0.4" />
      {/* dedos, do indicador (em cima) ao mínimo */}
      {[...fingers].reverse().map(({ y, len }) => (
        <g key={y}>
          <rect x="-16" y={y} width={len} height="13" rx="6.5" fill={skin.base} />
          <path d={`M${len - 22} ${y + 12}q4 0 6-3`} fill="none" stroke={skin.shade} strokeWidth="2" strokeLinecap="round" />
          <path d={`M-12 ${y + 12.5}h${len - 12}`} stroke={skin.shade} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <ellipse cx={len - 22} cy={y + 5} rx="4" ry="2.2" fill={skin.light} opacity="0.6" />
        </g>
      ))}
      {/* polegar dobrado por cima do indicador, com unha */}
      <path d="M-20 -18c4-10 14-14 26-12 7 1 11 5 10 9-1 4-6 5-12 4-9-1-17 1-24 7z" fill={skin.base} />
      <path d="M-18 -16c6-6 14-9 22-8" fill="none" stroke={skin.light} strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="9" cy="-24" rx="5" ry="3.4" fill={skin.light} />
      <path d="M-20 -18c7-6 15-8 24-7" fill="none" stroke={skin.shade} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" transform="translate(0 6)" />
    </g>
  );
}

/** Mão fechada apoiada na cintura (mesmo punho, girado na direção do antebraço). */
function HipHand({ skin, flip }: { skin: Tone; flip?: boolean }) {
  return (
    <g transform={`${flip ? "scale(-1 1) " : ""}rotate(-128) scale(0.92)`}>
      <Fist skin={skin} />
    </g>
  );
}

const SHOULDER_L: Pt = [124, 286];
const SHOULDER_R: Pt = [276, 286];

/** Inclinação do punho por ferramenta (a furadeira aponta para cima e para fora). */
const TOOL_TILT: Partial<Record<ToolName, number>> = { drill: 26 };

type ArmPose = { shoulder: Pt; elbow: Pt; wrist: Pt; hand: Pt; raised: boolean };

function armPose(side: "left" | "right", raised: boolean): ArmPose {
  if (raised) return { shoulder: SHOULDER_L, elbow: [62, 390], wrist: [70, 290], hand: [70, 262], raised };
  const right = side === "right";
  return right
    ? { shoulder: SHOULDER_R, elbow: [336, 374], wrist: [290, 432], hand: [276, 444], raised }
    : { shoulder: SHOULDER_L, elbow: [64, 374], wrist: [110, 432], hand: [124, 444], raised };
}

/** Braço e manga: desenhados antes do tronco, para a manga "sair" da camisa. */
function UpperArm({ pose, skin, shirt }: { pose: ArmPose; skin: Tone; shirt: Cloth }) {
  return (
    <g>
      <Limb from={pose.shoulder} to={pose.elbow} w={36} tone={skin} />
      <Sleeve from={pose.shoulder} toward={pose.elbow} shirt={shirt} />
    </g>
  );
}

/** Antebraço e mão (com ferramenta, se o braço estiver erguido). */
function Forearm({ pose, skin, tool }: { pose: ArmPose; skin: Tone; tool?: ToolName }) {
  const Tool = tool ? TOOLS[tool] : null;
  const tilt = tool ? (TOOL_TILT[tool] ?? 0) : 0;
  return (
    <g>
      <Limb from={pose.elbow} to={pose.wrist} w={31} tone={skin} />
      <g transform={`translate(${pose.hand[0]} ${pose.hand[1]})`}>
        {Tool ? (
          <g transform={`rotate(${tilt})`}>
            <Tool />
            <Fist skin={skin} />
          </g>
        ) : (
          <HipHand skin={skin} flip={pose.shoulder === SHOULDER_L} />
        )}
      </g>
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
  const left = armPose("left", tool !== "none");
  const right = armPose("right", false);
  return (
    <g>
      {/* cabelo que fica atrás da cabeça */}
      {hair === "bun" && <circle cx={headwear === "none" ? 238 : 246} cy={headwear === "none" ? 66 : 120} r={headwear === "none" ? 24 : 15} fill={hairColor} />}
      {hair === "curly" && headwear === "none" && (
        <g fill={hairColor}>
          {[[158, 96, 28], [182, 70, 30], [218, 70, 30], [242, 96, 28], [148, 128, 22], [252, 128, 22], [200, 60, 26]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      )}

      {/* braços (parte de cima fica atrás do tronco) */}
      <UpperArm pose={left} skin={skin} shirt={shirt} />
      <UpperArm pose={right} skin={skin} shirt={shirt} />

      {/* tronco com camisa polo */}
      <path d="M176 238c-26 6-52 14-66 30-10 14-6 36 6 56 6 50 12 110 14 176h140c2-66 8-126 14-176 12-20 16-42 6-56-14-16-40-24-66-30-12 10-36 10-48 0z" fill={shirt.base} />
      <path d="M252 250c18 6 32 12 38 20 8 12 4 34-6 54-6 50-10 110-12 176h-36c8-76 12-160 16-250z" fill={shirt.shade} opacity="0.6" />
      <path d="M150 248c-20 6-34 14-40 24 18-8 34-14 52-18z" fill={shirt.light} opacity="0.5" />
      <path d="M150 420c6 24 8 50 6 80M250 424c-6 24-8 50-6 76" fill="none" stroke={shirt.shade} strokeWidth="3" opacity="0.45" strokeLinecap="round" />
      {/* bolso com caneta */}
      <rect x="240" y="292" width="6" height="30" rx="3" fill="#f2b33d" />
      <rect x="238" y="290" width="10" height="6" rx="2" fill="#2a3037" />
      <path d="M226 308h44v38a8 8 0 0 1-8 8h-28a8 8 0 0 1-8-8z" fill={shirt.shade} opacity="0.45" />
      <path d="M226 308h44" stroke={shirt.shade} strokeWidth="3" />

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
          {/* sombra da aba na testa */}
          <path d="M150 104c30 8 70 8 100 0v12c-30 8-70 8-100 0z" fill={skin.shade} opacity="0.55" />
          {/* cúpula */}
          <path d="M136 100c-2-44 28-72 64-72s66 28 64 72z" fill="#f2b33d" />
          {/* sombra lateral e brilho */}
          <path d="M234 38c20 14 30 36 30 62h-24c2-24-1-46-6-62z" fill="#d48f1c" opacity="0.6" />
          <path d="M154 62c8-14 20-24 34-28-12 12-20 28-24 48z" fill="#fff" opacity="0.32" />
          {/* nervuras acompanhando a curvatura */}
          <path d="M192 30c-4 22-5 46-4 70h24c1-24 0-48-4-70-5-2-11-2-16 0z" fill="#f7c862" />
          <path d="M168 40c-8 18-12 38-12 60M232 40c8 18 12 38 12 60" fill="none" stroke="#c9861a" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
          {/* aba contínua, levemente curvada */}
          <path d="M124 98c40-10 112-10 152 0 6 3 6 11 0 14-40-8-112-8-152 0-6-3-6-11 0-14z" fill="#e39f27" />
          <path d="M126 108c40-7 108-7 148 0" fill="none" stroke="#b97814" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
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

      {/* antebraços e mãos */}
      <Forearm pose={left} skin={skin} tool={tool === "none" ? undefined : tool} />
      <Forearm pose={right} skin={skin} />
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

/** Um profissional por serviço do piloto (a chave é o slug da categoria). */
export const TRADES = {
  eletrica: {
    label: "Ilustração: eletricista sorridente de capacete segurando uma chave de fenda isolada",
    person: { skin: SKIN.brown, hair: "bun", hairColor: HAIR.black, headwear: "hardhat", shirt: CLOTH.petrol, earrings: true, tool: "screwdriver" },
  },
  encanador: {
    label: "Ilustração: encanador sorridente de boné segurando uma chave de grifo",
    person: { skin: SKIN.light, hair: "short", hairColor: HAIR.brown, headwear: "cap", capColor: CLOTH.leaf, shirt: CLOTH.sand, tool: "wrench" },
  },
  "ar-condicionado": {
    label: "Ilustração: técnica de ar-condicionado sorridente segurando um manômetro",
    person: { skin: SKIN.tan, hair: "curly", hairColor: HAIR.auburn, shirt: CLOTH.leaf, earrings: true, tool: "gauges" },
  },
  "montagem-de-moveis": {
    label: "Ilustração: montador sorridente de boné segurando uma furadeira",
    person: { skin: SKIN.deep, hair: "short", hairColor: HAIR.black, headwear: "cap", capColor: CLOTH.petrol, beard: true, shirt: CLOTH.clay, tool: "drill" },
  },
  "pequenos-reparos": {
    label: "Ilustração: profissional de pequenos reparos sorridente segurando um martelo",
    person: { skin: SKIN.tan, hair: "buzz", hairColor: HAIR.black, beard: true, shirt: CLOTH.ink, tool: "hammer" },
  },
} satisfies Record<string, { label: string; person: RealPersonProps }>;

export type TradeSlug = keyof typeof TRADES;

const BADGES = {
  eletrica: { title: "Documentos", sub: "conferidos pela equipe" },
  "montagem-de-moveis": { title: "Sem taxa", sub: "para ver os pedidos" },
} as const;

/** Profissional sobre fundo de casinha. Mostra selo só nos serviços que têm um. */
export function HeroPro({ className, trade = "eletrica", badge = true }: { className?: string; trade?: TradeSlug; badge?: boolean }) {
  const t = TRADES[trade];
  const b = badge ? BADGES[trade as keyof typeof BADGES] : undefined;
  return (
    <svg viewBox="0 0 440 470" className={className} role="img" aria-label={t.label}>
      <path d="M50 470V226L220 84l170 142v244z" fill="var(--color-tape-soft)" stroke="var(--color-tape-soft)" strokeWidth="28" strokeLinejoin="round" />
      <path d="M24 214 220 50l196 164" fill="none" stroke="var(--color-tape)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(46 -30)">
        <RealPerson {...t.person} />
      </g>
      {b && <TruthBadge x={6} y={404} w={200} title={b.title} sub={b.sub} />}
    </svg>
  );
}

/** Profissional do serviço, para a landing da categoria (cai para null se não houver). */
export function TradeArt({ slug, className }: { slug: string; className?: string }) {
  if (!(slug in TRADES)) return null;
  return <HeroPro trade={slug as TradeSlug} badge={false} className={className} />;
}

/** Equipe: eletricista, encanador e técnica de ar-condicionado. */
export function ProTeam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 360" className={className} role="img" aria-label="Ilustração: eletricista, encanador e técnica de ar-condicionado sorridentes">
      <ellipse cx="380" cy="352" rx="360" ry="22" fill="#18202c" opacity="0.08" />
      <g transform="translate(14 30) scale(0.66)">
        <RealPerson {...TRADES.encanador.person} />
      </g>
      <g transform="translate(510 30) scale(0.66)">
        <RealPerson {...TRADES["ar-condicionado"].person} />
      </g>
      <g transform="translate(250 0) scale(0.72)">
        <RealPerson {...TRADES.eletrica.person} skin={SKIN.deep} hair="short" earrings={false} beard />
      </g>
    </svg>
  );
}
