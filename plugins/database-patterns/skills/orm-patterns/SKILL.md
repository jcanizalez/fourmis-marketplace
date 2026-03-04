---
description: When the user asks about ORM, Prisma, Drizzle ORM, GORM, SQLx, database queries in TypeScript or Go, schema definition in ORM, relations, raw SQL, or when to use an ORM
---

# ORM Patterns

Use ORMs effectively — Prisma and Drizzle for TypeScript, GORM and SQLx for Go. Covers schema definition, relations, transactions, raw SQL escape hatches, and when to use each tool.

## When to Use What

| Tool | Type | Best For |
|------|------|----------|
| **Prisma** | Full ORM | Rapid development, type safety, migrations |
| **Drizzle** | SQL-like ORM | Control over SQL, lightweight, edge-compatible |
| **GORM** | Full ORM (Go) | Rapid Go development, associations |
| **SQLx** | Query builder (Go) | Performance-critical Go services, raw SQL lovers |
| **Raw SQL** | Direct SQL | Complex queries, performance tuning, CTEs |

## Prisma (TypeScript)

### Schema Definition

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  isActive  Boolean  @default(true) @map("is_active")
  orders    Order[]
  profile   Profile?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
  @@index([email])
  @@index([createdAt])
}

model Order {
  id        String      @id @default(uuid())
  userId    String      @map("user_id")
  user      User        @relation(fields: [userId], references: [id])
  items     OrderItem[]
  total     Decimal     @db.Decimal(10, 2)
  status    OrderStatus @default(PENDING)
  createdAt DateTime    @default(now()) @map("created_at")
  updatedAt DateTime    @updatedAt @map("updated_at")

  @@map("orders")
  @@index([userId])
  @@index([status, createdAt])
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String  @map("order_id")
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String  @map("product_id")
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(10, 2)

  @@map("order_items")
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### Queries

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

// Find with relations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    orders: {
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    },
    profile: true,
  },
});

// Select specific fields (reduces data transfer)
const users = await prisma.user.findMany({
  where: {
    isActive: true,
    role: "USER",
    createdAt: { gte: new Date("2026-01-01") },
  },
  select: {
    id: true,
    name: true,
    email: true,
    _count: { select: { orders: true } },
  },
  orderBy: { createdAt: "desc" },
  take: 20,
  skip: 0,
});

// Create with nested relations
const order = await prisma.order.create({
  data: {
    userId: user.id,
    total: 99.99,
    items: {
      create: [
        { productId: "prod_1", quantity: 2, unitPrice: 29.99 },
        { productId: "prod_2", quantity: 1, unitPrice: 40.01 },
      ],
    },
  },
  include: { items: true },
});

// Upsert (create or update)
const user = await prisma.user.upsert({
  where: { email: "jane@example.com" },
  update: { name: "Jane Updated" },
  create: { email: "jane@example.com", name: "Jane Doe" },
});

// Aggregate
const stats = await prisma.order.aggregate({
  where: { status: "DELIVERED" },
  _count: true,
  _sum: { total: true },
  _avg: { total: true },
});

// Group by
const ordersByStatus = await prisma.order.groupBy({
  by: ["status"],
  _count: true,
  _sum: { total: true },
});
```

### Prisma Transactions

```typescript
// Interactive transaction (recommended)
const result = await prisma.$transaction(async (tx) => {
  // Check balance
  const account = await tx.account.findUnique({
    where: { id: accountId },
  });

  if (account.balance < amount) {
    throw new Error("Insufficient funds");
  }

  // Debit
  await tx.account.update({
    where: { id: accountId },
    data: { balance: { decrement: amount } },
  });

  // Create order
  const order = await tx.order.create({
    data: { userId, total: amount, items: { create: items } },
  });

  return order;
});

// Raw SQL in Prisma
const users = await prisma.$queryRaw<User[]>`
  SELECT u.*, COUNT(o.id) as order_count
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  WHERE u.created_at > ${startDate}
  GROUP BY u.id
  ORDER BY order_count DESC
  LIMIT ${limit}
`;
```

## Drizzle ORM (TypeScript)

### Schema Definition

```typescript
// db/schema.ts
import { pgTable, uuid, text, boolean, timestamp, decimal, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["user", "admin", "moderator"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "processing", "shipped", "delivered", "cancelled"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
});

// Relations (for query builder)
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));
```

### Queries

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import * as schema from "./schema";

const db = drizzle(pool, { schema });

// Select with filter
const activeUsers = await db
  .select({
    id: schema.users.id,
    name: schema.users.name,
    email: schema.users.email,
  })
  .from(schema.users)
  .where(and(
    eq(schema.users.isActive, true),
    gte(schema.users.createdAt, new Date("2026-01-01"))
  ))
  .orderBy(desc(schema.users.createdAt))
  .limit(20);

// Relational query (like Prisma include)
const usersWithOrders = await db.query.users.findMany({
  where: eq(schema.users.isActive, true),
  with: {
    orders: {
      with: { items: true },
      orderBy: [desc(schema.orders.createdAt)],
      limit: 5,
    },
  },
  limit: 20,
});

// Join
const ordersWithUsers = await db
  .select({
    orderId: schema.orders.id,
    total: schema.orders.total,
    userName: schema.users.name,
    userEmail: schema.users.email,
  })
  .from(schema.orders)
  .innerJoin(schema.users, eq(schema.orders.userId, schema.users.id))
  .where(eq(schema.orders.status, "pending"));

// Aggregate
const stats = await db
  .select({
    status: schema.orders.status,
    count: count(),
    totalRevenue: sql<string>`SUM(${schema.orders.total})`,
  })
  .from(schema.orders)
  .groupBy(schema.orders.status);

// Insert
const [newUser] = await db
  .insert(schema.users)
  .values({ name: "Jane", email: "jane@example.com" })
  .returning();

// Transaction
const order = await db.transaction(async (tx) => {
  const [order] = await tx
    .insert(schema.orders)
    .values({ userId, total: 99.99 })
    .returning();

  await tx.insert(schema.orderItems).values(
    items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.price,
    }))
  );

  return order;
});

// Raw SQL
const result = await db.execute(sql`
  SELECT u.id, u.name, COUNT(o.id) as order_count
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id
  ORDER BY order_count DESC
`);
```

## Go — GORM

```go
// models.go
type User struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    Email     string    `gorm:"uniqueIndex;not null"`
    Name      string    `gorm:"not null"`
    Role      string    `gorm:"not null;default:'user'"`
    IsActive  bool      `gorm:"not null;default:true"`
    Orders    []Order   `gorm:"foreignKey:UserID"`
    CreatedAt time.Time `gorm:"not null;default:now()"`
    UpdatedAt time.Time `gorm:"not null;default:now()"`
}

type Order struct {
    ID        uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    UserID    uuid.UUID   `gorm:"type:uuid;not null;index"`
    User      User        `gorm:"constraint:OnDelete:RESTRICT"`
    Items     []OrderItem `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE"`
    Total     float64     `gorm:"type:decimal(10,2);not null"`
    Status    string      `gorm:"not null;default:'pending'"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

// Queries
var users []User
db.Where("is_active = ? AND role = ?", true, "user").
    Preload("Orders", func(db *gorm.DB) *gorm.DB {
        return db.Order("created_at DESC").Limit(5)
    }).
    Order("created_at DESC").
    Limit(20).
    Find(&users)

// Create with associations
order := Order{
    UserID: userID,
    Total:  99.99,
    Items: []OrderItem{
        {ProductID: prodID, Quantity: 2, UnitPrice: 29.99},
    },
}
db.Create(&order)

// Transaction
db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&order).Error; err != nil {
        return err
    }
    if err := tx.Model(&Account{}).
        Where("id = ? AND balance >= ?", accountID, amount).
        Update("balance", gorm.Expr("balance - ?", amount)).Error; err != nil {
        return err
    }
    return nil
})
```

## Go — SQLx (Raw SQL, Type-Safe)

```go
// SQLx — write SQL, get type safety
type User struct {
    ID        uuid.UUID `db:"id"`
    Email     string    `db:"email"`
    Name      string    `db:"name"`
    Role      string    `db:"role"`
    IsActive  bool      `db:"is_active"`
    CreatedAt time.Time `db:"created_at"`
}

// Query multiple rows
var users []User
err := db.SelectContext(ctx, &users,
    `SELECT id, email, name, role, is_active, created_at
     FROM users
     WHERE is_active = $1 AND created_at > $2
     ORDER BY created_at DESC
     LIMIT $3`,
    true, startDate, limit)

// Query single row
var user User
err := db.GetContext(ctx, &user,
    "SELECT * FROM users WHERE id = $1", userID)

// Named queries
result, err := db.NamedExecContext(ctx,
    `INSERT INTO users (name, email, role)
     VALUES (:name, :email, :role)`,
    map[string]any{
        "name": "Jane", "email": "jane@example.com", "role": "user",
    })

// Transaction
tx, err := db.BeginTxx(ctx, nil)
if err != nil { return err }
defer tx.Rollback()

_, err = tx.ExecContext(ctx,
    "INSERT INTO orders (user_id, total) VALUES ($1, $2)", userID, total)
if err != nil { return err }

return tx.Commit()
```

## ORM Best Practices

| Practice | Details |
|----------|---------|
| **Use `select` / field picking** | Don't `SELECT *` — only fetch fields you need |
| **Eager load relationships** | Use `include` / `Preload` to avoid N+1 |
| **Raw SQL for complex queries** | CTEs, window functions, complex joins — use raw SQL |
| **Transactions for multi-step writes** | Never partial updates |
| **Log queries in development** | Catch N+1 early, understand generated SQL |
| **Run migrations in CI** | Catch schema issues before deployment |
| **Use connection pooling** | See connection-pooling skill |
