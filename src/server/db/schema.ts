/**
 * Modelo de dados do Desenrola Casa.
 *
 * Convenções:
 * - Valores monetários em centavos (integer) — nunca float.
 * - Percentuais em basis points (bps): 1500 = 15%.
 * - Datas em timestamptz (UTC); exibição em America/Sao_Paulo.
 * - `is_demo` marca dados de demonstração. Nunca devem existir em produção.
 *
 * Documentação: docs/DATABASE.md
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", ["client", "pro", "admin"]);
export const userStatus = pgEnum("user_status", ["active", "suspended", "deleted"]);

export const verificationStatus = pgEnum("verification_status", [
  "draft", // perfil em preenchimento
  "pending_review", // enviado para análise
  "approved",
  "rejected",
  "suspended",
]);

export const documentKind = pgEnum("document_kind", ["identity", "address_proof", "certificate", "other"]);
export const documentStatus = pgEnum("document_status", ["pending", "accepted", "rejected"]);

export const pricingMode = pgEnum("pricing_mode", [
  "fixed_or_visit", // profissional escolhe preço fechado ou visita técnica
  "visit_required", // sempre exige visita antes do preço final
]);

export const urgency = pgEnum("urgency", ["today", "this_week", "flexible"]);

export const requestStatus = pgEnum("request_status", [
  "open", // recebendo propostas
  "scheduled", // proposta aceita e horário confirmado
  "in_progress", // profissional iniciou o atendimento
  "awaiting_confirmation", // profissional concluiu; cliente confirma ou contesta
  "completed",
  "disputed",
  "cancelled",
  "expired",
]);

export const quoteKind = pgEnum("quote_kind", ["fixed", "visit"]);
export const quoteStatus = pgEnum("quote_status", [
  "pending",
  "accepted",
  "rejected", // recusada pelo cliente
  "withdrawn", // retirada pelo profissional antes do aceite
  "superseded", // outra proposta foi aceita
  "expired",
  "cancelled", // aceita e depois cancelada (pelo profissional, ausência ou admin)
]);

export const revisionStatus = pgEnum("revision_status", ["pending", "approved", "rejected", "cancelled"]);

export const reviewStatus = pgEnum("review_status", ["published", "flagged", "hidden"]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "chargeback",
  "declared_offline", // piloto: cliente pagou direto ao profissional (não verificado pela plataforma)
]);

export const settlementStatus = pgEnum("settlement_status", ["recorded", "invoiced", "collected", "waived"]);
export const refundStatus = pgEnum("refund_status", ["requested", "approved", "rejected", "processed"]);

export const ticketCategory = pgEnum("ticket_category", [
  "question",
  "complaint",
  "payment",
  "safety",
  "review_report",
  "account",
]);
export const ticketStatus = pgEnum("ticket_status", ["open", "in_progress", "waiting_user", "resolved", "closed"]);
export const ticketPriority = pgEnum("ticket_priority", ["low", "normal", "high", "urgent"]);

export const discountType = pgEnum("discount_type", ["percent", "fixed"]);
export const outboundStatus = pgEnum("outbound_status", ["queued", "sent", "failed", "skipped"]);
export const dataRequestKind = pgEnum("data_request_kind", ["export", "deletion"]);

// ---------------------------------------------------------------------------
// Identidade e acesso
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("active"),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    termsVersion: text("terms_version").notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_key").on(sql`lower(${t.email})`), index("users_role_idx").on(t.role)],
);

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 do token. O token em si só existe no cookie do usuário.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Catálogo: categorias e regiões
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortDescription: text("short_description").notNull(),
  // Exemplos de serviços aceitos — mostrados ao cliente e na landing page.
  examples: jsonb("examples").$type<string[]>().notNull().default([]),
  // Itens fora do escopo (ex.: obras que exigem ART/engenheiro).
  outOfScope: jsonb("out_of_scope").$type<string[]>().notNull().default([]),
  pricingMode: pricingMode("pricing_mode").notNull().default("fixed_or_visit"),
  // Override de comissão da categoria; null = usar padrão comercial.
  commissionBps: integer("commission_bps"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const regions = pgTable("regions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  // Prefixos de CEP (3 a 5 dígitos) que pertencem à região; vence o mais
  // específico. Evita depender de geocodificação paga no piloto.
  cepPrefixes: jsonb("cep_prefixes").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Profissionais
// ---------------------------------------------------------------------------

export const proProfiles = pgTable("pro_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  yearsExperience: smallint("years_experience").notNull().default(0),
  cpf: text("cpf"),
  cnpj: text("cnpj"),
  acceptsUrgent: boolean("accepts_urgent").notNull().default(false),
  // Somente o painel administrativo altera estes campos.
  verificationStatus: verificationStatus("verification_status").notNull().default("draft"),
  verificationNotes: text("verification_notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => users.id),
  // Contadores operacionais mantidos pelo backend (não editáveis pelo profissional).
  cancellationsCount: integer("cancellations_count").notNull().default(0),
  noShowCount: integer("no_show_count").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const proCategories = pgTable(
  "pro_categories",
  {
    proId: uuid("pro_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
  },
  (t) => [primaryKey({ columns: [t.proId, t.categoryId] })],
);

export const proRegions = pgTable(
  "pro_regions",
  {
    proId: uuid("pro_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    regionId: uuid("region_id")
      .notNull()
      .references(() => regions.id),
  },
  (t) => [primaryKey({ columns: [t.proId, t.regionId] })],
);

export const proAvailability = pgTable(
  "pro_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proId: uuid("pro_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 0 = domingo
    startMinute: smallint("start_minute").notNull(), // minutos desde 00:00 (horário de Brasília)
    endMinute: smallint("end_minute").notNull(),
  },
  (t) => [
    index("pro_availability_pro_idx").on(t.proId),
    check("pro_availability_weekday", sql`${t.weekday} between 0 and 6`),
    check("pro_availability_range", sql`${t.startMinute} >= 0 and ${t.endMinute} <= 1440 and ${t.startMinute} < ${t.endMinute}`),
  ],
);

export const proDocuments = pgTable(
  "pro_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proId: uuid("pro_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: documentKind("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    status: documentStatus("status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("pro_documents_pro_idx").on(t.proId)],
);

export const proPhotos = pgTable(
  "pro_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proId: uuid("pro_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    caption: text("caption").notNull().default(""),
    // Profissional declarou ter autorização para publicar a imagem.
    rightsConfirmed: boolean("rights_confirmed").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("pro_photos_pro_idx").on(t.proId)],
);

// ---------------------------------------------------------------------------
// Solicitações, propostas e execução
// ---------------------------------------------------------------------------

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    regionId: uuid("region_id").references(() => regions.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    cep: text("cep").notNull(),
    neighborhood: text("neighborhood").notNull(),
    // Endereço completo só é revelado ao profissional após o agendamento.
    addressLine: text("address_line").notNull(),
    addressComplement: text("address_complement").notNull().default(""),
    urgency: urgency("urgency").notNull(),
    preferredWindow: text("preferred_window").notNull().default(""),
    status: requestStatus("status").notNull().default("open"),
    acceptedQuoteId: uuid("accepted_quote_id").references((): AnyPgColumn => quotes.id),
    proId: uuid("pro_id").references(() => users.id),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    agreedAmountCents: integer("agreed_amount_cents"),
    finalAmountCents: integer("final_amount_cents"),
    // Evita solicitações duplicadas por duplo clique / reenvio de formulário.
    submissionToken: text("submission_token").notNull(),
    // Atribuição de marketing (primeiro toque registrado no navegador).
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("service_requests_client_idx").on(t.clientId),
    index("service_requests_pro_idx").on(t.proId),
    index("service_requests_status_idx").on(t.status),
    uniqueIndex("service_requests_submission_key").on(t.clientId, t.submissionToken),
  ],
);

export const requestPhotos = pgTable(
  "request_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("request_photos_request_idx").on(t.requestId)],
);

/** Profissionais elegíveis convidados para uma solicitação. Controla quem pode vê-la. */
export const requestInvitations = pgTable(
  "request_invitations",
  {
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    proId: uuid("pro_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rank: smallint("rank").notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.proId] }), index("request_invitations_pro_idx").on(t.proId)],
);

/** Linha do tempo da solicitação: cada transição e evento relevante. */
export const requestEvents = pgTable(
  "request_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    fromStatus: requestStatus("from_status"),
    toStatus: requestStatus("to_status"),
    actorId: uuid("actor_id").references(() => users.id),
    actorRole: text("actor_role").notNull(), // client | pro | admin | system
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("request_events_request_idx").on(t.requestId)],
);

export type QuoteSlot = { start: string; end: string };

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    proId: uuid("pro_id")
      .notNull()
      .references(() => users.id),
    kind: quoteKind("kind").notNull(),
    // fixed: preço total do escopo descrito. visit: null (preço final após visita).
    amountCents: integer("amount_cents"),
    // visit: taxa de visita (0 = gratuita). Abatida do valor final se o serviço for contratado.
    visitFeeCents: integer("visit_fee_cents"),
    estimateMinCents: integer("estimate_min_cents"),
    estimateMaxCents: integer("estimate_max_cents"),
    message: text("message").notNull(),
    slots: jsonb("slots").$type<QuoteSlot[]>().notNull(),
    selectedSlot: jsonb("selected_slot").$type<QuoteSlot>(),
    status: quoteStatus("status").notNull().default("pending"),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("quotes_request_pro_key").on(t.requestId, t.proId),
    index("quotes_pro_idx").on(t.proId),
    check(
      "quotes_amounts",
      sql`(${t.kind} = 'fixed' and ${t.amountCents} is not null and ${t.amountCents} > 0)
       or (${t.kind} = 'visit' and ${t.visitFeeCents} is not null and ${t.visitFeeCents} >= 0)`,
    ),
  ],
);

/** Alteração de preço durante o atendimento — exige aprovação do cliente. */
export const priceRevisions = pgTable(
  "price_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    proposedBy: uuid("proposed_by")
      .notNull()
      .references(() => users.id),
    previousAmountCents: integer("previous_amount_cents").notNull(),
    newAmountCents: integer("new_amount_cents").notNull(),
    reason: text("reason").notNull(),
    status: revisionStatus("status").notNull().default("pending"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("price_revisions_one_pending").on(t.requestId).where(sql`${t.status} = 'pending'`),
    check("price_revisions_positive", sql`${t.newAmountCents} > 0`),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("messages_quote_idx").on(t.quoteId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Uma avaliação por solicitação concluída — garante vínculo com serviço real.
    requestId: uuid("request_id")
      .notNull()
      .unique()
      .references(() => serviceRequests.id),
    proId: uuid("pro_id")
      .notNull()
      .references(() => users.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id),
    rating: smallint("rating").notNull(),
    comment: text("comment").notNull().default(""),
    status: reviewStatus("status").notNull().default("published"),
    flagReason: text("flag_reason"),
    moderationNote: text("moderation_note"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("reviews_pro_idx").on(t.proId), check("reviews_rating", sql`${t.rating} between 1 and 5`)],
);

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id),
    provider: text("provider").notNull(), // offline | sandbox | asaas | mercadopago
    amountCents: integer("amount_cents").notNull(),
    status: paymentStatus("status").notNull().default("pending"),
    providerRef: text("provider_ref"),
    // Chave idempotente: impede cobrança/registro duplicado da mesma operação.
    idempotencyKey: text("idempotency_key").notNull().unique(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("payments_request_idx").on(t.requestId)],
);

/** Economia da transação registrada na conclusão (snapshot da comissão vigente). */
export const settlements = pgTable("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .unique()
    .references(() => serviceRequests.id),
  proId: uuid("pro_id")
    .notNull()
    .references(() => users.id),
  grossCents: integer("gross_cents").notNull(),
  commissionBps: integer("commission_bps").notNull(),
  commissionCents: integer("commission_cents").notNull(),
  proNetCents: integer("pro_net_cents").notNull(),
  paymentMode: text("payment_mode").notNull(),
  status: settlementStatus("status").notNull().default("recorded"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason").notNull(),
  status: refundStatus("status").notNull().default("requested"),
  requestedBy: uuid("requested_by").references(() => users.id),
  decidedBy: uuid("decided_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: discountType("discount_type").notNull(),
  value: integer("value").notNull(), // percent: bps; fixed: centavos
  maxRedemptions: integer("max_redemptions"),
  redeemedCount: integer("redeemed_count").notNull().default(0),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
});

export const commercialSettings = pgTable("commercial_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Comunicação e suporte
// ---------------------------------------------------------------------------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

/** Fila de mensagens externas (e-mail; futuramente WhatsApp/SMS/push). */
export const outboundMessages = pgTable("outbound_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  channel: text("channel").notNull(), // email
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: outboundStatus("status").notNull().default("queued"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    openerId: uuid("opener_id")
      .notNull()
      .references(() => users.id),
    requestId: uuid("request_id").references(() => serviceRequests.id),
    reviewId: uuid("review_id").references(() => reviews.id),
    category: ticketCategory("category").notNull(),
    subject: text("subject").notNull(),
    status: ticketStatus("status").notNull().default("open"),
    priority: ticketPriority("priority").notNull().default("normal"),
    assignedTo: uuid("assigned_to").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("support_tickets_opener_idx").on(t.openerId), index("support_tickets_status_idx").on(t.status)],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    // Nota interna da equipe: nunca exibida ao usuário.
    internal: boolean("internal").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId)],
);

// ---------------------------------------------------------------------------
// Operação, segurança e analytics
// ---------------------------------------------------------------------------

/** Registro append-only de ações administrativas e sensíveis. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_entity_idx").on(t.entityType, t.entityId), index("audit_logs_created_idx").on(t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

/** Analytics próprio e mínimo: sem IP, sem dados pessoais em `props`. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    anonId: text("anon_id"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    path: text("path"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    referrerHost: text("referrer_host"),
    props: jsonb("props").$type<Record<string, string | number | boolean>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("analytics_events_name_idx").on(t.name, t.createdAt)],
);

export const dataRequests = pgTable("data_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  kind: dataRequestKind("kind").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: createdAt(),
});
