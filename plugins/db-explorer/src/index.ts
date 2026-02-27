import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import {
  SQLiteDriver,
  PostgreSQLDriver,
  type DatabaseDriver,
  type QueryResult,
} from "./drivers.js";

const server = new McpServer({
  name: "db-explorer",
  version: "1.0.0",
});

// --- Connection state ---

let activeDriver: DatabaseDriver | null = null;
let connectionLabel = "";

// --- Formatting helpers ---

function formatTable(result: QueryResult): string {
  if (result.rows.length === 0) {
    return "(no rows)";
  }

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const col of result.columns) {
    widths[col] = col.length;
  }
  for (const row of result.rows) {
    for (const col of result.columns) {
      const val = String(row[col] ?? "NULL");
      widths[col] = Math.max(widths[col], Math.min(val.length, 40));
    }
  }

  // Header
  const header = result.columns
    .map((c) => c.padEnd(widths[c]))
    .join(" | ");
  const separator = result.columns
    .map((c) => "-".repeat(widths[c]))
    .join("-+-");
  const rows = result.rows.map((row) =>
    result.columns
      .map((c) => {
        const val = String(row[c] ?? "NULL");
        return val.length > 40 ? val.slice(0, 37) + "..." : val.padEnd(widths[c]);
      })
      .join(" | ")
  );

  const parts = [header, separator, ...rows];
  if (result.truncated) {
    parts.push(`\n(truncated — showing ${result.row_count} of more rows)`);
  }
  parts.push(`\n${result.row_count} row(s)`);
  return parts.join("\n");
}

function requireConnection(): DatabaseDriver {
  if (!activeDriver) {
    throw new Error(
      "No database connected. Use db_connect first to connect to a SQLite file or PostgreSQL database."
    );
  }
  return activeDriver;
}

// --- Tool: Connect ---

server.tool(
  "db_connect",
  `Connect to a SQLite file or PostgreSQL database for exploration.

Use when the user wants to explore, query, or inspect a database.
Do NOT use if already connected — use db_disconnect first, or just run queries on the current connection.

Limitations:
- Only one connection active at a time
- SQLite databases are opened in READ-ONLY mode
- PostgreSQL connections use the provided connection string
- All queries through this connection are read-only (SELECT, WITH, EXPLAIN only)

Parameters:
- type (required): "sqlite" or "postgresql"
- connection (required): File path for SQLite, or connection string for PostgreSQL (postgresql://user:pass@host:port/dbname)

Returns: Connection confirmation with database type and basic info.`,
  {
    type: z.enum(["sqlite", "postgresql"]).describe("Database type"),
    connection: z
      .string()
      .describe(
        "SQLite: file path. PostgreSQL: connection string (postgresql://...)"
      ),
  },
  async (args) => {
    // Close existing connection
    if (activeDriver) {
      await activeDriver.close();
      activeDriver = null;
    }

    try {
      if (args.type === "sqlite") {
        // Resolve path
        const filePath = path.resolve(args.connection);
        if (!fs.existsSync(filePath)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: SQLite file not found: ${filePath}`,
              },
            ],
            isError: true,
          };
        }
        activeDriver = new SQLiteDriver(filePath);
        connectionLabel = `SQLite: ${path.basename(filePath)}`;
      } else {
        activeDriver = new PostgreSQLDriver(args.connection);
        // Test connection
        await activeDriver.listTables();
        const urlObj = new URL(args.connection);
        connectionLabel = `PostgreSQL: ${urlObj.pathname.slice(1)}@${urlObj.hostname}`;
      }

      const tables = await activeDriver.listTables();
      const tableCount = tables.filter((t) => t.type === "table").length;
      const viewCount = tables.filter((t) => t.type === "view").length;

      return {
        content: [
          {
            type: "text",
            text: `Connected to ${connectionLabel}\n\nFound ${tableCount} table(s)${viewCount > 0 ? ` and ${viewCount} view(s)` : ""}:\n${tables.map((t) => `  ${t.type === "view" ? "[view] " : ""}${t.name}`).join("\n")}`,
          },
        ],
      };
    } catch (err) {
      activeDriver = null;
      return {
        content: [
          {
            type: "text",
            text: `Connection failed: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Disconnect ---

server.tool(
  "db_disconnect",
  `Disconnect from the current database.

Use when done exploring a database or before connecting to a different one.
Do NOT use if no database is connected.

Limitations:
- Closes the current connection — any pending operations are cancelled

Returns: Disconnection confirmation.`,
  {},
  async () => {
    if (!activeDriver) {
      return {
        content: [{ type: "text", text: "No database connected." }],
      };
    }
    await activeDriver.close();
    const label = connectionLabel;
    activeDriver = null;
    connectionLabel = "";
    return {
      content: [
        { type: "text", text: `Disconnected from ${label}.` },
      ],
    };
  }
);

// --- Tool: List Tables ---

server.tool(
  "db_list_tables",
  `List all tables and views in the connected database.

Use to discover what tables exist before querying or describing them.
Do NOT use without an active connection — use db_connect first.

Limitations:
- For PostgreSQL, only shows tables in the 'public' schema
- SQLite system tables (sqlite_*) are excluded

Returns: List of table and view names with their types.`,
  {},
  async () => {
    try {
      const driver = requireConnection();
      const tables = await driver.listTables();
      if (tables.length === 0) {
        return {
          content: [{ type: "text", text: "No tables found in database." }],
        };
      }
      const formatted = tables
        .map((t) => `${t.type === "view" ? "[view] " : "[table] "}${t.name}`)
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: `${connectionLabel}\n\n${tables.length} object(s):\n${formatted}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Describe Table ---

server.tool(
  "db_describe_table",
  `Show the structure of a specific table — columns, types, constraints, indexes, and foreign keys.

Use to understand a table's schema before writing queries.
Do NOT use for listing all tables — use db_list_tables instead.

Limitations:
- Table must exist in the database
- For PostgreSQL, only inspects the 'public' schema

Parameters:
- table (required): Table name to describe

Returns: Column definitions, indexes, and foreign key relationships.`,
  {
    table: z.string().describe("Table name to describe"),
  },
  async (args) => {
    try {
      const driver = requireConnection();
      const desc = await driver.describeTable(args.table);

      const cols = desc.columns
        .map((c) => {
          const pk = c.primary_key ? " [PK]" : "";
          const nullable = c.nullable ? " NULL" : " NOT NULL";
          const def = c.default_value ? ` DEFAULT ${c.default_value}` : "";
          return `  ${c.name} ${c.type}${pk}${nullable}${def}`;
        })
        .join("\n");

      const idxs =
        desc.indexes.length > 0
          ? "\n\nIndexes:\n" +
            desc.indexes
              .map(
                (i) =>
                  `  ${i.name} (${i.columns.join(", ")})${i.unique ? " UNIQUE" : ""}`
              )
              .join("\n")
          : "";

      const fks =
        desc.foreign_keys.length > 0
          ? "\n\nForeign Keys:\n" +
            desc.foreign_keys
              .map(
                (fk) =>
                  `  ${fk.column} -> ${fk.references_table}(${fk.references_column})`
              )
              .join("\n")
          : "";

      return {
        content: [
          {
            type: "text",
            text: `Table: ${args.table}\n\nColumns:\n${cols}${idxs}${fks}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Query ---

server.tool(
  "db_query",
  `Run a read-only SQL query on the connected database.

Use to query data, aggregate results, or analyze database contents.
Do NOT use for INSERT, UPDATE, DELETE, DROP, or any write operations — this tool is strictly read-only.

Limitations:
- Only SELECT, WITH (CTE), EXPLAIN, and PRAGMA (SQLite) queries allowed
- Results limited to 500 rows maximum (default 100)
- Write operations (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER) are blocked
- Large text values are truncated to 40 characters in display

Parameters:
- sql (required): SQL query to execute (must be a SELECT, WITH, or EXPLAIN statement)
- limit (optional): Maximum rows to return (default: 100, max: 500)

Returns: Formatted table with column headers, data rows, and row count.`,
  {
    sql: z.string().describe("SQL query (SELECT only)"),
    limit: z
      .number()
      .int()
      .positive()
      .max(500)
      .optional()
      .describe("Max rows (default: 100, max: 500)"),
  },
  async (args) => {
    try {
      const driver = requireConnection();
      const result = await driver.query(args.sql, args.limit);
      return {
        content: [{ type: "text", text: formatTable(result) }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Query error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Schema ---

server.tool(
  "db_schema",
  `Dump the full database schema as CREATE TABLE statements.

Use to get a complete overview of the database structure, for documentation or understanding the data model.
Do NOT use for a single table — use db_describe_table instead.

Limitations:
- For SQLite, shows the original CREATE statements from sqlite_master
- For PostgreSQL, reconstructs CREATE TABLE from information_schema
- Large databases may produce very long output

Returns: Complete schema as SQL CREATE TABLE statements.`,
  {},
  async () => {
    try {
      const driver = requireConnection();
      const schema = await driver.getSchema();
      return {
        content: [
          {
            type: "text",
            text: `Database Schema: ${connectionLabel}\n${"=".repeat(40)}\n\n${schema}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Sample ---

server.tool(
  "db_sample",
  `Preview sample rows from a table.

Use to quickly see what kind of data a table contains without writing a full query.
Do NOT use for filtered or aggregated data — use db_query instead.

Limitations:
- Returns first N rows (default 10, max 50)
- No WHERE clause or ordering — shows whatever comes first
- Column values truncated at 40 characters

Parameters:
- table (required): Table name to sample
- rows (optional): Number of rows to return (default: 10, max: 50)

Returns: Formatted table with sample data.`,
  {
    table: z.string().describe("Table name to sample"),
    rows: z
      .number()
      .int()
      .positive()
      .max(50)
      .optional()
      .describe("Number of rows (default: 10, max: 50)"),
  },
  async (args) => {
    try {
      const driver = requireConnection();
      const limit = Math.min(args.rows || 10, 50);
      const result = await driver.query(
        `SELECT * FROM "${args.table}" LIMIT ${limit}`,
        limit
      );
      return {
        content: [
          {
            type: "text",
            text: `Sample from ${args.table}:\n\n${formatTable(result)}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Stats ---

server.tool(
  "db_stats",
  `Show table statistics — row counts and column counts for all tables.

Use to get a quick overview of database size and table dimensions.
Do NOT use for detailed table structure — use db_describe_table instead.

Limitations:
- For PostgreSQL, row counts come from pg_class reltuples (approximate, not exact)
- Only shows tables (not views)

Returns: Table listing with row counts and column counts.`,
  {},
  async () => {
    try {
      const driver = requireConnection();
      const stats = await driver.getStats();

      if (stats.length === 0) {
        return {
          content: [{ type: "text", text: "No tables found." }],
        };
      }

      const totalRows = stats.reduce((s, t) => s + t.row_count, 0);
      const lines = stats.map(
        (s) =>
          `  ${s.table_name}: ${s.row_count.toLocaleString()} rows, ${s.column_count} columns`
      );

      return {
        content: [
          {
            type: "text",
            text: `Database Statistics: ${connectionLabel}\n\n${stats.length} table(s), ${totalRows.toLocaleString()} total rows:\n\n${lines.join("\n")}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Relationships ---

server.tool(
  "db_relationships",
  `Show foreign key relationships between tables.

Use to understand how tables are connected, for writing JOINs or understanding the data model.
Do NOT use for column details — use db_describe_table instead.

Limitations:
- Only shows explicitly defined foreign key constraints
- Implicit relationships (without FK constraints) are not detected
- For PostgreSQL, only shows relationships in the 'public' schema

Returns: List of foreign key relationships showing which columns reference which tables.`,
  {},
  async () => {
    try {
      const driver = requireConnection();
      const rels = await driver.getRelationships();

      if (rels.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No foreign key relationships found. Tables may use implicit relationships not defined as constraints.",
            },
          ],
        };
      }

      const lines = rels.map(
        (r) =>
          `  ${r.from_table}.${r.from_column} -> ${r.to_table}.${r.to_column}`
      );

      // Build a simple text ERD
      const tables = new Set<string>();
      for (const r of rels) {
        tables.add(r.from_table);
        tables.add(r.to_table);
      }

      return {
        content: [
          {
            type: "text",
            text: `Foreign Key Relationships (${rels.length}):\n\n${lines.join("\n")}\n\nTables involved: ${[...tables].sort().join(", ")}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Export CSV ---

server.tool(
  "db_export_csv",
  `Export query results to a CSV file.

Use when the user wants to save query output for spreadsheet analysis or data processing.
Do NOT use for quick data viewing — use db_query or db_sample instead.

Limitations:
- Only SELECT queries allowed (same read-only restriction as db_query)
- Maximum 10,000 rows per export
- Output directory must exist (defaults to current working directory)

Parameters:
- sql (required): SQL query to execute and export
- file_path (required): Path for the output CSV file
- limit (optional): Maximum rows to export (default: 1000, max: 10000)

Returns: Confirmation with row count and file path.`,
  {
    sql: z.string().describe("SQL query to export"),
    file_path: z.string().describe("Output CSV file path"),
    limit: z
      .number()
      .int()
      .positive()
      .max(10000)
      .optional()
      .describe("Max rows (default: 1000, max: 10000)"),
  },
  async (args) => {
    try {
      const driver = requireConnection();
      const maxRows = Math.min(args.limit || 1000, 10000);
      const result = await driver.query(args.sql, maxRows);

      // Build CSV
      const escape = (val: unknown): string => {
        const str = val === null || val === undefined ? "" : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const header = result.columns.map(escape).join(",");
      const rows = result.rows.map((row) =>
        result.columns.map((col) => escape(row[col])).join(",")
      );
      const csv = [header, ...rows].join("\n") + "\n";

      const filePath = path.resolve(args.file_path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, csv, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `Exported ${result.rows.length} row(s) to ${filePath}\nColumns: ${result.columns.join(", ")}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Export error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Database Explorer MCP server running on stdio");
}

main().catch(console.error);
