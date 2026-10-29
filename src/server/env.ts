import "server-only";
import { z } from "zod";

// Linha vazia no .env ("CHAVE=") conta como não definida.
const optional = <T extends z.ZodType>(t: T) => z.preprocess((v) => (v === "" ? undefined : v), t.optional());

const schema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  APP_SECRET: z.string().min(32, "APP_SECRET precisa ter pelo menos 32 caracteres"),
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  EMAIL_DRIVER: z.enum(["console"]).default("console"),
  EMAIL_FROM: z.string().default("Arrumaê <nao-responda@exemplo.com.br>"),
  PAYMENT_PROVIDER: z.enum(["offline"]).default("offline"),
  // Chave da criptografia de CPF/CNPJ e do segredo do 2FA (security/field-crypto.ts).
  // Obrigatória em produção; fora dela, sem valor, é derivada do APP_SECRET.
  DATA_ENCRYPTION_KEY: optional(z.string().min(32, "DATA_ENCRYPTION_KEY precisa ter pelo menos 32 caracteres")),
  // Só durante a troca de chave: a anterior, para ler o que ainda não foi regravado.
  DATA_ENCRYPTION_KEY_PREVIOUS: optional(z.string().min(32)),
  // Exigir 2FA de administradores. Padrão: sim em produção/homologação, não em dev/teste.
  ADMIN_REQUIRE_2FA: optional(z.enum(["true", "false"])),
  // Cabeçalho com o IP real do visitante definido pelo provedor (ex.: x-vercel-forwarded-for,
  // cf-connecting-ip). Sem ele, o IP vem do X-Forwarded-For, que o visitante pode falsificar.
  TRUSTED_IP_HEADER: optional(z.string().regex(/^[a-z0-9-]+$/i, "TRUSTED_IP_HEADER deve ser o nome de um cabeçalho")),
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
    if (parsed.data.APP_ENV === "production") {
      const key = parsed.data.DATA_ENCRYPTION_KEY;
      if (!key) throw new Error("DATA_ENCRYPTION_KEY é obrigatória em produção");
      if (key === parsed.data.APP_SECRET) throw new Error("DATA_ENCRYPTION_KEY precisa ser diferente do APP_SECRET");
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProduction = () => env().APP_ENV === "production";

/** 2FA obrigatório para administradores? (lido a cada chamada; o valor já foi validado em env()) */
export const adminRequires2fa = () => {
  const flag = process.env.ADMIN_REQUIRE_2FA;
  if (flag === "true" || flag === "false") return flag === "true";
  const appEnv = env().APP_ENV;
  return appEnv === "production" || appEnv === "staging";
};
