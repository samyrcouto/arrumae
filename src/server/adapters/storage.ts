import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env";

/**
 * Armazenamento de arquivos privado. Arquivos nunca ficam em /public: são
 * servidos por rotas autenticadas que verificam permissão (ver
 * src/app/arquivos/[...key]/route.ts).
 *
 * Para produção, implementar um driver S3-compatível (Supabase Storage,
 * Cloudflare R2, AWS S3) com a mesma interface.
 */
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const KEY_PATTERN = /^[a-z-]+\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|pdf)$/;

export function assertSafeKey(key: string) {
  if (!KEY_PATTERN.test(key)) throw new Error("Chave de armazenamento inválida");
}

class LocalStorage implements StorageDriver {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    assertSafeKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Caminho fora do armazenamento");
    return full;
  }

  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { mode: 0o600 });
  }

  async get(key: string) {
    try {
      return await readFile(this.resolve(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}

let driver: StorageDriver | undefined;

export function storage(): StorageDriver {
  if (!driver) {
    const e = env();
    switch (e.STORAGE_DRIVER) {
      case "local":
        driver = new LocalStorage(path.resolve(e.STORAGE_LOCAL_DIR));
        break;
    }
  }
  return driver!;
}

export function makeKey(folder: "request-photos" | "pro-documents" | "pro-photos", ownerId: string, fileId: string, mime: string) {
  const ext = mime === "application/pdf" ? "pdf" : "webp";
  const key = `${folder}/${ownerId}/${fileId}.${ext}`;
  assertSafeKey(key);
  return key;
}
