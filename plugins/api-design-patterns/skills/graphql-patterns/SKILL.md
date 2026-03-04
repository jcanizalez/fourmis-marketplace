---
description: When the user asks about GraphQL, schema design, resolvers, DataLoader, N+1 problem, GraphQL subscriptions, Relay connections, GraphQL authentication, or Apollo Server
---

# GraphQL Patterns

Design efficient GraphQL APIs — schema design, resolvers, DataLoader for N+1 prevention, authentication/authorization, subscriptions, pagination (Relay connections), and error handling.

## Schema Design

### Type Definitions

```graphql
# schema.graphql
type Query {
  user(id: ID!): User
  users(first: Int, after: String, filter: UserFilter): UserConnection!
  me: User!
  order(id: ID!): Order
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(id: ID!): DeleteUserPayload!
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
  cancelOrder(id: ID!): CancelOrderPayload!
}

type Subscription {
  orderStatusChanged(orderId: ID!): Order!
  newMessage(roomId: ID!): Message!
}

# Use input types for mutations
input CreateUserInput {
  name: String!
  email: String!
  role: UserRole
}

input UpdateUserInput {
  name: String
  email: String
  role: UserRole
}

# Mutation payloads — always return the mutated object + errors
type CreateUserPayload {
  user: User
  errors: [UserError!]!
}

type UserError {
  field: String!
  message: String!
  code: ErrorCode!
}

enum ErrorCode {
  VALIDATION_FAILED
  NOT_FOUND
  CONFLICT
  UNAUTHORIZED
  FORBIDDEN
}

# Core types
type User {
  id: ID!
  name: String!
  email: String!
  role: UserRole!
  orders(first: Int, after: String): OrderConnection!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}

type Order {
  id: ID!
  user: User!
  items: [OrderItem!]!
  total: Float!
  status: OrderStatus!
  createdAt: DateTime!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

scalar DateTime

input UserFilter {
  role: UserRole
  search: String
  createdAfter: DateTime
  createdBefore: DateTime
}
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Types | PascalCase | `User`, `OrderItem` |
| Fields | camelCase | `firstName`, `createdAt` |
| Enums | SCREAMING_SNAKE | `ORDER_STATUS`, `USER_ROLE` |
| Inputs | PascalCase + Input | `CreateUserInput` |
| Payloads | PascalCase + Payload | `CreateUserPayload` |
| Mutations | verb + noun | `createUser`, `cancelOrder` |
| Queries | noun or adjective | `user`, `users`, `me` |

## Resolvers (Node.js + Apollo Server)

```typescript
// resolvers/user.ts
import { GraphQLError } from "graphql";

export const userResolvers = {
  Query: {
    user: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const user = await ctx.dataSources.users.findById(id);
      if (!user) {
        throw new GraphQLError("User not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      return user;
    },

    users: async (_: unknown, args: UsersArgs, ctx: Context) => {
      return ctx.dataSources.users.findMany(args);
    },

    me: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      return ctx.dataSources.users.findById(ctx.user.id);
    },
  },

  Mutation: {
    createUser: async (_: unknown, { input }: { input: CreateUserInput }, ctx: Context) => {
      // Validate
      const errors = validateCreateUser(input);
      if (errors.length > 0) {
        return { user: null, errors };
      }

      // Check duplicate
      const existing = await ctx.dataSources.users.findByEmail(input.email);
      if (existing) {
        return {
          user: null,
          errors: [{ field: "email", message: "Email already in use", code: "CONFLICT" }],
        };
      }

      const user = await ctx.dataSources.users.create(input);
      return { user, errors: [] };
    },
  },

  // Field resolvers — resolve relationships
  User: {
    orders: async (parent: User, args: ConnectionArgs, ctx: Context) => {
      return ctx.dataSources.orders.findByUserId(parent.id, args);
    },
  },

  Order: {
    user: async (parent: Order, _: unknown, ctx: Context) => {
      // Uses DataLoader to batch + cache
      return ctx.loaders.userLoader.load(parent.userId);
    },
  },
};
```

## DataLoader — Solving N+1

The N+1 problem: If you query 20 orders, each resolving `user`, you get 20 separate DB queries for users instead of one batched query.

```typescript
// loaders.ts
import DataLoader from "dataloader";

export function createLoaders(db: Database) {
  return {
    userLoader: new DataLoader<string, User | null>(async (ids) => {
      // Single batch query: SELECT * FROM users WHERE id IN (...)
      const users = await db.query(
        "SELECT * FROM users WHERE id = ANY($1)",
        [ids]
      );

      // Return in same order as input ids
      const userMap = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) || null);
    }),

    ordersByUserLoader: new DataLoader<string, Order[]>(async (userIds) => {
      const orders = await db.query(
        "SELECT * FROM orders WHERE user_id = ANY($1) ORDER BY created_at DESC",
        [userIds]
      );

      // Group by user_id
      const orderMap = new Map<string, Order[]>();
      for (const order of orders) {
        if (!orderMap.has(order.userId)) orderMap.set(order.userId, []);
        orderMap.get(order.userId)!.push(order);
      }
      return userIds.map((id) => orderMap.get(id) || []);
    }),
  };
}

// Create fresh loaders per request (important — DataLoader caches per request)
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

app.use("/graphql", expressMiddleware(server, {
  context: async ({ req }) => ({
    user: await authenticate(req),
    dataSources: createDataSources(db),
    loaders: createLoaders(db), // Fresh per request
  }),
}));
```

## Authentication & Authorization

```typescript
// Context setup
interface Context {
  user: TokenPayload | null;
  loaders: ReturnType<typeof createLoaders>;
  dataSources: ReturnType<typeof createDataSources>;
}

async function buildContext({ req }: { req: Request }): Promise<Context> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  let user: TokenPayload | null = null;

  if (token) {
    try {
      user = verifyToken(token);
    } catch {
      // Invalid token — continue as unauthenticated
    }
  }

  return {
    user,
    loaders: createLoaders(db),
    dataSources: createDataSources(db),
  };
}

// Resolver-level authorization
const resolvers = {
  Mutation: {
    deleteUser: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      // Must be authenticated
      if (!ctx.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Must be admin or self
      if (ctx.user.role !== "ADMIN" && ctx.user.id !== id) {
        throw new GraphQLError("Not authorized to delete this user", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      await ctx.dataSources.users.delete(id);
      return { success: true, errors: [] };
    },
  },
};

// Directive-based authorization (schema-first)
// schema: directive @auth(requires: UserRole) on FIELD_DEFINITION
// type Mutation {
//   deleteUser(id: ID!): DeleteUserPayload! @auth(requires: ADMIN)
// }
```

## Relay-Style Cursor Pagination

```graphql
# Standard Relay connection types
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### Implementation

```typescript
interface ConnectionArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

async function resolveConnection<T extends { id: string; createdAt: Date }>(
  queryFn: (limit: number, cursor?: { id: string; createdAt: Date }) => Promise<T[]>,
  countFn: () => Promise<number>,
  args: ConnectionArgs
): Promise<Connection<T>> {
  const limit = args.first || args.last || 20;
  const clampedLimit = Math.min(limit, 100);

  let cursor: { id: string; createdAt: Date } | undefined;
  if (args.after) {
    cursor = decodeCursor(args.after);
  }

  const nodes = await queryFn(clampedLimit + 1, cursor);
  const hasMore = nodes.length > clampedLimit;
  const data = nodes.slice(0, clampedLimit);
  const totalCount = await countFn();

  return {
    edges: data.map((node) => ({
      node,
      cursor: encodeCursor({ id: node.id, createdAt: node.createdAt }),
    })),
    pageInfo: {
      hasNextPage: hasMore,
      hasPreviousPage: !!args.after,
      startCursor: data.length > 0 ? encodeCursor({ id: data[0].id, createdAt: data[0].createdAt }) : null,
      endCursor: data.length > 0 ? encodeCursor({ id: data[data.length - 1].id, createdAt: data[data.length - 1].createdAt }) : null,
    },
    totalCount,
  };
}
```

## Subscriptions

```typescript
import { PubSub } from "graphql-subscriptions";
// For production: use Redis-based pub/sub
// import { RedisPubSub } from "graphql-redis-subscriptions";

const pubsub = new PubSub();

const resolvers = {
  Mutation: {
    updateOrderStatus: async (_: unknown, { id, status }: { id: string; status: string }, ctx: Context) => {
      const order = await ctx.dataSources.orders.updateStatus(id, status);

      // Publish event
      pubsub.publish(`ORDER_STATUS_${id}`, { orderStatusChanged: order });

      return { order, errors: [] };
    },
  },

  Subscription: {
    orderStatusChanged: {
      subscribe: (_: unknown, { orderId }: { orderId: string }) => {
        return pubsub.asyncIterableIterator(`ORDER_STATUS_${orderId}`);
      },
    },

    newMessage: {
      subscribe: (_: unknown, { roomId }: { roomId: string }, ctx: Context) => {
        // Authorize — user must be a member of the room
        if (!ctx.user) throw new GraphQLError("Authentication required");
        return pubsub.asyncIterableIterator(`ROOM_MESSAGE_${roomId}`);
      },
    },
  },
};
```

## Error Handling

```typescript
// Business logic errors — return in payload (not exceptions)
createUser: async (_, { input }, ctx) => {
  const errors = [];

  if (!isValidEmail(input.email)) {
    errors.push({ field: "email", message: "Invalid email", code: "VALIDATION_FAILED" });
  }

  const existing = await ctx.dataSources.users.findByEmail(input.email);
  if (existing) {
    errors.push({ field: "email", message: "Email taken", code: "CONFLICT" });
  }

  if (errors.length > 0) return { user: null, errors };

  const user = await ctx.dataSources.users.create(input);
  return { user, errors: [] };
};

// Infrastructure errors — throw GraphQLError
throw new GraphQLError("User not found", {
  extensions: {
    code: "NOT_FOUND",
    http: { status: 404 },
  },
});

// Never expose internal errors
// ❌ throw new Error(dbError.message)
// ✅ logger.error(dbError); throw new GraphQLError("Internal error")
```

## Schema Design Best Practices

| Practice | Details |
|----------|---------|
| **Input types for mutations** | `CreateUserInput`, not bare arguments |
| **Payload types for mutations** | Always return `{ resource, errors }` |
| **Connections for lists** | Relay-style pagination, not bare arrays |
| **Non-nullable by default** | Use `!` liberally, nullable only when field might actually be null |
| **Enums for fixed sets** | `UserRole`, `OrderStatus` — not plain strings |
| **Custom scalars** | `DateTime`, `URL`, `Email` for validation |
| **No overfetching** | Let clients request only the fields they need |
| **DataLoader everywhere** | Any field that resolves a relationship |
| **Fresh loaders per request** | DataLoader caches — stale data across requests otherwise |
| **Depth limiting** | Prevent deeply nested queries that hammer the DB |

## Query Complexity & Depth Limiting

```typescript
import depthLimit from "graphql-depth-limit";
import { createComplexityLimitRule } from "graphql-validation-complexity";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    depthLimit(7),                         // Max 7 levels deep
    createComplexityLimitRule(1000, {       // Max complexity score
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10,
    }),
  ],
});
```
