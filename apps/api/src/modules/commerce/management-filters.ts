import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { parse } from '../auth/auth.contracts';

const schema = z
  .object({
    search: z.string().trim().max(100).optional(),
    status: z
      .string()
      .regex(/^[a-z_]{1,32}$/)
      .optional(),
    kind: z
      .enum(['class', 'course', 'court', 'access', 'membership', 'program'])
      .optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .superRefine((v, ctx) => {
    if (
      v.from &&
      v.to &&
      (v.to < v.from || Date.parse(v.to) - Date.parse(v.from) > 730 * 86400000)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Analytics.invalidRange',
        path: ['to'],
      });
  });
export type ManagementFilters = z.infer<typeof schema>;
export function managementFilters(query: unknown) {
  return parse(schema, query);
}
export function managementWhere(
  f: ManagementFilters | undefined,
  date: SQL,
  status: SQL,
  search: SQL[],
  kind?: SQL,
) {
  if (!f) return sql`true`;
  const needle = `%${(f.search ?? '').replace(/[\\%_]/g, '\\$&')}%`;
  return sql`${f.from ? sql`${date}>=${`${f.from}T00:00:00+03:30`}::timestamptz` : sql`true`}
    AND ${f.to ? sql`${date}<(${`${f.to}T00:00:00+03:30`}::timestamptz+interval '1 day')` : sql`true`}
    AND ${f.status ? sql`${status}=${f.status}` : sql`true`}
    AND ${
      f.search && search.length
        ? sql`(${sql.join(
            search.map((column) => sql`${column} ILIKE ${needle}`),
            sql` OR `,
          )})`
        : sql`true`
    }
    AND ${f.kind && kind ? sql`${kind}=${f.kind}` : sql`true`}`;
}
export function managementPage(f?: ManagementFilters) {
  return sql`LIMIT ${f?.page ? 25 : 100} OFFSET ${((f?.page ?? 1) - 1) * 25}`;
}
export function managementDirection(f?: ManagementFilters) {
  return f?.sort === 'oldest' ? sql`ASC` : sql`DESC`;
}
