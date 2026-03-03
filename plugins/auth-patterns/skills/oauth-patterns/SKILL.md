---
description: When the user asks about OAuth2, OAuth flows, authorization code flow, PKCE, client credentials, social login with Google or GitHub or Discord, OpenID Connect, OIDC, or implementing OAuth in a web application
---

# OAuth2 Patterns

## OAuth2 Flows Overview

| Flow | Use Case | Client Type |
|------|----------|-------------|
| Authorization Code + PKCE | Web apps, SPAs, mobile | Public clients |
| Authorization Code | Server-side web apps | Confidential clients |
| Client Credentials | Server-to-server (no user) | Confidential clients |
| Device Code | TVs, CLIs, IoT | Input-limited devices |

---

## Authorization Code Flow with PKCE

The recommended flow for web apps, SPAs, and mobile apps.

```
1. App generates code_verifier (random string) + code_challenge (SHA256 hash)
2. App redirects user to authorization server with code_challenge
3. User logs in and consents
4. Auth server redirects back with authorization code
5. App exchanges code + code_verifier for tokens
6. Auth server verifies code_challenge matches → issues tokens
```

### Step 1: Generate PKCE Challenge
```typescript
import crypto from "crypto";

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { verifier, challenge };
}
```

### Step 2: Redirect to Auth Server
```typescript
function getAuthURL(provider: "google" | "github") {
  const { verifier, challenge } = generatePKCE();

  // Store verifier in session/cookie for later
  session.codeVerifier = verifier;

  const params = new URLSearchParams({
    client_id: config[provider].clientId,
    redirect_uri: config[provider].redirectUri,
    response_type: "code",
    scope: config[provider].scopes.join(" "),
    state: crypto.randomBytes(16).toString("hex"), // CSRF protection
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return `${config[provider].authUrl}?${params}`;
}
```

### Step 3: Handle Callback
```typescript
async function handleCallback(code: string, state: string) {
  // Verify state matches (CSRF protection)
  if (state !== session.expectedState) {
    throw new Error("Invalid state parameter");
  }

  // Exchange code for tokens
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret, // Server-side only
      code_verifier: session.codeVerifier,
    }),
  });

  const tokens = await response.json();
  // { access_token, refresh_token, id_token, expires_in, token_type }

  return tokens;
}
```

---

## Social Login Providers

### Google
```typescript
const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
  redirectUri: "http://localhost:3000/api/auth/callback/google",
  scopes: ["openid", "email", "profile"],
};

async function getGoogleUser(accessToken: string) {
  const res = await fetch(googleConfig.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await res.json();
  return {
    id: profile.sub,
    email: profile.email,
    name: profile.name,
    avatar: profile.picture,
    emailVerified: profile.email_verified,
  };
}
```

### GitHub
```typescript
const githubConfig = {
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  authUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  userInfoUrl: "https://api.github.com/user",
  redirectUri: "http://localhost:3000/api/auth/callback/github",
  scopes: ["read:user", "user:email"],
};

async function getGitHubUser(accessToken: string) {
  const [userRes, emailRes] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  const profile = await userRes.json();
  const emails = await emailRes.json();
  const primaryEmail = emails.find((e: any) => e.primary)?.email;

  return {
    id: String(profile.id),
    email: primaryEmail,
    name: profile.name || profile.login,
    avatar: profile.avatar_url,
  };
}
```

### Discord
```typescript
const discordConfig = {
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  authUrl: "https://discord.com/api/oauth2/authorize",
  tokenUrl: "https://discord.com/api/oauth2/token",
  userInfoUrl: "https://discord.com/api/users/@me",
  redirectUri: "http://localhost:3000/api/auth/callback/discord",
  scopes: ["identify", "email"],
};
```

---

## Client Credentials Flow

Server-to-server authentication — no user involved.

```typescript
async function getServiceToken() {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${config.clientId}:${config.clientSecret}`,
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "api:read api:write",
    }),
  });

  return response.json();
  // { access_token, expires_in, token_type: "Bearer" }
}
```

---

## OpenID Connect (OIDC) Basics

OIDC adds an **identity layer** on top of OAuth2. The key addition is the `id_token` — a JWT containing user identity claims.

### ID Token Claims
```json
{
  "iss": "https://accounts.google.com",
  "sub": "110169484474386276334",
  "aud": "your-client-id",
  "exp": 1709500800,
  "iat": 1709497200,
  "email": "alice@gmail.com",
  "email_verified": true,
  "name": "Alice Smith",
  "picture": "https://..."
}
```

### Discovery Document
```typescript
// Fetch provider configuration automatically
const discoveryUrl = "https://accounts.google.com/.well-known/openid-configuration";
const config = await fetch(discoveryUrl).then((r) => r.json());

// config contains:
// authorization_endpoint, token_endpoint, userinfo_endpoint,
// jwks_uri (for verifying id_token signatures), etc.
```

---

## Linking OAuth Accounts to Users

```typescript
async function handleOAuthCallback(provider: string, profile: OAuthProfile) {
  // 1. Check if OAuth account is already linked
  const linked = await db.oauthAccounts.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: profile.id } },
  });

  if (linked) {
    // Existing user — just log them in
    return { userId: linked.userId, isNewUser: false };
  }

  // 2. Check if a user with this email already exists
  const existingUser = await db.users.findUnique({
    where: { email: profile.email },
  });

  if (existingUser) {
    // Link OAuth account to existing user
    await db.oauthAccounts.create({
      data: {
        userId: existingUser.id,
        provider,
        providerAccountId: profile.id,
        accessToken: profile.accessToken,
      },
    });
    return { userId: existingUser.id, isNewUser: false };
  }

  // 3. Create new user + link OAuth account
  const user = await db.users.create({
    data: {
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      emailVerified: profile.emailVerified ? new Date() : null,
      oauthAccounts: {
        create: {
          provider,
          providerAccountId: profile.id,
          accessToken: profile.accessToken,
        },
      },
    },
  });

  return { userId: user.id, isNewUser: true };
}
```

---

## Security Checklist

| Check | Why |
|-------|-----|
| Always use PKCE | Prevents authorization code interception |
| Validate `state` parameter | Prevents CSRF attacks |
| Verify `id_token` signature | Prevents token forgery |
| Check `iss` and `aud` claims | Ensures token is from expected provider |
| Store tokens securely (httpOnly cookies) | Prevents XSS from stealing tokens |
| Use short-lived access tokens | Limits exposure window |
| Register exact redirect URIs | Prevents open redirect attacks |
| Use `response_mode=query` not `fragment` | Fragments aren't sent to server |
