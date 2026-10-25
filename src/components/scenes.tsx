/**
 * Cenários de fundo (sala e cozinha) para os personagens de `people.tsx`.
 * Cores suaves e sem contorno, para os personagens continuarem em destaque.
 * Tudo em SVG puro; cada peça recebe a posição por props.
 */

export type SceneKind = "sala" | "cozinha";

const C = {
  wallSala: "#f6ecdc",
  wallCozinha: "#eef1ec",
  floor: "#d8b48c",
  floorLine: "#c49d74",
  white: "#fbf8f4",
  glass: "#cfe3ea",
  curtain: "#e7a184",
  sofa: "#9cb9b4",
  sofaShade: "#86a6a1",
  wood: "#b07a45",
  sage: "#b9cfc1",
  sageShade: "#a3bcad",
  counter: "#6b7480",
  tile: "#f7f7f2",
  grout: "#dde2de",
  metal: "#9aa3aa",
  leaf: "#5aa883",
  leafDark: "#3f8f6b",
  pot: "#c8714b",
};

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[[-14, -50, -30], [10, -56, 24], [-2, -66, 2], [-22, -36, -55], [20, -40, 50]].map(([cx, cy, r]) => (
        <ellipse key={`${cx}${cy}`} cx={cx} cy={cy} rx="9" ry="22" fill={r % 2 ? C.leafDark : C.leaf} transform={`rotate(${r} ${cx} ${cy})`} />
      ))}
      <path d="M-16 -24h32l-4 24h-24z" fill={C.pot} />
      <rect x="-18" y="-28" width="36" height="6" rx="2" fill={C.pot} />
    </g>
  );
}

function Window({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={C.white} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="2" fill={C.glass} />
      <path d={`M${x + 14} ${y + h - 20}l${w * 0.35} ${-h * 0.45}M${x + 26} ${y + h - 14}l${w * 0.25} ${-h * 0.32}`} stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <path d={`M${x + w / 2} ${y + 6}v${h - 12}M${x + 6} ${y + h / 2}h${w - 12}`} stroke={C.white} strokeWidth="5" />
      <rect x={x - 6} y={y + h - 2} width={w + 12} height="8" rx="3" fill={C.white} />
    </g>
  );
}

function Picture({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={C.wood} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} fill={C.white} />
      <circle cx={x + w * 0.68} cy={y + h * 0.38} r={h * 0.13} fill="#f2b33d" />
      <path d={`M${x + 5} ${y + h - 5}l${w * 0.3} ${-h * 0.4} ${w * 0.18} ${h * 0.2} ${w * 0.22} ${-h * 0.28} ${w * 0.3 - 10} ${h * 0.48}z`} fill={C.leaf} />
    </g>
  );
}

function Lamp({ x, floor, top }: { x: number; floor: number; top: number }) {
  return (
    <g>
      <rect x={x - 2} y={top + 30} width="4" height={floor - top - 34} fill={C.counter} />
      <ellipse cx={x} cy={floor - 3} rx="16" ry="4" fill={C.counter} />
      <path d={`M${x - 14} ${top}h28l10 32h-48z`} fill="#f2c46b" />
      <path d={`M${x - 24} ${top + 32}h48`} stroke="#e3a93f" strokeWidth="3" />
    </g>
  );
}

function Sofa({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x + 16} y={y} width={w - 32} height="64" rx="16" fill={C.sofa} />
      <rect x={x + 16} y={y + 46} width={w - 32} height="44" rx="10" fill={C.sofaShade} />
      <rect x={x} y={y + 24} width="34" height="70" rx="14" fill={C.sofa} />
      <rect x={x + w - 34} y={y + 24} width="34" height="70" rx="14" fill={C.sofa} />
      <rect x={x + 26} y={y + 14} width="40" height="34" rx="10" fill={C.curtain} opacity="0.85" />
      <rect x={x + w - 66} y={y + 14} width="40" height="34" rx="10" fill="#f2c46b" opacity="0.9" />
    </g>
  );
}

function Outlet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="18" height="24" rx="3" fill={C.white} />
      <circle cx={x + 6} cy={y + 12} r="1.8" fill={C.metal} />
      <circle cx={x + 12} cy={y + 12} r="1.8" fill={C.metal} />
    </g>
  );
}

function Floor({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={C.floor} />
      <rect x={x} y={y - 4} width={w} height="5" fill={C.white} />
      {Array.from({ length: Math.ceil(w / 60) }, (_, i) => (
        <path key={i} d={`M${x + i * 60 + (i % 2) * 30} ${y + 4}v${h}`} stroke={C.floorLine} strokeWidth="2" />
      ))}
    </g>
  );
}

function Cabinets({ x, y, w, h, doors }: { x: number; y: number; w: number; h: number; doors: number }) {
  const dw = w / doors;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={C.sage} />
      {Array.from({ length: doors }, (_, i) => (
        <g key={i}>
          <rect x={x + i * dw + 4} y={y + 4} width={dw - 8} height={h - 8} rx="2" fill={C.sageShade} opacity="0.55" />
          <rect x={x + i * dw + (i % 2 ? 9 : dw - 13)} y={y + h / 2 - 9} width="4" height="18" rx="2" fill={C.counter} />
        </g>
      ))}
    </g>
  );
}

function Tiles({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={C.tile} />
      {Array.from({ length: Math.floor(h / 18) }, (_, i) => (
        <path key={`h${i}`} d={`M${x} ${y + (i + 1) * 18}h${w}`} stroke={C.grout} strokeWidth="1.5" />
      ))}
      {Array.from({ length: Math.ceil(w / 28) }, (_, i) => (
        <path key={`v${i}`} d={`M${x + i * 28} ${y}v${h}`} stroke={C.grout} strokeWidth="1.5" />
      ))}
    </g>
  );
}

function Counter({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <Cabinets x={x} y={y + 12} w={w} h={h - 12} doors={Math.max(2, Math.round(w / 70))} />
      <rect x={x - 4} y={y} width={w + 8} height="14" rx="3" fill={C.counter} />
    </g>
  );
}

function Faucet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 30} y={y - 3} width="60" height="5" rx="2" fill={C.metal} />
      <path d={`M${x - 6} ${y - 2}v-30c0-10 18-10 18 0v6`} fill="none" stroke={C.metal} strokeWidth="5" strokeLinecap="round" />
      <rect x={x - 16} y={y - 12} width="8" height="10" rx="2" fill={C.metal} />
    </g>
  );
}

function Pan({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 20} y={y - 24} width="40" height="24" rx="6" fill="#d9653b" />
      <rect x={x - 24} y={y - 28} width="48" height="6" rx="3" fill="#b44d29" />
      <rect x={x - 5} y={y - 34} width="10" height="6" rx="3" fill="#b44d29" />
    </g>
  );
}

/** Contorno da casinha (mesmo do HeroPro), usado para recortar o cenário. */
export const HOUSE_PATH = "M50 470V226L220 84l170 142v244z";

/** Cenário de um cômodo dentro da casinha do HeroPro (viewBox 440×470). */
export function RoomScene({ kind, clipId }: { kind: SceneKind; clipId: string }) {
  return (
    <g>
      <clipPath id={clipId}>
        <path d={HOUSE_PATH} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {kind === "sala" ? (
          <g>
            <rect x="0" y="60" width="440" height="410" fill={C.wallSala} />
            <rect x="56" y="152" width="16" height="150" rx="6" fill={C.curtain} />
            <Window x={74} y={166} w={84} h={112} />
            <Picture x={318} y={176} w={58} h={46} />
            <Outlet x={300} y={300} />
            <Floor x={0} y={440} w={440} h={30} />
            <Lamp x={372} floor={440} top={250} />
            <Sofa x={40} y={348} w={364} />
            <Plant x={84} y={440} s={0.9} />
          </g>
        ) : (
          <g>
            <rect x="0" y="60" width="440" height="410" fill={C.wallCozinha} />
            <Cabinets x={50} y={170} w={104} h={80} doors={2} />
            <Cabinets x={290} y={170} w={100} h={80} doors={2} />
            <Tiles x={0} y={270} w={440} h={78} />
            <Faucet x={100} y={348} />
            <Pan x={346} y={348} />
            <Counter x={40} y={348} w={360} h={122} />
          </g>
        )}
      </g>
    </g>
  );
}

/** Cenário largo da equipe (viewBox 760×360): cozinha à esquerda, sala à direita. */
export function OpenPlanScene({ clipId }: { clipId: string }) {
  return (
    <g>
      <clipPath id={clipId}>
        <rect x="16" y="16" width="728" height="380" rx="28" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {/* cozinha */}
        <rect x="0" y="0" width="380" height="360" fill={C.wallCozinha} />
        <Cabinets x={34} y={44} w={150} h={70} doors={2} />
        <Cabinets x={230} y={44} w={120} h={70} doors={2} />
        <Tiles x={0} y={130} w={380} h={78} />
        <Faucet x={110} y={208} />
        <Pan x={300} y={208} />
        <Counter x={24} y={208} w={340} h={152} />
        {/* sala */}
        <rect x="380" y="0" width="380" height="360" fill={C.wallSala} />
        <rect x="374" y="0" width="12" height="360" fill={C.white} opacity="0.8" />
        <rect x="420" y="40" width="14" height="140" rx="6" fill={C.curtain} />
        <Window x={436} y={52} w={92} h={116} />
        <Picture x={604} y={60} w={64} h={50} />
        <Floor x={386} y={330} w={374} h={30} />
        <Lamp x={722} floor={330} top={150} />
        <Sofa x={460} y={236} w={250} />
        <Plant x={412} y={330} s={0.8} />
      </g>
    </g>
  );
}
