---
description: When the user asks about session-based authentication, cookie sessions, session stores, Redis sessions, CSRF protection, session security, httpOnly cookies, sameSite cookies, or cookie-based auth patterns
---

# Session Authentication

## How Sessions Work

```
1. User submits login form (email + password)
2. Server verifies credentials
3. Server creates a session (random ID → user data) in session store
4. Server sends session ID as httpOnly cookie
5. Browser automatically sends cookie on every request
6. Server looks up session ID in store → retrieves user
7. On logout, server deletes session from store
```

Unlike JWTs, sessions are **stateful** — the server stores session data. This gives you:
- **Instant revocation** — delete the session, user is logged out
- **No token size limits** — store as much session data as needed
- **Server-side control** — list active sessions, force logout

---

## Cookie Configuration

### Secure Cookie Settings
```typescript
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,      // JS can't read it (XSS protection)
  secure: true,        // Only sent over HTTPS
  sameSite: "lax",     // CSRF protection (sent on navigation, not cross-origin POST)
  path: "/",           // Available on all paths
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  // domain: ".example.com", // Share across subdomains (optional)
} as const;
```

### SameSite Explained
| Value | Behavior | Use Case |
|-------|----------|----------|
| `strict` | Never sent cross-origin | Sensitive actions (banking) |
| `lax` | Sent on top-level navigation (GET), blocked on cross-origin POST | Default for most apps |
| `none` | Always sent (requires `secure: true`) | Cross-origin APIs, embedded widgets |

---

## Express Session Implementation

### With express-session + Redis
```typescript
import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET!,
    name: "sid", // Cookie name (default: "connect.sid")
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Regenerate session ID on login (prevents session fixation)
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Session error" });

    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({ user: { id: user.id, name: user.name } });
  });
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});
```

### Auth Middleware
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// Usage
app.get("/api/profile", requireAuth, getProfile);
app.delete("/api/users/:id", requireRole("admin"), deleteUser);
```

---

## Next.js Sessions (Iron Session)

### Setup
```typescript
// lib/session.ts
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  role?: string;
  isLoggedIn: boolean;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!, // At least 32 characters
  cookieName: "sid",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
```

### Server Actions
```typescript
"use server";

import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const user = await verifyCredentials(email, password);
  if (!user) {
    return { error: "Invalid credentials" };
  }

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  session.isLoggedIn = true;
  await session.save();

  redirect("/dashboard");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
```

---

## CSRF Protection

Cross-Site Request Forgery — an attacker tricks the user's browser into making authenticated requests.

### Double Submit Cookie Pattern
```typescript
import crypto from "crypto";

// Generate CSRF token on page load
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Middleware: set CSRF token cookie + validate on mutations
function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // Set token cookie for GET requests
    const token = generateCSRFToken();
    res.cookie("csrf-token", token, {
      httpOnly: false, // JS needs to read this one
      secure: true,
      sameSite: "strict",
    });
    return next();
  }

  // Validate token on mutations (POST, PUT, DELETE)
  const cookieToken = req.cookies["csrf-token"];
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
}

// Client sends the token in a header:
// fetch("/api/data", {
//   method: "POST",
//   headers: { "X-CSRF-Token": getCookie("csrf-token") },
// })
```

### SameSite as CSRF Defense
With `sameSite: "lax"` or `sameSite: "strict"`, modern browsers won't send cookies on cross-origin POST requests. This provides strong CSRF protection without tokens for most cases.

---

## Session Security

### Session Fixation Prevention
```typescript
// ALWAYS regenerate session ID after authentication
req.session.regenerate((err) => {
  req.session.userId = user.id;
  // ...
});
```

### Session Rotation
```typescript
// Periodically rotate session ID (e.g., every 15 minutes)
function rotateSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return next();

  const now = Date.now();
  const created = req.session.createdAt || now;

  if (now - created > 15 * 60 * 1000) {
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.createdAt = now;
      next();
    });
  } else {
    next();
  }
}
```

### Force Logout (Session Revocation)
```typescript
// List active sessions for a user
async function getUserSessions(userId: string) {
  const keys = await redis.keys(`sess:*`);
  const sessions = [];

  for (const key of keys) {
    const data = JSON.parse(await redis.get(key));
    if (data.userId === userId) {
      sessions.push({ id: key, ...data });
    }
  }
  return sessions;
}

// Revoke all sessions for a user (force logout everywhere)
async function revokeAllSessions(userId: string) {
  const keys = await redis.keys(`sess:*`);
  for (const key of keys) {
    const data = JSON.parse(await redis.get(key));
    if (data.userId === userId) {
      await redis.del(key);
    }
  }
}
```

---

## JWT vs Sessions

| | Sessions | JWTs |
|--|---------|------|
| State | Server-side (Redis/DB) | Client-side (token) |
| Revocation | Instant (delete session) | Requires blacklist or short expiry |
| Scaling | Need shared session store | Stateless, no shared state |
| Size | Small cookie (session ID) | Token can be large |
| Best for | Traditional web apps, SSR | APIs, microservices, SPAs |
