import "server-only";
import sharp from "sharp";
import { invalid } from "../domain/errors";

/**
 * Validação de uploads. Não confiamos em extensão nem em Content-Type enviados
 * pelo navegador: o tipo é detectado pelos bytes iniciais (magic numbers).
 * Imagens são reprocessadas (re-encode para WebP), o que remove metadados como
 * localização GPS (EXIF) e neutraliza conteúdo malicioso embutido.
 */

export type DetectedType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function detectType(buf: Buffer): DetectedType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

export const UPLOAD_LIMITS = {
  imageMaxBytes: 8 * 1024 * 1024,
  pdfMaxBytes: 8 * 1024 * 1024,
  maxImagesPerRequest: 5,
  maxImageDimension: 1600,
} as const;

export type ProcessedFile = { buffer: Buffer; mimeType: string; sizeBytes: number };

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

/** Imagem de foto (solicitação, portfólio). Sempre retorna WebP sem metadados. */
export async function processImage(file: File): Promise<ProcessedFile> {
  if (file.size === 0) throw invalid("Arquivo vazio.");
  if (file.size > UPLOAD_LIMITS.imageMaxBytes) throw invalid("Cada foto pode ter no máximo 8 MB.");
  const input = await fileToBuffer(file);
  const type = detectType(input);
  if (!type || type === "application/pdf") throw invalid("Envie fotos nos formatos JPG, PNG ou WebP.");
  try {
    const output = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate() // aplica a orientação do EXIF antes de descartá-lo
      .resize({
        width: UPLOAD_LIMITS.maxImageDimension,
        height: UPLOAD_LIMITS.maxImageDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    return { buffer: output, mimeType: "image/webp", sizeBytes: output.length };
  } catch {
    throw invalid("Não foi possível ler a imagem. Tente outra foto.");
  }
}

/** Documento de verificação: imagem (reprocessada) ou PDF (validado). */
export async function processDocument(file: File): Promise<ProcessedFile> {
  if (file.size === 0) throw invalid("Arquivo vazio.");
  const input = await fileToBuffer(file);
  const type = detectType(input);
  if (type === "application/pdf") {
    if (input.length > UPLOAD_LIMITS.pdfMaxBytes) throw invalid("O PDF pode ter no máximo 8 MB.");
    // PDFs com JavaScript embutido são recusados (vetor comum de ataque).
    const head = input.toString("latin1");
    if (/\/JavaScript|\/JS\s|\/Launch|\/EmbeddedFile/.test(head)) throw invalid("Este PDF contém conteúdo não permitido.");
    return { buffer: input, mimeType: "application/pdf", sizeBytes: input.length };
  }
  if (!type) throw invalid("Envie documentos em JPG, PNG, WebP ou PDF.");
  return processImage(file);
}

/** Extrai arquivos de um FormData ignorando campos vazios (input file sem seleção). */
export function filesFrom(form: FormData, name: string): File[] {
  return form.getAll(name).filter((v): v is File => typeof v === "object" && v !== null && "arrayBuffer" in v && v.size > 0);
}
