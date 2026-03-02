---
description: When the user asks about secret management, storing API keys or passwords securely, using 1Password CLI or vault, rotating secrets, cloud secret managers (AWS Secrets Manager, GCP Secret Manager), or keeping secrets out of code
---

# Secret Management

Patterns for managing secrets securely — from local development to production, including vaults, rotation, and CI/CD integration.

## Secret Management Tiers

| Tier | Approach | Best For | Security |
|------|----------|----------|----------|
| **1** | `.env` files (gitignored) | Local development | Low |
| **2** | CI/CD secrets (GitHub Secrets) | Build/deploy pipelines | Medium |
| **3** | Secret manager CLI (1Password, Doppler) | Teams, multi-environment | High |
| **4** | Cloud vault (AWS SSM, GCP Secret Manager) | Production workloads | High |
| **5** | Hardware security module (HSM, KMS) | Encryption keys, compliance | Maximum |

## Tier 1: Local .env Files

```bash
# .env — NEVER committed to git
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
API_KEY=sk_test_abc123
JWT_SECRET=local-dev-secret-at-least-32-chars

# .gitignore — MUST include
.env
.env.local
.env*.local
```

**Generate secure secrets locally:**

```bash
# Random 32-byte base64 string
openssl rand -base64 32

# Random 64-character hex string
openssl rand -hex 32

# UUID
uuidgen

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Tier 2: CI/CD Secrets

### GitHub Actions Secrets

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          echo "Deploying with secrets..."
          # Secrets are masked in logs automatically
```

**Managing GitHub Secrets:**

```bash
# Set a secret
gh secret set API_KEY --body "sk_live_abc123"

# Set from file
gh secret set PRIVATE_KEY < private-key.pem

# Set for a specific environment
gh secret set DATABASE_URL --env production --body "postgresql://..."

# List secrets (values are hidden)
gh secret list

# Delete a secret
gh secret delete API_KEY
```

### GitHub Actions — OIDC (No Long-Lived Secrets)

```yaml
# Best practice: use OIDC instead of storing cloud credentials
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-arn: arn:aws:iam::123456789:role/my-deploy-role
      aws-region: us-east-1
  # No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY needed!
```

## Tier 3: Secret Manager CLIs

### 1Password CLI (op)

```bash
# Sign in
eval $(op signin)

# Reference secrets in .env files
# .env.template (committed — references, not values)
DATABASE_URL=op://Vault/Database/url
API_KEY=op://Vault/Stripe/api-key

# Inject at runtime
op run --env-file=.env.template -- npm start

# Get a single secret
op read "op://Vault/Database/password"

# Create a secret reference in scripts
export API_KEY=$(op read "op://Development/Stripe/secret-key")
```

### 1Password + Docker Compose

```yaml
services:
  api:
    build: .
    environment:
      DATABASE_URL: op://Vault/Database/url
      API_KEY: op://Vault/Stripe/api-key
# Run with: op run -- docker compose up
```

### Doppler

```bash
# Login
doppler login

# Set project and environment
doppler setup

# Run with injected secrets
doppler run -- npm start

# Download as .env
doppler secrets download --no-file --format env > .env

# In Docker
doppler run -- docker compose up
```

### Infisical

```bash
# Login and init
infisical login
infisical init

# Run with secrets
infisical run -- npm start

# Export as .env
infisical export --env=prod --format=dotenv > .env
```

## Tier 4: Cloud Secret Managers

### AWS Systems Manager (SSM) Parameter Store

```typescript
// src/secrets.ts
import { SSMClient, GetParametersByPathCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({ region: "us-east-1" });

export async function loadSecrets(prefix: string): Promise<Record<string, string>> {
  const command = new GetParametersByPathCommand({
    Path: prefix,
    WithDecryption: true,
    Recursive: true,
  });

  const response = await ssm.send(command);
  const secrets: Record<string, string> = {};

  for (const param of response.Parameters || []) {
    const key = param.Name!.replace(prefix, "").replace(/^\//, "");
    secrets[key] = param.Value!;
  }

  return secrets;
}

// Usage at startup
const secrets = await loadSecrets("/myapp/production/");
process.env.DATABASE_URL = secrets["DATABASE_URL"];
```

### AWS Secrets Manager

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

export async function getSecret(secretId: string): Promise<Record<string, string>> {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(command);
  return JSON.parse(response.SecretString!);
}

// Typically stores a JSON object:
// { "DATABASE_URL": "...", "API_KEY": "...", "JWT_SECRET": "..." }
```

### GCP Secret Manager

```python
from google.cloud import secretmanager

def get_secret(project_id: str, secret_id: str, version: str = "latest") -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("utf-8")

# Usage
database_url = get_secret("my-project", "DATABASE_URL")
```

## Secret Rotation

### Rotation Strategy

```
1. Generate new secret
2. Update the secret store (vault, SSM, etc.)
3. Deploy app — it reads the new secret
4. (For API keys) Verify the new key works
5. Revoke the old secret after grace period
6. Log the rotation event
```

### Automated Rotation Schedule

| Secret Type | Rotation Frequency | Notes |
|-------------|-------------------|-------|
| API keys | 90 days | Can be automated |
| Database passwords | 90 days | Use managed rotation |
| JWT signing keys | 180 days | Support key rollover (accept old + new) |
| Encryption keys | 365 days | Use key versioning |
| OAuth client secrets | 180 days | Coordinate with IdP |
| SSL certificates | Auto with Let's Encrypt | 90-day cycle |

### Zero-Downtime Rotation Pattern

```
Phase 1: Add new secret (app accepts both old and new)
  → Deploy with: JWT_SECRET=new, JWT_SECRET_OLD=old
  → Verify new tokens work

Phase 2: Remove old secret
  → Deploy with: JWT_SECRET=new
  → Old tokens expire naturally
```

## Quick Reference

### Secret Generation

| Method | Command |
|--------|---------|
| Base64 (32 bytes) | `openssl rand -base64 32` |
| Hex (32 bytes) | `openssl rand -hex 32` |
| URL-safe | `python3 -c "import secrets; print(secrets.token_urlsafe(32))"` |
| UUID | `uuidgen` or `python3 -c "import uuid; print(uuid.uuid4())"` |
| Passphrase | `openssl rand -base64 48 \| tr -d '\n'` |
