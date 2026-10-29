import QRCode from "qrcode";

/**
 * QR code desenhado como SVG no servidor (sem imagem externa, sem script e sem
 * innerHTML). Usado para o app autenticador ler o segredo do 2FA.
 */
export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const quiet = 4; // margem branca exigida pelos leitores
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`}
      shapeRendering="crispEdges"
      className="rounded-xl"
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path d={d} fill="#18202c" />
    </svg>
  );
}
