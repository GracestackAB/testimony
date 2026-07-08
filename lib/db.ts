/**
 * Azure PostgreSQL client with Supabase-compatible query builder.
 * Used when DATABASE_URL is set; falls back to Supabase REST otherwise.
 */
import { Pool, type PoolClient, type QueryResultRow } from "pg";

export interface DbResult<T = QueryResultRow> {
  data: T | T[] | null;
  error: { message: string } | null;
  count?: number | null;
}

type Filter =
  | { kind: "eq"; col: string; val: unknown }
  | { kind: "neq"; col: string; val: unknown }
  | { kind: "gte"; col: string; val: unknown }
  | { kind: "lte"; col: string; val: unknown }
  | { kind: "lt"; col: string; val: unknown }
  | { kind: "ilike"; col: string; val: unknown }
  | { kind: "in"; col: string; val: unknown[] }
  | { kind: "is"; col: string; val: null }
  | { kind: "not"; col: string; op: string; val: unknown }
  | { kind: "contains"; col: string; val: string }
  | { kind: "or"; expr: string };

type OrderSpec = { col: string; ascending: boolean; nullsFirst?: boolean };

let _pool: Pool | null = null;

/** Shared connection pool (server-side only). */
export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  if (!_pool) {
    _pool = new Pool({
      connectionString: url,
      ssl: url.includes("azure.com") ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  return _pool;
}

function qid(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function tableRef(schema: string, table: string): string {
  return `${qid(schema)}.${qid(table)}`;
}

function parseOrExpr(expr: string): string {
  // PostgREST-style: "col.op.val,col2.op.val2"
  return expr
    .split(",")
    .map((part) => {
      const m = /^([^.]+)\.(eq|neq|gte|lte|lt|ilike|is|cs)\.(.+)$/.exec(part.trim());
      if (!m) return "TRUE";
      const [, col, op, raw] = m;
      const c = qid(col);
      if (op === "eq") return `${c} = ${param(raw)}`;
      if (op === "ilike") return `${c} ILIKE ${param(decodeURIComponent(raw))}`;
      if (op === "cs") return `${c} @> ARRAY[${param(raw.replace(/^\{|\}$/g, ""))}]::text[]`;
      if (op === "is" && raw === "null") return `${c} IS NULL`;
      return "TRUE";
    })
    .join(" OR ");
}

const paramValues: unknown[] = [];
function param(val: unknown): string {
  paramValues.push(val);
  return `$${paramValues.length}`;
}

function resetParams(): unknown[] {
  paramValues.length = 0;
  return paramValues;
}

function buildWhere(filters: Filter[]): { sql: string; params: unknown[] } {
  const params = resetParams();
  const parts: string[] = [];

  for (const f of filters) {
    switch (f.kind) {
      case "eq":
        parts.push(`${qid(f.col)} = ${param(f.val)}`);
        break;
      case "neq":
        parts.push(`${qid(f.col)} <> ${param(f.val)}`);
        break;
      case "gte":
        parts.push(`${qid(f.col)} >= ${param(f.val)}`);
        break;
      case "lte":
        parts.push(`${qid(f.col)} <= ${param(f.val)}`);
        break;
      case "lt":
        parts.push(`${qid(f.col)} < ${param(f.val)}`);
        break;
      case "ilike":
        parts.push(`${qid(f.col)} ILIKE ${param(f.val)}`);
        break;
      case "in":
        parts.push(`${qid(f.col)} = ANY(${param(f.val)})`);
        break;
      case "is":
        parts.push(`${qid(f.col)} IS NULL`);
        break;
      case "not":
        if (f.op === "is" && f.val === null) parts.push(`${qid(f.col)} IS NOT NULL`);
        else parts.push(`${qid(f.col)} IS NOT ${param(f.val)}`);
        break;
      case "contains":
        parts.push(`${qid(f.col)} @> ARRAY[${param(f.val)}]::text[]`);
        break;
      case "or":
        parts.push(`(${parseOrExpr(f.expr)})`);
        break;
    }
  }

  return { sql: parts.length ? ` WHERE ${parts.join(" AND ")}` : "", params };
}

class QueryBuilder implements PromiseLike<DbResult> {
  private schema: string;
  private tableName: string;
  private columns = "*";
  private filters: Filter[] = [];
  private orders: OrderSpec[] = [];
  private limitN?: number;
  private offsetN?: number;
  private countExact = false;
  private headOnly = false;
  private returnMode: "many" | "single" | "maybeSingle" = "many";
  private mutation: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private mutationData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private upsertConflict?: string;
  private returning = false;

  constructor(schema: string, table?: string) {
    this.schema = schema;
    this.tableName = table ?? "";
  }

  from(table: string): this {
    this.tableName = table;
    return this;
  }

  select(cols = "*", opts?: { count?: "exact"; head?: boolean }): this {
    this.columns = cols;
    if (this.mutation !== "select") this.returning = true;
    if (opts?.count === "exact") this.countExact = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ kind: "eq", col, val });
    return this;
  }

  neq(col: string, val: unknown): this {
    this.filters.push({ kind: "neq", col, val });
    return this;
  }

  gte(col: string, val: unknown): this {
    this.filters.push({ kind: "gte", col, val });
    return this;
  }

  lte(col: string, val: unknown): this {
    this.filters.push({ kind: "lte", col, val });
    return this;
  }

  lt(col: string, val: unknown): this {
    this.filters.push({ kind: "lt", col, val });
    return this;
  }

  ilike(col: string, val: unknown): this {
    this.filters.push({ kind: "ilike", col, val });
    return this;
  }

  in(col: string, val: unknown[]): this {
    this.filters.push({ kind: "in", col, val });
    return this;
  }

  is(col: string, val: null): this {
    this.filters.push({ kind: "is", col, val });
    return this;
  }

  not(col: string, op: string, val: unknown): this {
    this.filters.push({ kind: "not", col, op, val });
    return this;
  }

  or(expr: string): this {
    this.filters.push({ kind: "or", expr });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orders.push({
      col,
      ascending: opts?.ascending ?? true,
      nullsFirst: opts?.nullsFirst,
    });
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetN = from;
    this.limitN = to - from + 1;
    return this;
  }

  single(): this {
    this.returnMode = "single";
    this.limitN = 1;
    return this;
  }

  maybeSingle(): this {
    this.returnMode = "maybeSingle";
    this.limitN = 1;
    return this;
  }

  insert(row: Record<string, unknown> | Record<string, unknown>[]): this {
    this.mutation = "insert";
    this.mutationData = row;
    return this;
  }

  update(row: Record<string, unknown>): this {
    this.mutation = "update";
    this.mutationData = row;
    return this;
  }

  upsert(row: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }): this {
    this.mutation = "upsert";
    this.mutationData = row;
    this.upsertConflict = opts?.onConflict;
    return this;
  }

  delete(): this {
    this.mutation = "delete";
    return this;
  }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<DbResult> {
    try {
      const pool = getPool();
      const ref = tableRef(this.schema, this.tableName);

      if (this.mutation === "insert" || this.mutation === "upsert") {
        const rows = Array.isArray(this.mutationData) ? this.mutationData : [this.mutationData!];
        const keys = Object.keys(rows[0]);
        const params = resetParams();
        const valueRows = rows.map((r) => `(${keys.map((k) => param(r[k])).join(", ")})`).join(", ");
        let sql = `INSERT INTO ${ref} (${keys.map(qid).join(", ")}) VALUES ${valueRows}`;

        if (this.mutation === "upsert" && this.upsertConflict) {
          const conflictCols = this.upsertConflict.split(",").map((c) => c.trim());
          const conflictRef = conflictCols.map(qid).join(", ");
          const updates = keys
            .filter((k) => !conflictCols.includes(k))
            .map((k) => `${qid(k)} = EXCLUDED.${qid(k)}`)
            .join(", ");
          sql += ` ON CONFLICT (${conflictRef}) DO UPDATE SET ${updates}`;
        }

        if (this.returning || this.columns !== "*") {
          sql += ` RETURNING ${this.columns === "*" ? "*" : this.columns}`;
        }

        const res = await pool.query(sql, params);
        return this.formatResult(res.rows, res.rowCount);
      }

      if (this.mutation === "update") {
        const params = resetParams();
        const sets = Object.entries(this.mutationData!).map(([k, v]) => `${qid(k)} = ${param(v)}`);
        const whereParts: string[] = [];
        for (const f of this.filters) {
          switch (f.kind) {
            case "eq":
              whereParts.push(`${qid(f.col)} = ${param(f.val)}`);
              break;
            case "neq":
              whereParts.push(`${qid(f.col)} <> ${param(f.val)}`);
              break;
            default:
              break;
          }
        }
        const where = whereParts.length ? ` WHERE ${whereParts.join(" AND ")}` : "";
        let sql = `UPDATE ${ref} SET ${sets.join(", ")}${where}`;
        if (this.returning) sql += ` RETURNING ${this.columns === "*" ? "*" : this.columns}`;
        const res = await pool.query(sql, params);
        return this.formatResult(res.rows, res.rowCount);
      }

      if (this.mutation === "delete") {
        const { sql: where, params } = buildWhere(this.filters);
        const sql = `DELETE FROM ${ref}${where}`;
        const res = await pool.query(sql, params);
        return { data: null, error: null, count: res.rowCount };
      }

      // SELECT
      const { sql: where, params } = buildWhere(this.filters);
      let count: number | null = null;

      if (this.countExact) {
        const cRes = await pool.query(`SELECT COUNT(*)::int AS c FROM ${ref}${where}`, params);
        count = cRes.rows[0]?.c ?? 0;
      }

      if (this.headOnly) return { data: null, error: null, count };

      let sql = `SELECT ${this.columns} FROM ${ref}${where}`;
      if (this.orders.length) {
        sql += ` ORDER BY ${this.orders
          .map((o) => {
            const dir = o.ascending ? "ASC" : "DESC";
            const nulls =
              o.nullsFirst === false ? " NULLS LAST" : o.nullsFirst ? " NULLS FIRST" : "";
            return `${qid(o.col)} ${dir}${nulls}`;
          })
          .join(", ")}`;
      }
      if (this.limitN != null) sql += ` LIMIT ${this.limitN}`;
      if (this.offsetN != null) sql += ` OFFSET ${this.offsetN}`;

      const res = await pool.query(sql, params);
      return this.formatResult(res.rows, count ?? res.rowCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { data: null, error: { message: msg }, count: null };
    }
  }

  private formatResult(rows: QueryResultRow[], count: number | null): DbResult {
    if (this.returnMode === "single") {
      if (!rows.length) return { data: null, error: { message: "No rows" }, count };
      return { data: rows[0], error: null, count };
    }
    if (this.returnMode === "maybeSingle") {
      return { data: rows[0] ?? null, error: null, count };
    }
    return { data: rows, error: null, count };
  }
}

/** Supabase-kompatibel klient mot ett schema. */
export function createDbClient(schema: string) {
  return {
    from(table: string) {
      return new QueryBuilder(schema, table);
    },
  };
}

/** Kör rå SQL (migrationer/scripts). */
export async function runSql(sql: string, client?: PoolClient): Promise<void> {
  if (client) {
    await client.query(sql);
    return;
  }
  await getPool().query(sql);
}
