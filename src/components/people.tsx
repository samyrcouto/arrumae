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
  /** Ferramenta erguida numa das mãos. */
  tool?: ToolName | "none";
  /** Posição do corpo; sem ferramenta, o padrão é o joinha. */
  pose?: PoseName;
  mustache?: boolean;
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

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const unit = (a: Pt): Pt => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const perp = (a: Pt): Pt => [-a[1], a[0]];
const xy = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/**
 * Contorno de um braço inteiro (ombro → cotovelo → pulso) como uma forma só,
 * afinando do ombro ao pulso. Do lado de fora o cotovelo é arredondado; do
 * lado de dentro as duas retas se encontram e formam a dobra.
 */
function armPath(s: Pt, e: Pt, h: Pt, w: [number, number, number]) {
  const d1 = unit(sub(e, s)), d2 = unit(sub(h, e));
  const n1 = perp(d1), n2 = perp(d2);
  const turn = d1[0] * d2[1] - d1[1] * d2[0];
  const [ws, we, wh] = w.map((v) => v / 2);
  const A = add(s, mul(n1, ws)), B = add(e, mul(n1, we)), C = add(e, mul(n2, we)), D = add(h, mul(n2, wh));
  const D2 = add(h, mul(n2, -wh)), C2 = add(e, mul(n2, -we)), B2 = add(e, mul(n1, -we)), A2 = add(s, mul(n1, -ws));
  const plusOuter = turn < 0;
  return [
    `M${xy(A)}L${xy(B)}`,
    plusOuter ? `A${we} ${we} 0 0 0 ${xy(C)}` : `L${xy(C)}`,
    `L${xy(D)}A${wh} ${wh} 0 0 0 ${xy(D2)}L${xy(C2)}`,
    plusOuter ? `L${xy(B2)}` : `A${we} ${we} 0 0 0 ${xy(B2)}`,
    `L${xy(A2)}A${ws} ${ws} 0 0 0 ${xy(A)}Z`,
  ].join("");
}

/** Só o antebraço (do cotovelo ao pulso), com a ponta do cotovelo arredondada. */
function forearmPath(e: Pt, h: Pt, w: [number, number]) {
  const d = unit(sub(h, e)), n = perp(d);
  const [we, wh] = w.map((v) => v / 2);
  const C = add(e, mul(n, we)), D = add(h, mul(n, wh)), D2 = add(h, mul(n, -wh)), C2 = add(e, mul(n, -we));
  return `M${xy(C)}L${xy(D)}A${wh} ${wh} 0 0 0 ${xy(D2)}L${xy(C2)}A${we} ${we} 0 0 0 ${xy(C)}Z`;
}

const ARM_W: [number, number, number] = [44, 40, 34];
/** Luz vem da esquerda: a parte iluminada é a mesma forma, mais fina e deslocada, sobre a forma em sombra. */
const LIT_SHIFT = "translate(-3 -1.5)";
const LIT_W = ARM_W.map((v) => v - 8) as [number, number, number];

/** Dobra do cotovelo, no lado de dentro do ângulo. */
function elbowCrease(s: Pt, e: Pt, h: Pt) {
  const d1 = unit(sub(e, s)), d2 = unit(sub(h, e));
  const turn = d1[0] * d2[1] - d1[1] * d2[0];
  const bis = unit(add(perp(d1), perp(d2)));
  const inner = turn > 0 ? bis : mul(bis, -1);
  const p = add(e, mul(inner, ARM_W[1] / 2 - 5));
  const t = perp(inner);
  return `M${xy(add(p, mul(t, -6)))}Q${xy(add(p, mul(inner, -3)))} ${xy(add(p, mul(t, 6)))}`;
}

/** Manga curta da polo cobrindo o começo do braço. */
function Sleeve({ from, toward, shirt }: { from: Pt; toward: Pt; shirt: Cloth }) {
  const len = 50;
  const dx = toward[0] - from[0], dy = toward[1] - from[1];
  const k = len / Math.hypot(dx, dy);
  const end: Pt = [from[0] + dx * k, from[1] + dy * k];
  const hem: Pt = [from[0] + dx * k * 0.86, from[1] + dy * k * 0.86];
  return (
    <g>
      <path d={`M${from[0]} ${from[1]}L${end[0]} ${end[1]}`} stroke={shirt.base} strokeWidth="56" strokeLinecap="round" />
      <path d={`M${hem[0]} ${hem[1]}L${end[0]} ${end[1]}`} stroke={shirt.shade} strokeWidth="56" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

/**
 * Mão fechada num cabo, como nas fotos de referência: o cabo (vertical, y)
 * passa entre a palma e os dedos; os quatro dedos ficam empilhados por cima
 * dele, do indicador (em cima) ao mínimo, com as pontas para a esquerda (-x);
 * a palma e o pulso ficam à direita (+x) e o polegar fecha por cima.
 * `view="palm"` mostra as unhas nas pontas; `"back"` mostra os nós (costas da mão).
 * A ferramenta entra como `children`, desenhada entre a palma e os dedos.
 */
function GripHand({ skin, view, children }: { skin: Tone; view: "palm" | "back"; children?: React.ReactNode }) {
  const fingers = [
    { y: -20, h: 10.5, tip: -17 },
    { y: -10, h: 10.5, tip: -18.5 },
    { y: 0, h: 10, tip: -17 },
    { y: 9.5, h: 9, tip: -13.5 },
  ];
  return (
    <g transform="scale(1.15)">
      {/* palma (ou dorso) e começo do pulso */}
      <rect x="2" y="-22" width="24" height="42" rx="11" fill={skin.base} />
      <path d="M18 -20c5 2 8 6 8 11v18c0 5-3 9-8 11z" fill={skin.shade} opacity="0.4" />
      {children}
      {/* dedos empilhados em volta do cabo */}
      {[...fingers].reverse().map(({ y, h, tip }) => (
        <g key={y}>
          <rect x={tip} y={y} width={16 - tip} height={h} rx={h / 2} fill={skin.base} />
          <path d={`M${tip + 3} ${y + h - 0.6}H13`} stroke={skin.shade} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          {view === "palm" ? (
            <ellipse cx={tip + 4} cy={y + h / 2} rx="2.9" ry={h / 2 - 1.6} fill={skin.light} opacity="0.95" />
          ) : (
            <path d={`M${tip + 2.5} ${y + 3}q2-1.6 4.5-1`} fill="none" stroke={skin.light} strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
          )}
        </g>
      ))}
      {/* polegar fechando por cima do indicador */}
      <path d="M22 -16c-2-6-8-9-15-9H-4c-4 0-6 3-5 6 1 2 3 3 6 3h9c4 0 8 1 11 3z" fill={skin.base} />
      <path d="M-6 -16.5c5 1 11 1 16 0" fill="none" stroke={skin.shade} strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
      {view === "palm" && <ellipse cx="-3.5" cy="-21.5" rx="3.6" ry="2.6" fill={skin.light} opacity="0.95" />}
    </g>
  );
}

/**
 * Joinha: mão fechada de lado, dedos dobrados empilhados e polegar para cima,
 * saindo do lado dos nós. Desenhada para a mão do lado direito da imagem
 * (pontas dos dedos dobrados viradas para o meio do corpo, à esquerda); o
 * pulso fica embaixo (+y). A outra é o espelho.
 */
function ThumbsUp({ skin }: { skin: Tone }) {
  const fingers: [number, number][] = [[-18, 30], [-8.5, 31], [1, 29], [10.5, 25]];
  return (
    <g transform="scale(1.2)">
      {/* palma e dorso */}
      <rect x="-12" y="-18" width="26" height="40" rx="10" fill={skin.base} />
      <path d="M8 -17c4 2 6 6 6 10v20c0 5-3 8-6 9z" fill={skin.shade} opacity="0.4" />
      {/* polegar para cima, com unha */}
      <rect x="1" y="-44" width="11.5" height="32" rx="5.75" fill={skin.base} />
      <path d="M9 -43c2 1 3.5 4 3.5 7v20h-3.5z" fill={skin.shade} opacity="0.35" />
      <ellipse cx="6.2" cy="-38.5" rx="3.4" ry="4.2" fill={skin.light} />
      <path d="M2 -16q5 3 10 0" fill="none" stroke={skin.shade} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      {/* quatro dedos dobrados, frente arredondada para o lado de dentro */}
      {fingers.map(([y, w]) => (
        <rect key={y} x={12 - w} y={y} width={w} height="9.5" rx="4.75" fill={skin.base} />
      ))}
      {fingers.slice(1).map(([y, w]) => (
        <path key={y} d={`M${13 - w} ${y + 0.2}h${w - 6}`} stroke={skin.shade} strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
      ))}
      {fingers.map(([y, w]) => (
        <path key={`b${y}`} d={`M${14.5 - w} ${y + 3.2}q1.4-1.6 3 -1.6`} fill="none" stroke={skin.light} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      ))}
    </g>
  );
}

/** Ajuste de cada ferramenta dentro da mão (todas desenhadas em pé, cabo em x = 0). */
const GRIP: Record<ToolName, string> = { screwdriver: "", wrench: "", hammer: "", drill: "scale(0.85)", gauges: "" };

const SHOULDER: Record<"L" | "R", Pt> = { L: [124, 286], R: [276, 286] };

/** Um braço da pose: cotovelo, mão e o que a mão faz. `twist` dobra o pulso (graus). */
/** grip: "tool" segura a ferramenta, "joinha" faz sinal de positivo, "none" deixa a mão fora de vista. */
/**
 * Para a mão com ferramenta: `angle` gira a mão (graus; 0 = cabo em pé, pontas
 * dos dedos para a esquerda), `mirror` espelha (pontas para a direita) e
 * `view` escolhe palma ou costas.
 */
type ArmSpec = { elbow: Pt; hand: Pt; grip: "tool" | "joinha" | "none"; angle?: number; mirror?: boolean; view?: "palm" | "back" };
type PoseSpec = { L: ArmSpec; R: ArmSpec; front: ("L" | "R")[] };

const JOINHA_L: ArmSpec = { elbow: [50, 400], hand: [48, 318], grip: "joinha" };
const JOINHA_R: ArmSpec = { elbow: [350, 400], hand: [352, 318], grip: "joinha" };
const HANG_L: ArmSpec = { elbow: [90, 394], hand: [76, 540], grip: "none" };
const HANG_R: ArmSpec = { elbow: [310, 394], hand: [324, 540], grip: "none" };

export const POSES = {
  /** ferramenta erguida à esquerda, joinha com a outra mão */
  ergue: { L: { elbow: [60, 412], hand: [80, 300], grip: "tool", angle: 10, view: "palm" }, R: JOINHA_R, front: ["R", "L"] },
  /** ferramenta erguida à direita, outro braço solto */
  "ergue-direita": { L: HANG_L, R: { elbow: [340, 412], hand: [320, 300], grip: "tool", angle: -10, mirror: true, view: "palm" }, front: ["L", "R"] },
  /** mostrando a ferramenta na frente do peito, outro braço solto */
  mostra: { L: HANG_L, R: { elbow: [300, 424], hand: [240, 362], grip: "tool", angle: -90, mirror: true, view: "palm" }, front: ["L", "R"] },
  /** braço dobrado para cima ao lado do ombro, joinha com a outra mão */
  forca: { L: JOINHA_L, R: { elbow: [352, 372], hand: [318, 270], grip: "tool", angle: -40, mirror: true, view: "back" }, front: ["L", "R"] },
  /** braços cruzados, ferramenta para cima (a outra mão fica escondida sob o braço) */
  cruzados: { L: { elbow: [94, 428], hand: [290, 404], grip: "none" }, R: { elbow: [306, 430], hand: [134, 368], grip: "tool", angle: 5, view: "back" }, front: ["L", "R"] },
  /** sem ferramenta: braço solto e joinha */
  joinha: { L: HANG_L, R: JOINHA_R, front: ["L", "R"] },
} satisfies Record<string, PoseSpec>;
export type PoseName = keyof typeof POSES;

const deg = (rad: number) => (rad * 180) / Math.PI;

/** Braço inteiro e manga, desenhados antes do tronco (a manga "sai" da camisa). */
function UpperArm({ side, arm, skin, shirt }: { side: "L" | "R"; arm: ArmSpec; skin: Tone; shirt: Cloth }) {
  const sh = SHOULDER[side];
  return (
    <g>
      <path d={armPath(sh, arm.elbow, arm.hand, ARM_W)} fill={skin.shade} />
      <path d={armPath(sh, arm.elbow, arm.hand, LIT_W)} fill={skin.base} transform={LIT_SHIFT} />
      <Sleeve from={sh} toward={arm.elbow} shirt={shirt} />
    </g>
  );
}

/** Antebraço (redesenhado na frente do tronco) e mão. O punho fica perpendicular ao antebraço; a mão esquerda é espelhada. */
function Forearm({ side, arm, skin, tool }: { side: "L" | "R"; arm: ArmSpec; skin: Tone; tool?: ToolName }) {
  const [hx, hy] = arm.hand;
  const vx = arm.elbow[0] - hx, vy = arm.elbow[1] - hy;
  const len = Math.hypot(vx, vy);
  let hand = null;
  if (arm.grip === "tool" && tool) {
    const Tool = TOOLS[tool];
    const angle = arm.angle ?? 0;
    const flip = arm.mirror ? " scale(-1 1)" : "";
    // o manômetro fica sempre em pé e sem espelhar (azul à esquerda): desfaz a rotação da mão
    const toolTransform = tool === "gauges" ? `${flip} rotate(${-angle}) translate(0 27)` : GRIP[tool];
    hand = (
      <g transform={`translate(${hx} ${hy}) rotate(${angle})${flip}`}>
        <GripHand skin={skin} view={arm.view ?? "palm"}>
          <g transform={`scale(${1 / 1.15})${toolTransform ? ` ${toolTransform}` : ""}`}><Tool /></g>
        </GripHand>
      </g>
    );
  } else if (arm.grip === "joinha") {
    // polegar para cima, frente dos dedos virada para o meio do corpo
    const angle = deg(Math.atan2(-vx / len, vy / len));
    hand = (
      <g transform={`translate(${hx} ${hy}) rotate(${angle})${side === "L" ? " scale(-1 1)" : ""}`}>
        <ThumbsUp skin={skin} />
      </g>
    );
  }
  const sh = SHOULDER[side];
  return (
    <g>
      <path d={forearmPath(arm.elbow, arm.hand, [ARM_W[1], ARM_W[2]])} fill={skin.shade} />
      <path d={forearmPath(arm.elbow, arm.hand, [LIT_W[1], LIT_W[2]])} fill={skin.base} transform={LIT_SHIFT} />
      <path d={elbowCrease(sh, arm.elbow, arm.hand)} fill="none" stroke={skin.shade} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {hand}
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
  pose,
  mustache,
}: RealPersonProps) {
  const p: PoseSpec = POSES[pose ?? (tool === "none" ? "joinha" : "ergue")];
  const held = tool === "none" ? undefined : tool;
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
      <UpperArm side="L" arm={p.L} skin={skin} shirt={shirt} />
      <UpperArm side="R" arm={p.R} skin={skin} shirt={shirt} />

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

      {mustache && <path d="M182 172c6-6 12-6 18-2 6-4 12-4 18 2-6 3-12 3-18 0-6 3-12 3-18 0z" fill={hairColor} />}

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
          {/* volume cobrindo o alto da cabeça, com cachos na linha da testa e nas laterais */}
          <path d="M146 130c-6-46 18-76 54-76s60 30 54 76c-6-18-14-28-26-33-18-6-38-6-56 0-12 5-20 15-26 33z" />
          {[[164, 99, 10], [181, 94, 10], [200, 92, 10], [219, 94, 10], [236, 99, 10], [151, 114, 10], [249, 114, 10]].map(([x, y, r]) => (
            <circle key={`f${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
          <g fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="2.4" strokeLinecap="round">
            {[[172, 72], [196, 64], [222, 70], [160, 90], [240, 88], [184, 84], [212, 82]].map(([x, y]) => (
              <path key={`c${x}-${y}`} d={`M${x - 6} ${y + 2}a6 6 0 0 1 12 0`} />
            ))}
          </g>
        </g>
      )}
      {headwear !== "none" && (hair === "bun" || hair === "curly") && (
        <path d="M152 106c-2 12 0 22 2 30l6-28zM248 106c2 12 0 22-2 30l-6-28z" fill={hairColor} />
      )}
      {headwear !== "none" && (hair === "short" || hair === "buzz") && (
        <path d="M150 104c-2 12-1 24 3 32l6-2c-3-10-3-20-1-30zM250 104c2 12 1 24-3 32l-6-2c3-10 3-20 1-30z" fill={hairColor} opacity={hair === "buzz" ? 0.85 : 1} />
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
      {p.front.map((side) => (
        <Forearm key={side} side={side} arm={p[side]} skin={skin} tool={held} />
      ))}
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
    person: { skin: SKIN.brown, hair: "bun", hairColor: HAIR.black, headwear: "hardhat", shirt: CLOTH.petrol, earrings: true, tool: "screwdriver", pose: "ergue" },
  },
  encanador: {
    label: "Ilustração: encanador sorridente de boné segurando uma chave de grifo",
    person: { skin: SKIN.light, hair: "short", hairColor: HAIR.brown, headwear: "cap", capColor: CLOTH.leaf, shirt: CLOTH.sand, mustache: true, tool: "wrench", pose: "ergue-direita" },
  },
  "ar-condicionado": {
    label: "Ilustração: técnica de ar-condicionado sorridente segurando um manômetro",
    person: { skin: SKIN.tan, hair: "curly", hairColor: HAIR.auburn, shirt: CLOTH.leaf, earrings: true, tool: "gauges", pose: "mostra" },
  },
  "montagem-de-moveis": {
    label: "Ilustração: montador sorridente de boné segurando uma furadeira",
    shift: 22,
    person: { skin: SKIN.deep, hair: "short", hairColor: HAIR.black, headwear: "cap", capColor: CLOTH.petrol, beard: true, shirt: CLOTH.clay, tool: "drill", pose: "forca" },
  },
  "pequenos-reparos": {
    label: "Ilustração: profissional de pequenos reparos sorridente segurando um martelo",
    person: { skin: SKIN.tan, hair: "buzz", hairColor: HAIR.black, beard: true, shirt: CLOTH.ink, tool: "hammer", pose: "cruzados" },
  },
} satisfies Record<string, { label: string; person: RealPersonProps; shift?: number }>;

export type TradeSlug = keyof typeof TRADES;

/** Selos com fatos verdadeiros; `x` escolhe o canto que não esconde as mãos. */
const BADGES = {
  eletrica: { title: "Documentos", sub: "conferidos pela equipe", x: 6 },
  "montagem-de-moveis": { title: "Sem taxa", sub: "para ver os pedidos", x: 232 },
} as const;

/** Profissional sobre fundo de casinha. Mostra selo só nos serviços que têm um. */
export function HeroPro({ className, trade = "eletrica", badge = true }: { className?: string; trade?: TradeSlug; badge?: boolean }) {
  const t = TRADES[trade];
  const b = badge ? BADGES[trade as keyof typeof BADGES] : undefined;
  return (
    <svg viewBox="0 0 440 470" className={className} role="img" aria-label={t.label}>
      <path d="M50 470V226L220 84l170 142v244z" fill="var(--color-tape-soft)" stroke="var(--color-tape-soft)" strokeWidth="28" strokeLinejoin="round" />
      <path d="M24 214 220 50l196 164" fill="none" stroke="var(--color-tape)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <g transform={`translate(${"shift" in t ? t.shift : 46} -30)`}>
        <RealPerson {...t.person} />
      </g>
      {b && <TruthBadge x={b.x} y={404} w={200} title={b.title} sub={b.sub} />}
    </svg>
  );
}

/** Profissional do serviço, para a landing da categoria (cai para null se não houver). */
export function TradeArt({ slug, className }: { slug: string; className?: string }) {
  if (!(slug in TRADES)) return null;
  return <HeroPro trade={slug as TradeSlug} badge={false} className={className} />;
}

/** Equipe: eletricista, encanador e técnica de ar-condicionado, cada um numa pose. */
export function ProTeam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 360" className={className} role="img" aria-label="Ilustração: eletricista, encanador e técnica de ar-condicionado sorridentes">
      <ellipse cx="380" cy="352" rx="360" ry="22" fill="#18202c" opacity="0.08" />
      <g transform="translate(-2 30) scale(0.66)">
        <RealPerson {...TRADES.encanador.person} pose="ergue" />
      </g>
      <g transform="translate(512 30) scale(0.66)">
        <RealPerson {...TRADES["ar-condicionado"].person} />
      </g>
      <g transform="translate(236 0) scale(0.72)">
        <RealPerson {...TRADES.eletrica.person} skin={SKIN.deep} hair="short" earrings={false} beard pose="ergue-direita" />
      </g>
    </svg>
  );
}
