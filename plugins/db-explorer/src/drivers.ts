import Database, { type Database as DatabaseType } from "better-sqlite3";
import pg from "pg";

// --- Database driver abstraction ---

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default_value: string | null;
  primary_key: boolean;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  references_table: string;
  references_column: string;
}

export interface TableStats {
  table_name: string;
  row_count: number;
  column_count: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  truncated: boolean;
}

export interface DatabaseDriver {
  type: "sqlite" | "postgresql";
  listTables(): Promise<{ name: string; type: string }[]>;
  describeTable(table: string): Promise<{
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    foreign_keys: ForeignKeyInfo[];
  }>;
  query(sql: string, limit?: number): Promise<QueryResult>;
  getSchema(): Promise<string>;
  getStats(): Promise<TableStats[]>;
  getRelationships(): Promise<
    { from_table: string; from_column: string; to_table: string; to_column: string }[]
  >;
  close(): Promise<void>;
}

// --- SQLite Driver ---

export class SQLiteDriver implements DatabaseDriver {
  type = "sqlite" as const;
  private db: DatabaseType;
  private path: string;

  constructor(filePath: string) {
    this.path = filePath;
    this.db = new Database(filePath, { readonly: true, fileMustExist: true });
  }

  async listTables(): Promise<{ name: string; type: string }[]> {
    const rows = this.db
      .prepare(
        `SELECT name, type FROM sqlite_master
         WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
         ORDER BY type, name`
      )
      .all() as { name: string; type: string }[];
    return rows;
  }

  async describeTable(table: string): Promise<{
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    foreign_keys: ForeignKeyInfo[];
  }> {
    const columns = this.db
      .prepare(`PRAGMA table_info("${table}")`)
      .all() as {
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];

    const indexList = this.db
      .prepare(`PRAGMA index_list("${table}")`)
      .all() as { name: string; unique: number }[];

    const indexes: IndexInfo[] = indexList.map((idx) => {
      const cols = this.db
        .prepare(`PRAGMA index_info("${idx.name}")`)
        .all() as { name: string }[];
      return {
        name: idx.name,
        columns: cols.map((c) => c.name),
        unique: idx.unique === 1,
      };
    });

    const fks = this.db
      .prepare(`PRAGMA foreign_key_list("${table}")`)
      .all() as { from: string; table: string; to: string }[];

    return {
      columns: columns.map((c) => ({
        name: c.name,
        type: c.type || "ANY",
        nullable: c.notnull === 0,
        default_value: c.dflt_value,
        primary_key: c.pk > 0,
      })),
      indexes,
      foreign_keys: fks.map((fk) => ({
        column: fk.from,
        references_table: fk.table,
        references_column: fk.to,
      })),
    };
  }

  async query(sql: string, limit = 100): Promise<QueryResult> {
    // Safety: wrap in a read-only check
    const trimmed = sql.trim().toLowerCase();
    if (
      !trimmed.startsWith("select") &&
      !trimmed.startsWith("with") &&
      !trimmed.startsWith("explain") &&
      !trimmed.startsWith("pragma")
    ) {
      throw new Error(
        "Only SELECT, WITH (CTE), EXPLAIN, and PRAGMA queries are allowed. This tool is read-only."
      );
    }

    const maxRows = Math.min(limit, 500);
    // Add LIMIT if not already present
    const hasLimit = /\blimit\s+\d+/i.test(sql);
    const wrappedSql = hasLimit ? sql : `${sql} LIMIT ${maxRows}`;

    const stmt = this.db.prepare(wrappedSql);
    const rows = stmt.all() as Record<string, unknown>[];
    const columns =
      rows.length > 0 ? Object.keys(rows[0]) : stmt.columns().map((c) => c.name);

    return {
      columns,
      rows: rows.slice(0, maxRows),
      row_count: rows.length,
      truncated: rows.length >= maxRows && !hasLimit,
    };
  }

  async getSchema(): Promise<string> {
    const rows = this.db
      .prepare(
        `SELECT sql FROM sqlite_master
         WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
         ORDER BY type DESC, name`
      )
      .all() as { sql: string }[];
    return rows.map((r) => r.sql + ";").join("\n\n");
  }

  async getStats(): Promise<TableStats[]> {
    const tables = await this.listTables();
    return tables
      .filter((t) => t.type === "table")
      .map((t) => {
        const countRow = this.db
          .prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`)
          .get() as { cnt: number };
        const cols = this.db
          .prepare(`PRAGMA table_info("${t.name}")`)
          .all() as unknown[];
        return {
          table_name: t.name,
          row_count: countRow.cnt,
          column_count: cols.length,
        };
      });
  }

  async getRelationships(): Promise<
    { from_table: string; from_column: string; to_table: string; to_column: string }[]
  > {
    const tables = await this.listTables();
    const rels: {
      from_table: string;
      from_column: string;
      to_table: string;
      to_column: string;
    }[] = [];

    for (const t of tables.filter((t) => t.type === "table")) {
      const fks = this.db
        .prepare(`PRAGMA foreign_key_list("${t.name}")`)
        .all() as { from: string; table: string; to: string }[];
      for (const fk of fks) {
        rels.push({
          from_table: t.name,
          from_column: fk.from,
          to_table: fk.table,
          to_column: fk.to,
        });
      }
    }
    return rels;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

// --- PostgreSQL Driver ---

export class PostgreSQLDriver implements DatabaseDriver {
  type = "postgresql" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 3 });
  }

  async listTables(): Promise<{ name: string; type: string }[]> {
    const res = await this.pool.query(`
      SELECT table_name as name,
             CASE table_type
               WHEN 'BASE TABLE' THEN 'table'
               WHEN 'VIEW' THEN 'view'
               ELSE table_type
             END as type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_type, table_name
    `);
    return res.rows;
  }

  async describeTable(table: string): Promise<{
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    foreign_keys: ForeignKeyInfo[];
  }> {
    // Columns
    const colRes = await this.pool.query(
      `SELECT
        c.column_name as name,
        c.data_type as type,
        c.is_nullable = 'YES' as nullable,
        c.column_default as default_value,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = $1 AND c.table_schema = 'public'
      ORDER BY c.ordinal_position`,
      [table]
    );

    // Indexes
    const idxRes = await this.pool.query(
      `SELECT
        i.relname as name,
        array_agg(a.attname ORDER BY k.n) as columns,
        ix.indisunique as unique
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace ns ON ns.oid = t.relnamespace
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE t.relname = $1 AND ns.nspname = 'public'
      GROUP BY i.relname, ix.indisunique`,
      [table]
    );

    // Foreign keys
    const fkRes = await this.pool.query(
      `SELECT
        kcu.column_name as "column",
        ccu.table_name as references_table,
        ccu.column_name as references_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'`,
      [table]
    );

    return {
      columns: colRes.rows,
      indexes: idxRes.rows.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        columns: r.columns as string[],
        unique: r.unique as boolean,
      })),
      foreign_keys: fkRes.rows,
    };
  }

  async query(sql: string, limit = 100): Promise<QueryResult> {
    const trimmed = sql.trim().toLowerCase();
    if (
      !trimmed.startsWith("select") &&
      !trimmed.startsWith("with") &&
      !trimmed.startsWith("explain")
    ) {
      throw new Error(
        "Only SELECT, WITH (CTE), and EXPLAIN queries are allowed. This tool is read-only."
      );
    }

    const maxRows = Math.min(limit, 500);
    const hasLimit = /\blimit\s+\d+/i.test(sql);
    const wrappedSql = hasLimit ? sql : `${sql} LIMIT ${maxRows}`;

    const res = await this.pool.query(wrappedSql);
    const columns = res.fields.map((f) => f.name);

    return {
      columns,
      rows: res.rows.slice(0, maxRows),
      row_count: res.rowCount ?? res.rows.length,
      truncated: res.rows.length >= maxRows && !hasLimit,
    };
  }

  async getSchema(): Promise<string> {
    const tables = await this.listTables();
    const parts: string[] = [];

    for (const t of tables) {
      const desc = await this.describeTable(t.name);
      const cols = desc.columns
        .map((c) => {
          const pk = c.primary_key ? " PRIMARY KEY" : "";
          const nullable = c.nullable ? "" : " NOT NULL";
          const def = c.default_value ? ` DEFAULT ${c.default_value}` : "";
          return `  ${c.name} ${c.type}${pk}${nullable}${def}`;
        })
        .join(",\n");

      const fks = desc.foreign_keys
        .map(
          (fk) =>
            `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.references_table}(${fk.references_column})`
        )
        .join(",\n");

      const create = `CREATE TABLE ${t.name} (\n${cols}${fks ? ",\n" + fks : ""}\n);`;
      parts.push(create);
    }

    return parts.join("\n\n");
  }

  async getStats(): Promise<TableStats[]> {
    const res = await this.pool.query(`
      SELECT
        t.table_name,
        (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as row_count,
        COUNT(c.column_name)::int as column_count
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `);
    return res.rows.map((r: Record<string, unknown>) => ({
      table_name: r.table_name as string,
      row_count: Number(r.row_count) || 0,
      column_count: r.column_count as number,
    }));
  }

  async getRelationships(): Promise<
    { from_table: string; from_column: string; to_table: string; to_column: string }[]
  > {
    const res = await this.pool.query(`
      SELECT
        tc.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_name as to_table,
        ccu.column_name as to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);
    return res.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
