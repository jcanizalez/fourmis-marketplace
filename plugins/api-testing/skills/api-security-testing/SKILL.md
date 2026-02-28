# API Security Testing

Test APIs for common security vulnerabilities: authentication bypass, injection attacks, rate limiting, CORS misconfiguration, and data exposure.

## Authentication & Authorization Tests

### JWT / Bearer Token Tests

```typescript
describe('Authentication', () => {
  it('rejects requests without token', async () => {
    await request()
      .get('/api/protected')
      .expect(401);
  });

  it('rejects expired tokens', async () => {
    const expiredToken = generateToken({ userId: '1', exp: Math.floor(Date.now() / 1000) - 3600 });
    await request()
      .get('/api/protected')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('rejects malformed tokens', async () => {
    await request()
      .get('/api/protected')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .expect(401);
  });

  it('rejects tokens with invalid signature', async () => {
    const tamperedToken = validToken.slice(0, -5) + 'XXXXX';
    await request()
      .get('/api/protected')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .expect(401);
  });

  it('accepts valid tokens', async () => {
    const token = generateToken({ userId: '1', role: 'user' });
    await request()
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

### Authorization (RBAC) Tests

```typescript
describe('Authorization', () => {
  it('regular users cannot access admin endpoints', async () => {
    const userToken = generateToken({ userId: '1', role: 'user' });
    await request()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('users cannot modify other users resources', async () => {
    const user1Token = generateToken({ userId: '1', role: 'user' });
    await request()
      .put('/api/users/2/profile')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Hacked' })
      .expect(403);
  });

  it('admin can access admin endpoints', async () => {
    const adminToken = generateToken({ userId: '1', role: 'admin' });
    await request()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
```

## Injection Attack Tests

### SQL Injection

```typescript
describe('SQL Injection Prevention', () => {
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "1; SELECT * FROM passwords",
    "' UNION SELECT username, password FROM users --",
    "admin'--",
  ];

  sqlPayloads.forEach(payload => {
    it(`rejects SQL injection: ${payload.slice(0, 30)}...`, async () => {
      const res = await request()
        .get(`/api/users?search=${encodeURIComponent(payload)}`)
        .expect((res) => {
          // Should either reject (400) or return safe results (200)
          // Should NEVER return a 500 (indicates unhandled SQL error)
          expect(res.status).not.toBe(500);
        });
    });
  });
});
```

### NoSQL Injection

```typescript
describe('NoSQL Injection Prevention', () => {
  it('rejects operator injection in JSON body', async () => {
    await request()
      .post('/api/login')
      .send({
        email: { $gt: '' },
        password: { $gt: '' },
      })
      .expect(400);
  });

  it('rejects $where injection', async () => {
    await request()
      .get('/api/users')
      .query({ $where: 'this.role === "admin"' })
      .expect(400);
  });
});
```

### XSS Prevention

```typescript
describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '"><script>document.cookie</script>',
    "javascript:alert('xss')",
  ];

  xssPayloads.forEach(payload => {
    it(`sanitizes XSS in user input: ${payload.slice(0, 25)}...`, async () => {
      const res = await request()
        .post('/api/comments')
        .send({ body: payload })
        .expect(201);

      // Response should contain escaped/sanitized content
      expect(res.body.body).not.toContain('<script>');
      expect(res.body.body).not.toContain('onerror');
    });
  });
});
```

## Rate Limiting Tests

```typescript
describe('Rate Limiting', () => {
  it('allows requests within rate limit', async () => {
    for (let i = 0; i < 10; i++) {
      await request().get('/api/users').expect(200);
    }
  });

  it('returns 429 when rate limit exceeded', async () => {
    // Send requests rapidly until rate limited
    let rateLimited = false;
    for (let i = 0; i < 200; i++) {
      const res = await request().get('/api/users');
      if (res.status === 429) {
        rateLimited = true;
        expect(res.headers['retry-after']).toBeDefined();
        break;
      }
    }
    expect(rateLimited).toBe(true);
  });

  it('includes rate limit headers', async () => {
    const res = await request().get('/api/users').expect(200);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});
```

## CORS Tests

```typescript
describe('CORS', () => {
  it('allows requests from permitted origins', async () => {
    const res = await request()
      .options('/api/users')
      .set('Origin', 'https://myapp.com')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('https://myapp.com');
  });

  it('blocks requests from unknown origins', async () => {
    const res = await request()
      .options('/api/users')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.com');
  });

  it('does not expose sensitive headers', async () => {
    const res = await request()
      .get('/api/users')
      .set('Origin', 'https://myapp.com');

    // Should not expose internal headers
    const exposed = res.headers['access-control-expose-headers'] || '';
    expect(exposed).not.toContain('X-Internal');
  });
});
```

## Security Headers Tests

```typescript
describe('Security Headers', () => {
  it('includes security headers', async () => {
    const res = await request().get('/api/users').expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('does not expose server information', async () => {
    const res = await request().get('/api/users');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['server']).not.toContain('Express');
  });
});
```

## Data Exposure Tests

```typescript
describe('Data Exposure Prevention', () => {
  it('does not leak password hashes', async () => {
    const res = await request().get('/api/users').expect(200);

    res.body.data.forEach((user: any) => {
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('salt');
    });
  });

  it('does not leak internal IDs or tokens', async () => {
    const res = await request().get('/api/users').expect(200);

    res.body.data.forEach((user: any) => {
      expect(user).not.toHaveProperty('_id'); // MongoDB internal
      expect(user).not.toHaveProperty('refreshToken');
      expect(user).not.toHaveProperty('apiKey');
    });
  });

  it('does not include stack traces in production errors', async () => {
    const res = await request()
      .get('/api/nonexistent')
      .expect(404);

    expect(res.body).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toContain('at Object');
    expect(JSON.stringify(res.body)).not.toContain('.ts:');
  });
});
```

## Security Testing Checklist

1. [ ] All endpoints require authentication (except public ones)
2. [ ] RBAC enforced — users can only access their own resources
3. [ ] SQL/NoSQL injection payloads are safely handled (no 500s)
4. [ ] XSS payloads are sanitized in stored content
5. [ ] Rate limiting is active on all endpoints
6. [ ] CORS only allows expected origins
7. [ ] Security headers present (X-Content-Type-Options, X-Frame-Options, HSTS)
8. [ ] No sensitive data leaked in responses (passwords, tokens, internal IDs)
9. [ ] Error responses don't include stack traces
10. [ ] Server info headers removed (X-Powered-By, Server)
