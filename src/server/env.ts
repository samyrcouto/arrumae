import "server-only";
import { z } from "zod";

const schema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  APP_SECRET: z.string().min(32, "APP_SECRET precisa ter pelo menos 32 caracteres"),
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  EMAIL_DRIVER: z.enum(["console"]).default("console"),
  EMAIL_FROM: z.string().default("Desenrola Casa <nao-responda@exemplo.com.br>"),
  PAYMENT_PROVIDER: z.enum(["offline"]).default("offline"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Variáveis de ambiente validadas. Falha cedo, com mensagem clara, se algo faltar. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Configuração inválida: ${issues}`);
    }
    if (parsed.data.APP_ENV === "production" && parsed.data.APP_SECRET.startsWith("dev-only")) {
      throw new Error("APP_SECRET de desenvolvimento não pode ser usado em produção");
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProduction = () => env().APP_ENV === "production";
