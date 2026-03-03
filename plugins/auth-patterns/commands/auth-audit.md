---
name: auth-audit
description: Audit authentication and authorization implementation for security issues, common vulnerabilities, and best practice violations
arguments:
  - name: path
    description: File or directory to audit (default: ./src)
    required: false
---

# Auth Audit

Audit the authentication and authorization implementation at `$ARGUMENTS` (default: `./src`). Search for auth-related code and check for security vulnerabilities.

## Analysis Steps

### 1. Password Storage
- Search for password hashing: is bcrypt or Argon2 used?
- Check cost factor (bcrypt ≥ 12, Argon2 with proper memory/time)
- Look for plaintext password storage or weak hashing (MD5, SHA1, SHA256 without salt)
- Check if password comparison uses timing-safe comparison

### 2. Token Security
- JWTs: check algorithm validation (reject "none"), expiry, audience/issuer validation
- Check if JWT secret is hardcoded or loaded from env
- Check token storage — localStorage (XSS-vulnerable) vs httpOnly cookies
- Look for refresh token rotation and revocation
- Check if tokens contain sensitive data (passwords, PII)

### 3. Session Security
- Cookie flags: httpOnly, secure, sameSite
- Session fixation: is session ID regenerated after login?
- Session expiry: are sessions time-limited?
- CSRF protection: tokens or sameSite cookies

### 4. Authentication Endpoints
- Login: rate limiting? Brute force protection?
- Password reset: token expiry? Single-use? Hashed storage?
- Registration: email verification? Password strength validation?
- Account enumeration: do error messages reveal if email exists?

### 5. Authorization
- Are authorization checks in place for every protected route?
- Resource-level auth: can user A access user B's data?
- Org/tenant scoping: are database queries filtered by org?
- Role escalation: can a user modify their own role?

### 6. API Security
- API keys stored as hashes (not plaintext)?
- Webhook signatures verified?
- Rate limiting per key/user?
- Secrets in code, env files, or logs?

### 7. Common Vulnerabilities
- SQL injection in auth queries
- Open redirect on login return URLs
- Missing CORS restrictions on auth endpoints
- Credentials logged in plaintext
- `eval()` or `Function()` on user input

## Output Format

🔴 **Critical** (exploitable vulnerabilities):
| File:Line | Issue | Risk | Fix |
|-----------|-------|------|-----|

🟡 **Warning** (weaknesses, non-compliance):
| File:Line | Issue | Risk | Fix |

🟢 **Good Practices Found**: Highlight correctly implemented security patterns.

End with: auth security score (X/10), OWASP Top 10 coverage, and top 3 critical fixes.
