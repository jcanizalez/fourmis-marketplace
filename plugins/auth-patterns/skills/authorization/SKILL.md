---
description: When the user asks about authorization, RBAC, role-based access control, permissions, ABAC, attribute-based access control, resource-level authorization, permission checking, or how to implement access control in a web application
---

# Authorization Patterns

## Authentication vs Authorization

- **Authentication (AuthN)**: Who are you? (Login, JWT, session)
- **Authorization (AuthZ)**: What can you do? (Roles, permissions, policies)

---

## RBAC — Role-Based Access Control

The most common pattern. Users have roles, roles have permissions.

### Simple Role Check
```typescript
type Role = "admin" | "editor" | "viewer";

interface User {
  id: string;
  role: Role;
}

// Middleware
function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// Usage
app.get("/api/posts", requireRole("admin", "editor", "viewer"), listPosts);
app.post("/api/posts", requireRole("admin", "editor"), createPost);
app.delete("/api/posts/:id", requireRole("admin"), deletePost);
```

### Permission-Based RBAC
```typescript
// Define granular permissions
const PERMISSIONS = {
  "posts:read": true,
  "posts:create": true,
  "posts:update": true,
  "posts:delete": true,
  "users:read": true,
  "users:manage": true,
  "settings:manage": true,
} as const;

type Permission = keyof typeof PERMISSIONS;

// Map roles to permissions
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "posts:read", "posts:create", "posts:update", "posts:delete",
    "users:read", "users:manage",
    "settings:manage",
  ],
  editor: [
    "posts:read", "posts:create", "posts:update",
    "users:read",
  ],
  viewer: [
    "posts:read",
    "users:read",
  ],
};

// Check permission
function hasPermission(user: User, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

// Middleware
function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const hasAll = permissions.every((p) => hasPermission(user, p));
    if (!hasAll) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// Usage
app.delete("/api/posts/:id", requirePermission("posts:delete"), deletePost);
app.put("/api/settings", requirePermission("settings:manage"), updateSettings);
```

### Database-Stored Roles & Permissions
```typescript
// Schema
// users: id, email, ...
// roles: id, name
// user_roles: user_id, role_id
// permissions: id, name
// role_permissions: role_id, permission_id

async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await db.query(`
    SELECT DISTINCT p.name
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = $1
  `, [userId]);

  return result.rows.map((r) => r.name);
}
```

---

## Resource-Level Authorization

Not just "can they do X?" but "can they do X to this specific resource?"

### Owner Check
```typescript
async function canEditPost(userId: string, postId: string): Promise<boolean> {
  const post = await db.posts.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) return false;

  // Author can always edit their own posts
  return post.authorId === userId;
}

// Combined role + resource check
async function canDeletePost(user: User, postId: string): Promise<boolean> {
  // Admins can delete anything
  if (user.role === "admin") return true;

  // Authors can delete their own posts
  const post = await db.posts.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  return post?.authorId === user.id;
}
```

### Authorization Middleware Pattern
```typescript
type AuthCheck = (user: User, resourceId: string) => Promise<boolean>;

function authorize(check: AuthCheck, paramName: string = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const resourceId = req.params[paramName];
    const allowed = await check(user, resourceId);

    if (!allowed) {
      return res.status(403).json({ error: "Not authorized" });
    }

    next();
  };
}

// Usage
app.put("/api/posts/:id", authorize(canEditPost), updatePost);
app.delete("/api/posts/:id", authorize(canDeletePost), deletePost);
```

---

## Organization / Tenant Scoping

### Multi-Tenant Authorization
```typescript
interface User {
  id: string;
  orgId: string;
  orgRole: "owner" | "admin" | "member";
}

// Ensure users can only access their org's data
function requireOrg(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  const orgId = req.params.orgId || req.body.orgId;

  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (user.orgId !== orgId) {
    return res.status(403).json({ error: "Not a member of this organization" });
  }

  next();
}

// Scoped database queries — ALWAYS filter by orgId
async function listPosts(req: Request, res: Response) {
  const posts = await db.posts.findMany({
    where: { orgId: req.user.orgId }, // Never return other orgs' data
  });
  res.json(posts);
}
```

---

## ABAC — Attribute-Based Access Control

More flexible than RBAC — decisions based on user attributes, resource attributes, environment, and action.

### Policy Engine Pattern
```typescript
interface PolicyContext {
  user: {
    id: string;
    role: string;
    department: string;
    clearanceLevel: number;
  };
  resource: {
    type: string;
    ownerId: string;
    classification: string;
    department: string;
  };
  action: string;
  environment: {
    time: Date;
    ipAddress: string;
  };
}

type Policy = (ctx: PolicyContext) => boolean;

// Define policies
const policies: Policy[] = [
  // Admins can do anything
  (ctx) => ctx.user.role === "admin",

  // Users can read resources in their department
  (ctx) =>
    ctx.action === "read" &&
    ctx.user.department === ctx.resource.department,

  // Owners can update their own resources
  (ctx) =>
    ctx.action === "update" &&
    ctx.resource.ownerId === ctx.user.id,

  // Classified documents need clearance level 3+
  (ctx) =>
    ctx.resource.classification === "classified" &&
    ctx.user.clearanceLevel >= 3,

  // No destructive actions outside business hours
  (ctx) => {
    if (ctx.action !== "delete") return true;
    const hour = ctx.environment.time.getHours();
    return hour >= 9 && hour < 17;
  },
];

function evaluate(ctx: PolicyContext): boolean {
  return policies.some((policy) => policy(ctx));
}
```

---

## Next.js Authorization

### Server Component Authorization
```tsx
// app/admin/page.tsx
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/unauthorized");
  }

  return <AdminDashboard />;
}
```

### Middleware Authorization
```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const protectedRoutes = ["/dashboard", "/settings", "/admin"];
const adminRoutes = ["/admin"];

export async function middleware(req: NextRequest) {
  const session = await getSession();
  const path = req.nextUrl.pathname;

  // Check if route requires auth
  if (protectedRoutes.some((r) => path.startsWith(r))) {
    if (!session.isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Check if route requires admin
  if (adminRoutes.some((r) => path.startsWith(r))) {
    if (session.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/admin/:path*"],
};
```

---

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| Simple role check | Small apps with 2-3 roles |
| Permission-based RBAC | Apps with granular access control |
| DB-stored permissions | Dynamic roles (user-configurable) |
| Resource-level auth | "Can user X edit post Y?" |
| Org/tenant scoping | Multi-tenant SaaS apps |
| ABAC policies | Complex rules with multiple attributes |
| Middleware auth | Protect route groups |
| Inline auth check | Single-use authorization in handler |
