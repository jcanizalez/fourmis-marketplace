---
description: When the user asks about preventing env file leaks, secret scanning, gitignore for env files, auditing for exposed secrets, .env security, or preventing credentials from being committed to git
---

# Env Security

Prevent environment variable leaks, scan for exposed secrets, and audit your project's configuration security.

## Prevention: Stop Leaks Before They Happen

### .gitignore (Essential)

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.development.local
.env.production.local

# Secret files
*.pem
*.key
*.p12
*.pfx
credentials.json
service-account.json

# IDE settings that may contain secrets
.idea/
.vscode/settings.json

# OS files
.DS_Store
Thumbs.db
```

**Check immediately after cloning any repo:**

```bash
# Verify .env is gitignored
git check-ignore .env
# If no output → .env is NOT ignored! Fix immediately.

# Check if .env was ever committed
git log --all --full-history -- .env
# If output → secrets were committed. Rotate them immediately.
```

### Git Hooks — Block Secret Commits

```bash
# .husky/pre-commit (or .githooks/pre-commit)
#!/bin/sh

# Block committing .env files
STAGED_ENV=$(git diff --cached --name-only | grep -E '\.env$|\.env\.local$|\.env\..+\.local$')
if [ -n "$STAGED_ENV" ]; then
  echo "❌ Blocked: You're trying to commit environment files:"
  echo "$STAGED_ENV"
  echo "These contain secrets and must not be committed."
  exit 1
fi

# Block committing files with potential secrets
SUSPICIOUS=$(git diff --cached -U0 | grep -iE '(api_key|secret|password|token|private_key)\s*[=:]\s*["\x27]?[a-zA-Z0-9]' | head -5)
if [ -n "$SUSPICIOUS" ]; then
  echo "⚠️  Possible secrets detected in staged changes:"
  echo "$SUSPICIOUS"
  echo ""
  echo "If these are legitimate, use 'git commit --no-verify' to bypass."
  exit 1
fi
```

### GitHub Secret Scanning

GitHub automatically scans for known secret patterns. Enable it:

```
Repository → Settings → Code security and analysis → Secret scanning → Enable
```

For custom patterns:

```
Settings → Code security → Secret scanning → Custom patterns
→ Add pattern: my-api-key_[a-zA-Z0-9]{32}
```

### gitleaks (Pre-commit scanning)

```bash
# Install
brew install gitleaks

# Scan entire repo history
gitleaks detect --source . -v

# Scan only staged changes (fast, use in pre-commit)
gitleaks protect --staged

# Generate a report
gitleaks detect --source . --report-format json --report-path gitleaks-report.json
```

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.22.0
    hooks:
      - id: gitleaks
```

```yaml
# GitHub Actions — scan on PR
name: Secret Scanning
on: [pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Detection: Find Exposed Secrets

### Quick Audit Commands

```bash
# Search for common secret patterns in code
grep -rn --include='*.ts' --include='*.js' --include='*.py' --include='*.go' \
  -E '(password|secret|api_key|apikey|token|private_key)\s*[=:]\s*["\x27][a-zA-Z0-9]' \
  src/ | grep -v '.env' | grep -v 'test' | grep -v 'mock'

# Search for hardcoded URLs with credentials
grep -rn 'postgresql://[^@]*:[^@]*@' src/
grep -rn 'mongodb://[^@]*:[^@]*@' src/
grep -rn 'redis://:[^@]*@' src/

# Search for AWS keys
grep -rn 'AKIA[0-9A-Z]{16}' .

# Search for private keys
grep -rn 'BEGIN.*PRIVATE KEY' .

# Search for JWT tokens
grep -rn 'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.' .

# Check for .env files in git history
git log --all --diff-filter=A -- '*.env' '.env*'
```

### Common Secret Patterns

| Pattern | Regex | Example |
|---------|-------|---------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | `AKIAIOSFODNN7EXAMPLE` |
| AWS Secret Key | `[a-zA-Z0-9/+]{40}` | (40-char base64) |
| GitHub Token | `gh[pousr]_[A-Za-z0-9_]{36,}` | `ghp_abc123...` |
| Stripe Key | `sk_(live\|test)_[a-zA-Z0-9]{24,}` | `sk_live_abc123...` |
| Slack Token | `xox[baprs]-[a-zA-Z0-9-]+` | `xoxb-123-456-abc` |
| Google API Key | `AIza[0-9A-Za-z_-]{35}` | `AIzaSyD...` |
| Generic Secret | `(secret\|password\|token)\s*[:=]\s*['"][^'"]+` | Various |

## Response: What to Do When Secrets Leak

### Immediate Steps

```
1. REVOKE the exposed secret immediately
   - Rotate the API key / password / token
   - Don't just delete the commit — the secret is in git history

2. Assess the damage
   - When was it exposed? (git log)
   - Is the repo public or private?
   - Was the secret used? (check access logs)

3. Remove from git history (if needed)
   - Use BFG Repo Cleaner or git-filter-repo
   - Force push (coordinate with team)

4. Prevent recurrence
   - Add to .gitignore
   - Set up pre-commit hooks
   - Enable secret scanning
```

### Remove Secret from Git History

```bash
# Option 1: BFG Repo Cleaner (recommended — faster)
# Install: brew install bfg
bfg --replace-text passwords.txt my-repo.git
cd my-repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option 2: git-filter-repo
pip install git-filter-repo
git filter-repo --invert-paths --path .env
```

**Warning**: Force pushing rewrites history. Coordinate with your team first.

## Environment Variable Security Checklist

### For Every Project

- [ ] `.env` and `.env.local` in `.gitignore`
- [ ] Pre-commit hook blocks `.env` file commits
- [ ] No secrets in code (hardcoded strings)
- [ ] No secrets in Docker image layers
- [ ] No secrets in build-time config (use runtime injection)
- [ ] Secret scanning enabled (GitHub or gitleaks)
- [ ] `.env.example` contains placeholders, never real values

### For Production

- [ ] Secrets stored in a vault or secret manager
- [ ] Secrets rotated on a schedule
- [ ] Secrets access is audited (who accessed what, when)
- [ ] Principle of least privilege (services only get the secrets they need)
- [ ] No shared secrets between environments (prod ≠ staging ≠ dev)
- [ ] SSL/TLS for all secret transmission
- [ ] Secrets are not logged (redaction configured)

### For CI/CD

- [ ] Secrets stored in CI/CD secret store (not in code or config files)
- [ ] OIDC used instead of long-lived credentials where possible
- [ ] Secrets are masked in CI logs
- [ ] Unused CI secrets are cleaned up regularly
- [ ] Secret access is scoped to specific environments/branches

## Quick Wins

| Action | Time | Impact |
|--------|------|--------|
| Add `.env` to `.gitignore` | 1 min | Critical |
| Create `.env.example` | 5 min | High |
| Install gitleaks pre-commit hook | 10 min | High |
| Enable GitHub secret scanning | 2 min | High |
| Add env validation at startup | 15 min | Medium |
| Audit code for hardcoded secrets | 30 min | High |
| Set up secret rotation schedule | 1 hr | Medium |
