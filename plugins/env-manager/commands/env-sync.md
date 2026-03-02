---
name: env-sync
description: Sync .env.example from your actual .env — keep the template up to date with placeholder values
---

# /env-sync — Sync .env.example

Update `.env.example` to match your current `.env` file — keeping all variable names but replacing secret values with safe placeholders.

## Usage

```
/env-sync                       # Sync .env → .env.example (interactive)
/env-sync --dry-run             # Show what would change without modifying files
/env-sync --auto                # Auto-generate placeholders without prompting
/env-sync --from-code           # Generate .env.example from env vars found in code
```

## Examples

```
/env-sync
/env-sync --dry-run
/env-sync --from-code
```

## Process

1. **Read `.env`** — parse all variable names and values
2. **Categorize each variable**:
   - Safe to keep as-is: `NODE_ENV=development`, `PORT=3000`
   - Needs placeholder: `API_KEY=sk_live_...` → `API_KEY=your-api-key-here`
   - Needs generation hint: `JWT_SECRET=...` → `JWT_SECRET=generate-with: openssl rand -base64 32`
3. **Show diff** — what will change in `.env.example`
4. **Apply** — update `.env.example` preserving comments and organization
5. **--from-code**: Scan source files for `process.env.X` / `os.getenv("X")` / `os.Getenv("X")` and build `.env.example` from those references

## Placeholder Rules

| Variable Pattern | Placeholder |
|-----------------|-------------|
| `*_URL` | `https://example.com` or actual non-secret URL |
| `*_KEY`, `*_SECRET`, `*_TOKEN` | `your-{name}-here` |
| `*_PASSWORD` | `your-password-here` |
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/mydb` |
| `PORT` | Keep actual value (not a secret) |
| `NODE_ENV` | Keep actual value |
| `*_DSN` | Service-specific example URL |
| Boolean flags | Keep actual value |

## Output Format

```
## Env Sync: .env → .env.example

### Changes
+ REDIS_URL=redis://localhost:6379           (new variable)
~ API_KEY=sk_live_abc... → API_KEY=your-api-key-here  (sanitized)
- OLD_VAR=...                                (removed — no longer in .env)

### Preserved
  NODE_ENV=development                       (safe value kept)
  PORT=3000                                  (safe value kept)
  DATABASE_URL=postgresql://...              (template URL kept)

Apply changes? [Y/n]
```

## Notes

- Never copies actual secret values to `.env.example`
- Preserves comments and section organization from existing `.env.example`
- Groups variables by category (App, Database, Auth, External APIs)
- Adds generation hints for secrets (e.g., `openssl rand -base64 32`)
