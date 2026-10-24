import "server-only";
import { sql } from "drizzle-orm";
import type { DbOrTx } from "../db/client";

/**
 * Seleção de profissionais elegíveis para uma solicitação.
 *
 * Elegível = conta ativa + verificação aprovada + atende a categoria + atende
 * a região. Ordenação (transparente e documentada em docs/PRODUCT.md):
 *  1. Para urgência "hoje", quem aceita urgências vem primeiro.
 *  2. Menos ausências registradas.
 *  3. Nota bayesiana (média 4,0 com peso 3) — evita que 1 avaliação 5★ domine.
 *  4. Rodízio: quem foi convidado há mais tempo (ou nunca) vem antes.
 */
export async function findEligiblePros(
  conn: DbOrTx,
  params: { categoryId: string; regionId: string; urgency: "today" | "this_week" | "flexible"; limit: number },
): Promise<string[]> {
  const rows = await conn.execute<{ id: string }>(sql`
    select u.id
    from users u
    join pro_profiles p on p.user_id = u.id
    join pro_categories pc on pc.pro_id = u.id and pc.category_id = ${params.categoryId}
    join pro_regions pr on pr.pro_id = u.id and pr.region_id = ${params.regionId}
    left join lateral (
      select count(*)::int as n, coalesce(sum(r.rating), 0)::int as total
      from reviews r where r.pro_id = u.id and r.status = 'published'
    ) rv on true
    left join lateral (
      select max(i.created_at) as last_invited from request_invitations i where i.pro_id = u.id
    ) li on true
    where u.status = 'active' and p.verification_status = 'approved'
    order by
      (${params.urgency} = 'today' and p.accepts_urgent) desc,
      p.no_show_count asc,
      ((rv.total + 4.0 * 3) / (rv.n + 3)) desc,
      li.last_invited asc nulls first,
      u.created_at asc
    limit ${params.limit}
  `);
  return rows.map((r) => r.id);
}

export type ProStats = { ratingAvg: number | null; ratingCount: number; completedJobs: number };

export async function statsForPros(conn: DbOrTx, proIds: string[]): Promise<Map<string, ProStats>> {
  const out = new Map<string, ProStats>();
  if (!proIds.length) return out;
  const rows = await conn.execute<{ pro_id: string; rating_avg: string | null; rating_count: number; completed: number }>(sql`
    select p.user_id as pro_id,
      (select avg(r.rating)::numeric(3,2) from reviews r where r.pro_id = p.user_id and r.status = 'published') as rating_avg,
      (select count(*)::int from reviews r where r.pro_id = p.user_id and r.status = 'published') as rating_count,
      (select count(*)::int from service_requests s where s.pro_id = p.user_id and s.status = 'completed') as completed
    from pro_profiles p
    where p.user_id in (${sql.join(
      proIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
  `);
  for (const r of rows)
    out.set(r.pro_id, {
      ratingAvg: r.rating_avg === null ? null : Number(r.rating_avg),
      ratingCount: r.rating_count,
      completedJobs: r.completed,
    });
  return out;
}
