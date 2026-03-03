---
description: When the user asks about password hashing, bcrypt, argon2, password reset flows, magic links, email verification, rate limiting login attempts, or password security best practices
---

# Password Security

## Password Hashing

**Never store plaintext passwords.** Hash them with bcrypt or Argon2.

### bcrypt (Node.js)
```typescript
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12; // 10-12 is standard. Higher = slower = more secure

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Usage
const hash = await hashPassword("mypassword");
// $2b$12$LJ3m4ys3Lg7Eqz2...

const isValid = await verifyPassword("mypassword", hash);
// true
```

### Argon2 (Recommended for New Projects)
```typescript
import argon2 from "argon2";

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,  // Recommended variant
    memoryCost: 65536,      // 64 MB
    timeCost: 3,            // 3 iterations
    parallelism: 4,         // 4 threads
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### Go (bcrypt)
```go
import "golang.org/x/crypto/bcrypt"

func hashPassword(password string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    return string(hash), err
}

func verifyPassword(password, hash string) bool {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
```

### Python (passlib)
```python
from passlib.hash import argon2

def hash_password(password: str) -> str:
    return argon2.hash(password)

def verify_password(password: str, hash: str) -> bool:
    return argon2.verify(password, hash)
```

### bcrypt vs Argon2

| | bcrypt | Argon2id |
|--|--------|---------|
| Age | 1999 | 2015 (Password Hashing Competition winner) |
| GPU resistance | Good | Excellent (memory-hard) |
| Configuration | Cost factor only | Memory, time, parallelism |
| Recommendation | Fine for existing systems | Preferred for new projects |
| Max password length | 72 bytes | No limit |

---

## Password Validation

### Rules
```typescript
import { z } from "zod";

const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .refine((pw) => /[a-z]/.test(pw), "Must contain a lowercase letter")
  .refine((pw) => /[A-Z]/.test(pw), "Must contain an uppercase letter")
  .refine((pw) => /[0-9]/.test(pw), "Must contain a number");

// Modern approach: length > complexity
// NIST recommends: minimum 8 chars, allow up to 64+, no complexity rules
// Check against breached password lists (HaveIBeenPwned)
```

### Check Against Breached Passwords
```typescript
import crypto from "crypto";

async function isPasswordBreached(password: string): Promise<boolean> {
  const hash = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  // k-Anonymity: only send first 5 chars of hash
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();

  return text.split("\n").some((line) => line.startsWith(suffix));
}

// Usage in registration
const breached = await isPasswordBreached(password);
if (breached) {
  return { error: "This password has been found in a data breach. Please choose a different one." };
}
```

---

## Password Reset Flow

```
1. User clicks "Forgot Password"
2. User enters email
3. Server generates a reset token (random, time-limited)
4. Server sends email with reset link
5. User clicks link, enters new password
6. Server verifies token, updates password hash
7. Server invalidates all sessions (force re-login)
```

### Implementation
```typescript
import crypto from "crypto";

// Generate reset token
async function requestPasswordReset(email: string) {
  const user = await db.users.findUnique({ where: { email } });

  // Always return success (don't reveal if email exists)
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await db.passwordResets.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  await sendEmail(email, {
    subject: "Reset your password",
    html: `<a href="${APP_URL}/reset-password?token=${token}">Reset Password</a>`,
  });
}

// Verify token and reset password
async function resetPassword(token: string, newPassword: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const reset = await db.passwordResets.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!reset) {
    throw new Error("Invalid or expired reset token");
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password + mark token as used + invalidate sessions
  await db.$transaction([
    db.users.update({
      where: { id: reset.userId },
      data: { passwordHash },
    }),
    db.passwordResets.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
    db.sessions.deleteMany({
      where: { userId: reset.userId },
    }),
  ]);
}
```

---

## Magic Link Authentication

Passwordless login via email link.

```typescript
async function sendMagicLink(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find or create user
  let user = await db.users.findUnique({ where: { email } });
  if (!user) {
    user = await db.users.create({ data: { email } });
  }

  await db.magicLinks.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  });

  await sendEmail(email, {
    subject: "Sign in to MyApp",
    html: `<a href="${APP_URL}/auth/verify?token=${token}">Sign in</a>`,
  });
}

async function verifyMagicLink(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const link = await db.magicLinks.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
    include: { user: true },
  });

  if (!link) {
    throw new Error("Invalid or expired magic link");
  }

  await db.magicLinks.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });

  // Mark email as verified
  await db.users.update({
    where: { id: link.userId },
    data: { emailVerified: new Date() },
  });

  return link.user;
}
```

---

## Email Verification

```typescript
async function sendVerificationEmail(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await db.emailVerifications.create({
    data: {
      userId,
      email,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  await sendEmail(email, {
    subject: "Verify your email",
    html: `<a href="${APP_URL}/verify-email?token=${token}">Verify Email</a>`,
  });
}
```

---

## Rate Limiting Login

### Per-User Rate Limiting
```typescript
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(email: string): boolean {
  const attempts = loginAttempts.get(email);

  if (attempts && attempts.blockedUntil > Date.now()) {
    return false; // Blocked
  }

  return true;
}

function recordFailedLogin(email: string) {
  const attempts = loginAttempts.get(email) || { count: 0, blockedUntil: 0 };
  attempts.count++;

  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.blockedUntil = Date.now() + BLOCK_DURATION;
    attempts.count = 0;
  }

  loginAttempts.set(email, attempts);
}

function clearLoginAttempts(email: string) {
  loginAttempts.delete(email);
}
```

### With Redis (Production)
```typescript
async function checkRateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSec);
  }
  return current <= max;
}

// Usage
const allowed = await checkRateLimit(`login:${email}`, 5, 900); // 5 per 15 min
if (!allowed) {
  return res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
}
```

---

## Security Best Practices

| Practice | Why |
|----------|-----|
| Use Argon2id or bcrypt (cost 12+) | Slow hashing defeats brute force |
| Check against breached password lists | Prevents known-compromised passwords |
| Hash reset tokens before storing | Stolen DB data can't be used |
| Single-use tokens with expiry | Prevents replay attacks |
| Don't reveal if email exists | Prevents user enumeration |
| Invalidate sessions on password change | Prevents access with old credentials |
| Rate limit login attempts | Prevents brute force |
| Send password change notifications | User knows if account is compromised |
