---
description: When the user asks about JWT, JSON Web Tokens, access tokens, refresh tokens, token rotation, JWT validation, RS256 vs HS256, stateless authentication, or JWT best practices
---

# JWT Patterns

## How JWT Works

A JWT is a signed, self-contained token: `header.payload.signature`

```
eyJhbGciOiJIUzI1NiJ9.         ← Header (algorithm)
eyJzdWIiOiIxMjMiLCJyb2xlIjoi  ← Payload (claims)
YWRtaW4ifQ.
SflKxwRJSMeKKF2QT4fwpMeJf36P  ← Signature (verification)
```

The server signs the token → client stores it → client sends it back → server verifies the signature. No database lookup needed (stateless).

---

## Creating & Validating JWTs

### Node.js (jose)
```typescript
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Create token
async function createToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m") // Short-lived access token
    .setIssuer("myapp")
    .setAudience("myapp-api")
    .sign(secret);
}

// Verify token
async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret, {
    issuer: "myapp",
    audience: "myapp-api",
  });
  return payload; // { sub: "123", role: "admin", iat: ..., exp: ... }
}
```

### Go
```go
import "github.com/golang-jwt/jwt/v5"

type Claims struct {
    UserID string `json:"sub"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

func createToken(userID, role, secret string) (string, error) {
    claims := Claims{
        UserID: userID,
        Role:   role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "myapp",
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

func verifyToken(tokenString, secret string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{},
        func(t *jwt.Token) (interface{}, error) {
            if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
            }
            return []byte(secret), nil
        },
    )
    if err != nil {
        return nil, fmt.Errorf("invalid token: %w", err)
    }
    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, fmt.Errorf("invalid claims")
    }
    return claims, nil
}
```

### Python
```python
import jwt
from datetime import datetime, timedelta, timezone

SECRET = os.environ["JWT_SECRET"]

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "iss": "myapp",
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")

def verify_token(token: str) -> dict:
    return jwt.decode(
        token, SECRET, algorithms=["HS256"],
        issuer="myapp",
    )
```

---

## Access + Refresh Token Pattern

```
Client                    Server
  |                         |
  |-- Login (email/pass) -->|
  |<-- access_token (15m) --|  ← Short-lived, used for API calls
  |<-- refresh_token (7d) --|  ← Long-lived, used only to get new access tokens
  |                         |
  |-- API call + access --->|  ← Normal operation
  |<-- 200 OK --------------|
  |                         |
  |-- API call + expired -->|  ← Access token expired
  |<-- 401 Unauthorized ----|
  |                         |
  |-- Refresh endpoint ---->|  ← Use refresh token
  |<-- new access_token ----|
  |<-- new refresh_token ---|  ← Rotate refresh token too
```

### Implementation
```typescript
// Login — issue both tokens
async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const accessToken = await createAccessToken(user);   // 15 min
  const refreshToken = await createRefreshToken(user);  // 7 days

  // Store refresh token hash in DB (for revocation)
  await db.refreshTokens.create({
    userId: user.id,
    tokenHash: await hash(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
}

// Refresh — rotate both tokens
async function refresh(oldRefreshToken: string) {
  const payload = await verifyRefreshToken(oldRefreshToken);

  // Check if token exists in DB (not revoked)
  const stored = await db.refreshTokens.findOne({
    userId: payload.sub,
    tokenHash: await hash(oldRefreshToken),
  });

  if (!stored) {
    // Token reuse detected — revoke ALL user tokens
    await db.refreshTokens.deleteMany({ userId: payload.sub });
    throw new UnauthorizedError("Token reuse detected");
  }

  // Delete old, issue new (rotation)
  await db.refreshTokens.delete({ id: stored.id });

  const user = await findUserById(payload.sub);
  const newAccessToken = await createAccessToken(user);
  const newRefreshToken = await createRefreshToken(user);

  await db.refreshTokens.create({
    userId: user.id,
    tokenHash: await hash(newRefreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

---

## RS256 vs HS256

| | HS256 (Symmetric) | RS256 (Asymmetric) |
|--|---|---|
| Key | Single shared secret | Private key signs, public key verifies |
| Speed | Faster | Slower |
| Use case | Single service | Microservices, third-party verification |
| Key distribution | Secret must stay on server | Public key can be shared freely |
| Rotation | Change secret everywhere | Rotate private key, publish new public key |

### RS256 Example (Node.js)
```typescript
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";

const privateKey = await importPKCS8(process.env.JWT_PRIVATE_KEY!, "RS256");
const publicKey = await importSPKI(process.env.JWT_PUBLIC_KEY!, "RS256");

// Sign with private key
const token = await new SignJWT({ sub: userId })
  .setProtectedHeader({ alg: "RS256", kid: "key-2024" })
  .setExpirationTime("15m")
  .sign(privateKey);

// Verify with public key (can be done by any service)
const { payload } = await jwtVerify(token, publicKey);
```

---

## Claims Design

### Standard Claims (RFC 7519)
| Claim | Name | Purpose |
|-------|------|---------|
| `sub` | Subject | User ID |
| `iss` | Issuer | Who created the token ("myapp") |
| `aud` | Audience | Who the token is for ("myapp-api") |
| `exp` | Expiration | When the token expires (Unix timestamp) |
| `iat` | Issued At | When the token was created |
| `nbf` | Not Before | Token not valid before this time |
| `jti` | JWT ID | Unique token identifier (for revocation) |

### Custom Claims
```typescript
// ✅ Good — minimal claims, fetch details when needed
{
  sub: "user_123",
  role: "admin",
  org: "org_456",
}

// ❌ Bad — too much data in token
{
  sub: "user_123",
  name: "Alice Smith",
  email: "alice@example.com",
  avatar: "https://...",
  permissions: ["read", "write", "delete", "admin", ...],
  preferences: { theme: "dark", ... },
}
```

---

## Best Practices

| Practice | Why |
|----------|-----|
| Short access token expiry (5-15 min) | Limits damage from stolen tokens |
| Rotate refresh tokens on use | Detects token theft (reuse = compromise) |
| Store refresh tokens as hashes | Attacker can't use stolen DB data |
| Validate `iss` and `aud` claims | Prevents cross-service token misuse |
| Use RS256 for microservices | Services verify without shared secret |
| Never store JWTs in localStorage | XSS can steal them. Use httpOnly cookies |
| Include `jti` for revocation | Can blacklist specific tokens |
| Don't put secrets in claims | JWTs are base64-encoded, not encrypted |
| Verify algorithm in validation | Prevents `alg: "none"` attacks |
