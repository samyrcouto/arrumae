/**
 * Seed do banco.
 *
 *   npm run db:seed          → catálogo base (categorias e regiões do piloto). Idempotente.
 *   npm run db:seed -- --demo → também cria DADOS DE DEMONSTRAÇÃO (is_demo = true).
 *
 * Dados de demonstração:
 * - nunca são criados com APP_ENV=production;
 * - usam nomes prefixados com "[DEMO]" e e-mails @demo.desenrola.invalid;
 * - avaliações e serviços de demo são marcados e exibidos com aviso na interface.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const { db, closeDb } = await import("../src/server/db/client");
const schema = await import("../src/server/db/schema");
const { eq, sql } = await import("drizzle-orm");
const { registerUser } = await import("../src/server/services/accounts");
const { hashPassword } = await import("../src/server/auth/password");
const { TERMS_VERSION } = await import("../src/config/legal");

export const CATEGORIES = [
  {
    slug: "eletrica",
    name: "Eletricista",
    shortDescription: "Pequenos serviços elétricos residenciais: tomadas, chuveiros, luminárias e disjuntores.",
    examples: [
      "Trocar tomada ou interruptor",
      "Instalar ou trocar chuveiro elétrico",
      "Instalar luminária, lustre ou ventilador de teto",
      "Disjuntor desarmando",
      "Instalar tomada nova (com fiação aparente ou existente)",
    ],
    outOfScope: [
      "Projeto elétrico, troca de padrão de entrada ou aumento de carga junto à concessionária",
      "Quadro de distribuição novo completo (exige responsável técnico)",
      "Qualquer serviço na rede pública",
    ],
    pricingMode: "fixed_or_visit" as const,
    sortOrder: 1,
  },
  {
    slug: "encanador",
    name: "Encanador",
    shortDescription: "Vazamentos, torneiras, descargas e pequenos reparos hidráulicos.",
    examples: [
      "Vazamento em torneira, sifão ou registro",
      "Trocar torneira ou misturador",
      "Consertar descarga ou caixa acoplada",
      "Instalar filtro ou purificador",
      "Desentupir pia ou ralo (casos simples)",
    ],
    outOfScope: ["Instalações de gás", "Obras com quebra extensa de paredes ou pisos", "Caça-vazamento com equipamento especial"],
    pricingMode: "fixed_or_visit" as const,
    sortOrder: 2,
  },
  {
    slug: "montagem-de-moveis",
    name: "Montagem de móveis",
    shortDescription: "Montagem e desmontagem de móveis de loja e de mudança.",
    examples: [
      "Montar guarda-roupa",
      "Montar cama, berço ou cômoda",
      "Montar rack, painel ou estante",
      "Montar escrivaninha ou mesa",
      "Desmontar móveis para mudança",
    ],
    outOfScope: ["Marcenaria sob medida", "Móveis planejados (instalação de fábrica)"],
    pricingMode: "fixed_or_visit" as const,
    sortOrder: 3,
  },
  {
    slug: "pequenos-reparos",
    name: "Pequenos reparos e instalações",
    shortDescription: "Furos, suportes e instalações rápidas que todo mundo adia.",
    examples: [
      "Instalar suporte de TV",
      "Instalar prateleiras, nichos ou quadros",
      "Instalar cortina, persiana ou varão",
      "Instalar varal de teto",
      "Trocar fechadura simples ou puxadores",
    ],
    outOfScope: ["Alvenaria, reboco e obras", "Serviços em altura sem equipamento de segurança (fachada, telhado)"],
    pricingMode: "fixed_or_visit" as const,
    sortOrder: 4,
  },
  {
    slug: "ar-condicionado",
    name: "Ar-condicionado split",
    shortDescription: "Limpeza, manutenção e diagnóstico de ar-condicionado split. Instalação exige visita técnica.",
    examples: [
      "Higienização / limpeza de split",
      "Manutenção preventiva",
      "Ar-condicionado não gela ou pinga água",
      "Instalação de split (orçamento após visita)",
    ],
    outOfScope: ["Sistemas centrais e VRF", "Serviços em fachada sem acesso seguro"],
    pricingMode: "fixed_or_visit" as const,
    sortOrder: 5,
  },
];

/**
 * Regiões iniciais — HIPÓTESE (docs/PRODUCT.md#piloto). Prefixos de CEP de 3
 * dígitos são aproximações por setor postal e PRECISAM ser validados com a
 * base dos Correios antes do piloto.
 */
export const REGIONS = [
  { slug: "pinheiros-vila-madalena", name: "Pinheiros e Vila Madalena", cepPrefixes: ["054"] },
  { slug: "perdizes-pompeia", name: "Perdizes e Pompeia", cepPrefixes: ["050"] },
  { slug: "vila-mariana-saude", name: "Vila Mariana e Saúde", cepPrefixes: ["040", "041"] },
  { slug: "itaim-moema-vila-olimpia", name: "Itaim Bibi, Moema e Vila Olímpia", cepPrefixes: ["045"] },
  { slug: "jardins", name: "Jardins e Cerqueira César", cepPrefixes: ["014"] },
].map((r) => ({ ...r, city: "São Paulo", state: "SP" }));

export async function seedCatalog() {
  for (const c of CATEGORIES)
    await db
      .insert(schema.categories)
      .values(c)
      .onConflictDoUpdate({ target: schema.categories.slug, set: { ...c, updatedAt: new Date() } });
  for (const r of REGIONS)
    await db
      .insert(schema.regions)
      .values(r)
      .onConflictDoUpdate({ target: schema.regions.slug, set: { ...r, updatedAt: new Date() } });
}

const DEMO_PASSWORD = "demo-senha-123";

async function seedDemo() {
  if (process.env.APP_ENV === "production") throw new Error("Seed de demonstração bloqueado em produção.");
  const existing = await db.select().from(schema.users).where(eq(schema.users.isDemo, true));
  if (existing.length) {
    console.log("Dados de demonstração já existem — nada a fazer.");
    return;
  }
  const cats = await db.select().from(schema.categories);
  const regs = await db.select().from(schema.regions);
  const cat = (slug: string) => cats.find((c) => c.slug === slug)!;

  // Admin de demonstração (apenas desenvolvimento)
  await db.insert(schema.users).values({
    email: "admin@demo.desenrola.invalid",
    passwordHash: await hashPassword(DEMO_PASSWORD),
    name: "[DEMO] Admin",
    role: "admin",
    termsVersion: TERMS_VERSION,
    termsAcceptedAt: new Date(),
    isDemo: true,
  });

  const client = await registerUser(
    {
      name: "[DEMO] Cliente Ana",
      email: "cliente@demo.desenrola.invalid",
      phone: "11900000001",
      password: DEMO_PASSWORD,
      role: "client",
      acceptTerms: true,
    },
    { isDemo: true },
  );

  const pros = [
    { name: "[DEMO] Carlos Eletricista", email: "pro1@demo.desenrola.invalid", cats: ["eletrica", "pequenos-reparos"], years: 12 },
    { name: "[DEMO] Marta Hidráulica", email: "pro2@demo.desenrola.invalid", cats: ["encanador"], years: 8 },
    { name: "[DEMO] João Montador", email: "pro3@demo.desenrola.invalid", cats: ["montagem-de-moveis", "pequenos-reparos"], years: 5 },
    { name: "[DEMO] Rafa Climatização", email: "pro4@demo.desenrola.invalid", cats: ["ar-condicionado"], years: 6 },
  ];
  const proIds: string[] = [];
  for (const [i, p] of pros.entries()) {
    const u = await registerUser(
      { name: p.name, email: p.email, phone: `1190000001${i}`, password: DEMO_PASSWORD, role: "pro", acceptTerms: true },
      { isDemo: true },
    );
    proIds.push(u.id);
    await db
      .update(schema.proProfiles)
      .set({
        displayName: p.name,
        bio: "Perfil de demonstração. Este profissional não existe e não presta serviços reais.",
        yearsExperience: p.years,
        verificationStatus: "approved",
        verifiedAt: new Date(),
        acceptsUrgent: i % 2 === 0,
      })
      .where(eq(schema.proProfiles.userId, u.id));
    await db.insert(schema.proCategories).values(p.cats.map((slug) => ({ proId: u.id, categoryId: cat(slug).id })));
    await db.insert(schema.proRegions).values(regs.map((r) => ({ proId: u.id, regionId: r.id })));
    await db.insert(schema.proAvailability).values(
      [1, 2, 3, 4, 5, 6].map((weekday) => ({ proId: u.id, weekday, startMinute: 8 * 60, endMinute: 18 * 60 })),
    );
  }

  // Um serviço concluído com avaliação (DEMO), para visualizar perfis e indicadores.
  const [req] = await db
    .insert(schema.serviceRequests)
    .values({
      clientId: client.id,
      categoryId: cat("eletrica").id,
      regionId: regs[0].id,
      title: "[DEMO] Trocar chuveiro elétrico",
      description: "Solicitação de demonstração: chuveiro antigo queimou, quero trocar por um novo que já comprei.",
      cep: "05422000",
      neighborhood: "Pinheiros",
      addressLine: "Endereço de demonstração, 100",
      urgency: "this_week",
      status: "completed",
      proId: proIds[0],
      scheduledStart: new Date(Date.now() - 5 * 86400_000),
      scheduledEnd: new Date(Date.now() - 5 * 86400_000 + 2 * 3600_000),
      startedAt: new Date(Date.now() - 5 * 86400_000),
      completedAt: new Date(Date.now() - 5 * 86400_000 + 3600_000),
      confirmedAt: new Date(Date.now() - 4 * 86400_000),
      expiresAt: new Date(Date.now() - 3 * 86400_000),
      agreedAmountCents: 15000,
      finalAmountCents: 15000,
      submissionToken: "demo-1",
      isDemo: true,
    })
    .returning();
  await db.insert(schema.reviews).values({
    requestId: req.id,
    proId: proIds[0],
    clientId: client.id,
    rating: 5,
    comment: "Avaliação de demonstração — não é uma avaliação real.",
    isDemo: true,
  });

  console.log(`
Dados de DEMONSTRAÇÃO criados (senha de todas as contas: ${DEMO_PASSWORD}):
  admin@demo.desenrola.invalid    (admin)
  cliente@demo.desenrola.invalid  (cliente)
  pro1..pro4@demo.desenrola.invalid (profissionais aprovados)
Use CEPs começando com 054, 050, 040, 041, 045 ou 014 para criar solicitações.`);
}

await seedCatalog();
console.log("Catálogo base aplicado.");
if (process.argv.includes("--demo")) await seedDemo();
const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from categories`);
console.log(`Categorias no banco: ${n}`);
await closeDb();
