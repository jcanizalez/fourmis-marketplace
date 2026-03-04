---
description: When the user asks about API pagination, cursor pagination, offset pagination, filtering, sorting, field selection, search, Relay connections, or listing resources
---

# Pagination & Filtering Patterns

Implement efficient, scalable pagination and filtering for API collections. Covers cursor vs offset pagination, Relay-style connections, filtering operators, sorting, and field selection.

## Pagination Strategies Comparison

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| **Offset** | Simple, page numbers | Slow on large tables, inconsistent on inserts | Small datasets, admin UIs |
| **Cursor** | Fast, consistent | No random page access | Feeds, infinite scroll |
| **Keyset** | Fastest (index scan) | Requires unique sort key | Massive datasets |

## Offset Pagination

```
GET /api/v1/users?page=2&perPage=20
```

### Node.js Implementation

```typescript
// types
interface PaginationParams {
  page: number;
  perPage: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Parse and validate pagination params
function parsePagination(query: Record<string, string>): PaginationParams {
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage || "20", 10)));
  return { page, perPage };
}

// Route handler
router.get("/users", async (req, res) => {
  const { page, perPage } = parsePagination(req.query);
  const offset = (page - 1) * perPage;

  const [users, total] = await Promise.all([
    db.query("SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2", [perPage, offset]),
    db.query("SELECT COUNT(*) FROM users"),
  ]);

  const totalPages = Math.ceil(total / perPage);

  res.json({
    data: users,
    meta: {
      total,
      page,
      perPage,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});
```

### Response

```json
{
  "data": [
    { "id": "usr_001", "name": "Alice" },
    { "id": "usr_002", "name": "Bob" }
  ],
  "meta": {
    "total": 150,
    "page": 2,
    "perPage": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

## Cursor Pagination (Recommended for APIs)

```
GET /api/v1/orders?limit=20
GET /api/v1/orders?limit=20&cursor=eyJpZCI6MTIzfQ
```

### Node.js Implementation

```typescript
interface CursorPaginationParams {
  limit: number;
  cursor?: string;
  direction: "forward" | "backward";
}

interface CursorPaginatedResponse<T> {
  data: T[];
  meta: {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

// Encode/decode cursor (base64 JSON)
function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeCursor(cursor: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
}

// Route handler
router.get("/orders", async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
  const cursor = req.query.cursor as string | undefined;

  let whereClause = "";
  const params: unknown[] = [limit + 1]; // Fetch one extra to check hasNextPage

  if (cursor) {
    const { id, createdAt } = decodeCursor(cursor);
    whereClause = "WHERE (created_at, id) < ($2, $3)";
    params.push(createdAt, id);
  }

  const rows = await db.query(
    `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC, id DESC LIMIT $1`,
    params
  );

  const hasNextPage = rows.length > limit;
  const data = rows.slice(0, limit);

  res.json({
    data,
    meta: {
      hasNextPage,
      hasPrevPage: !!cursor,
      startCursor: data.length > 0
        ? encodeCursor({ id: data[0].id, createdAt: data[0].createdAt })
        : null,
      endCursor: data.length > 0
        ? encodeCursor({ id: data[data.length - 1].id, createdAt: data[data.length - 1].createdAt })
        : null,
    },
  });
});
```

### Response

```json
{
  "data": [
    { "id": "ord_456", "total": 99.99, "createdAt": "2026-03-03T12:00:00Z" },
    { "id": "ord_455", "total": 49.99, "createdAt": "2026-03-03T11:30:00Z" }
  ],
  "meta": {
    "hasNextPage": true,
    "hasPrevPage": true,
    "startCursor": "eyJpZCI6Im9yZF80NTYiLCJjcmVhdGVkQXQiOiIyMDI2LTAzLTAzVDEyOjAwOjAwWiJ9",
    "endCursor": "eyJpZCI6Im9yZF80NTUiLCJjcmVhdGVkQXQiOiIyMDI2LTAzLTAzVDExOjMwOjAwWiJ9"
  }
}
```

## Go — Cursor Pagination

```go
type CursorPage[T any] struct {
    Data []T        `json:"data"`
    Meta CursorMeta `json:"meta"`
}

type CursorMeta struct {
    HasNextPage bool    `json:"hasNextPage"`
    HasPrevPage bool    `json:"hasPrevPage"`
    StartCursor *string `json:"startCursor"`
    EndCursor   *string `json:"endCursor"`
}

func encodeCursor(id string, createdAt time.Time) string {
    data, _ := json.Marshal(map[string]any{"id": id, "t": createdAt.UnixMilli()})
    return base64.RawURLEncoding.EncodeToString(data)
}

func decodeCursor(cursor string) (string, time.Time, error) {
    data, err := base64.RawURLEncoding.DecodeString(cursor)
    if err != nil {
        return "", time.Time{}, err
    }
    var m map[string]any
    if err := json.Unmarshal(data, &m); err != nil {
        return "", time.Time{}, err
    }
    id := m["id"].(string)
    ts := time.UnixMilli(int64(m["t"].(float64)))
    return id, ts, nil
}

func ListOrders(w http.ResponseWriter, r *http.Request) {
    limit := min(100, max(1, parseIntOr(r.URL.Query().Get("limit"), 20)))
    cursor := r.URL.Query().Get("cursor")

    query := "SELECT * FROM orders"
    args := []any{limit + 1}

    if cursor != "" {
        id, ts, err := decodeCursor(cursor)
        if err != nil {
            writeError(w, apierr.BadRequest("Invalid cursor"))
            return
        }
        query += " WHERE (created_at, id) < ($2, $3)"
        args = append(args, ts, id)
    }

    query += " ORDER BY created_at DESC, id DESC LIMIT $1"

    rows, err := db.QueryContext(r.Context(), query, args...)
    // ... scan rows, build response with CursorPage
}
```

## Filtering

```
GET /api/v1/products?status=active&category=electronics&minPrice=10&maxPrice=100
GET /api/v1/orders?status=pending,processing&createdAfter=2026-01-01
```

### Filter Implementation

```typescript
interface FilterConfig {
  allowedFields: Set<string>;
  fieldTypes: Record<string, "string" | "number" | "date" | "boolean" | "enum">;
  enumValues?: Record<string, string[]>;
}

function buildWhereClause(
  query: Record<string, string>,
  config: FilterConfig
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(query)) {
    // Skip pagination params
    if (["page", "perPage", "limit", "cursor", "sort", "fields"].includes(key)) continue;

    // Handle range filters (minPrice, maxPrice, createdAfter, createdBefore)
    const rangeMatch = key.match(/^(min|max|before|after)(.+)$/i);
    if (rangeMatch) {
      const [, prefix, fieldRaw] = rangeMatch;
      const field = fieldRaw.charAt(0).toLowerCase() + fieldRaw.slice(1);
      if (!config.allowedFields.has(field)) continue;

      const snakeField = camelToSnake(field);
      const op = prefix === "min" || prefix === "after" ? ">=" : "<=";
      conditions.push(`${snakeField} ${op} $${paramIndex}`);
      params.push(coerceValue(value, config.fieldTypes[field]));
      paramIndex++;
      continue;
    }

    // Direct field match
    if (!config.allowedFields.has(key)) continue;
    const snakeKey = camelToSnake(key);

    // Comma-separated = IN clause
    if (value.includes(",")) {
      const values = value.split(",").map((v) => v.trim());
      const placeholders = values.map((_, i) => `$${paramIndex + i}`).join(", ");
      conditions.push(`${snakeKey} IN (${placeholders})`);
      params.push(...values);
      paramIndex += values.length;
    } else {
      conditions.push(`${snakeKey} = $${paramIndex}`);
      params.push(coerceValue(value, config.fieldTypes[key]));
      paramIndex++;
    }
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}
```

## Sorting

```
GET /api/v1/products?sort=price           → ascending by price
GET /api/v1/products?sort=-price          → descending by price
GET /api/v1/products?sort=-createdAt,name → descending date, then ascending name
```

### Implementation

```typescript
function buildOrderClause(
  sortParam: string | undefined,
  allowedFields: Set<string>,
  defaultSort = "-createdAt"
): string {
  const sort = sortParam || defaultSort;
  const parts = sort.split(",").map((s) => s.trim());

  const orderClauses = parts
    .map((part) => {
      const desc = part.startsWith("-");
      const field = desc ? part.slice(1) : part;

      if (!allowedFields.has(field)) return null;

      const snakeField = camelToSnake(field);
      return `${snakeField} ${desc ? "DESC" : "ASC"}`;
    })
    .filter(Boolean);

  return orderClauses.length > 0 ? `ORDER BY ${orderClauses.join(", ")}` : "ORDER BY created_at DESC";
}
```

## Field Selection (Sparse Fieldsets)

```
GET /api/v1/users?fields=id,name,email
GET /api/v1/users?fields=id,name&include=orders
```

### Implementation

```typescript
function buildSelectClause(
  fieldsParam: string | undefined,
  allowedFields: Set<string>,
  defaultFields: string[]
): string {
  if (!fieldsParam) {
    return defaultFields.map(camelToSnake).join(", ");
  }

  const requested = fieldsParam.split(",").map((f) => f.trim());
  const valid = requested.filter((f) => allowedFields.has(f));

  // Always include ID
  if (!valid.includes("id")) valid.unshift("id");

  return valid.map(camelToSnake).join(", ");
}
```

## Full-Text Search

```
GET /api/v1/products?q=wireless+headphones
GET /api/v1/users?search=jane
```

```typescript
// PostgreSQL full-text search
function buildSearchClause(
  searchParam: string | undefined,
  searchColumns: string[]
): { clause: string; params: unknown[] } {
  if (!searchParam) return { clause: "", params: [] };

  // Simple ILIKE (good enough for small datasets)
  const conditions = searchColumns.map(
    (col, i) => `${col} ILIKE $${i + 1}`
  );
  const params = searchColumns.map(() => `%${searchParam}%`);

  return {
    clause: `(${conditions.join(" OR ")})`,
    params,
  };

  // For larger datasets, use PostgreSQL tsvector:
  // WHERE to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('english', $1)
}
```

## Complete List Endpoint

```typescript
router.get("/products", async (req, res) => {
  const config: FilterConfig = {
    allowedFields: new Set(["status", "category", "price", "createdAt"]),
    fieldTypes: {
      status: "enum",
      category: "string",
      price: "number",
      createdAt: "date",
    },
    enumValues: {
      status: ["active", "draft", "archived"],
    },
  };

  const sortableFields = new Set(["price", "createdAt", "name"]);
  const selectableFields = new Set(["id", "name", "price", "category", "status", "createdAt"]);

  const { page, perPage } = parsePagination(req.query);
  const { clause: whereClause, params: whereParams } = buildWhereClause(req.query, config);
  const orderClause = buildOrderClause(req.query.sort, sortableFields);
  const selectClause = buildSelectClause(req.query.fields, selectableFields, [
    "id", "name", "price", "category", "status", "createdAt",
  ]);

  const offset = (page - 1) * perPage;
  const countParams = [...whereParams];
  const queryParams = [...whereParams, perPage, offset];

  const [rows, countResult] = await Promise.all([
    db.query(
      `SELECT ${selectClause} FROM products ${whereClause} ${orderClause} LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`,
      queryParams
    ),
    db.query(`SELECT COUNT(*) FROM products ${whereClause}`, countParams),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(total / perPage);

  res.json({
    data: rows.rows,
    meta: { total, page, perPage, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  });
});
```
