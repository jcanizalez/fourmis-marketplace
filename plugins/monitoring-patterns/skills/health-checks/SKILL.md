---
description: When the user asks about health checks, readiness probes, liveness probes, Kubernetes probes, health endpoints, dependency checks, graceful degradation, or service health monitoring
---

# Health Check Patterns

Implement proper health, readiness, and liveness endpoints for production services. Covers HTTP health checks, dependency verification, Kubernetes probes, and graceful degradation.

## Three Types of Health Checks

| Check | Purpose | Fails When | K8s Probe |
|-------|---------|------------|-----------|
| **Health** (`/health`) | Is the process alive? | Process is hung/crashed | Liveness |
| **Ready** (`/ready`) | Can it serve traffic? | Dependencies down, still warming up | Readiness |
| **Startup** (`/startup`) | Has it finished initializing? | Still loading config, caches, etc. | Startup |

```
                    Load Balancer
                         │
                    ┌────▼────┐
                    │ /ready? │ ← Only routes if ready
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
          ┌──────┐  ┌──────┐  ┌──────┐
          │Pod 1 │  │Pod 2 │  │Pod 3 │
          │ready ✅│  │ready ✅│  │not   │ ← /ready returns 503
          └──────┘  └──────┘  │ready ❌│   (removed from LB)
                              └──────┘
```

## Node.js — Express Health Checks

### Basic Implementation

```typescript
// health.ts
interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  checks: Record<string, CheckResult>;
}

interface CheckResult {
  status: "pass" | "fail" | "warn";
  duration_ms: number;
  message?: string;
}

type HealthChecker = () => Promise<CheckResult>;

class HealthService {
  private checks = new Map<string, HealthChecker>();

  register(name: string, checker: HealthChecker) {
    this.checks.set(name, checker);
  }

  async check(): Promise<HealthStatus> {
    const results: Record<string, CheckResult> = {};
    const startTime = process.hrtime.bigint();

    await Promise.all(
      Array.from(this.checks.entries()).map(async ([name, checker]) => {
        const start = Date.now();
        try {
          const result = await Promise.race([
            checker(),
            new Promise<CheckResult>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 5000)
            ),
          ]);
          results[name] = { ...result, duration_ms: Date.now() - start };
        } catch (err) {
          results[name] = {
            status: "fail",
            duration_ms: Date.now() - start,
            message: err instanceof Error ? err.message : "unknown error",
          };
        }
      })
    );

    const allPassed = Object.values(results).every((r) => r.status === "pass");
    const anyFailed = Object.values(results).some((r) => r.status === "fail");

    return {
      status: anyFailed ? "unhealthy" : allPassed ? "healthy" : "degraded",
      version: process.env.APP_VERSION || "unknown",
      uptime: process.uptime(),
      checks: results,
    };
  }
}

export const healthService = new HealthService();
```

### Dependency Checkers

```typescript
// checks/database.ts
import { Pool } from "pg";

export function createDatabaseCheck(pool: Pool): HealthChecker {
  return async () => {
    try {
      const result = await pool.query("SELECT 1 as ok");
      const poolInfo = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      };
      return {
        status: poolInfo.waiting > 5 ? "warn" : "pass",
        message: `pool: ${poolInfo.total} total, ${poolInfo.idle} idle, ${poolInfo.waiting} waiting`,
      };
    } catch (err) {
      return {
        status: "fail",
        message: err instanceof Error ? err.message : "connection failed",
      };
    }
  };
}

// checks/redis.ts
import { Redis } from "ioredis";

export function createRedisCheck(redis: Redis): HealthChecker {
  return async () => {
    try {
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;
      return {
        status: latency > 100 ? "warn" : "pass",
        message: `ping: ${latency}ms`,
      };
    } catch (err) {
      return { status: "fail", message: "redis unreachable" };
    }
  };
}

// checks/external-api.ts
export function createExternalAPICheck(url: string, name: string): HealthChecker {
  return async () => {
    try {
      const start = Date.now();
      const res = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });
      const latency = Date.now() - start;
      if (!res.ok) {
        return { status: "warn", message: `${name} returned ${res.status}` };
      }
      return {
        status: latency > 2000 ? "warn" : "pass",
        message: `${name}: ${latency}ms`,
      };
    } catch {
      return { status: "fail", message: `${name} unreachable` };
    }
  };
}
```

### Express Routes

```typescript
// routes/health.ts
import { Router } from "express";

const router = Router();

// Liveness: is the process alive? (lightweight, no dependency checks)
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness: can it serve traffic? (checks all dependencies)
router.get("/ready", async (req, res) => {
  const health = await healthService.check();
  const statusCode = health.status === "unhealthy" ? 503 : 200;

  res.status(statusCode).json(health);
});

// Detailed health (protected, for debugging)
router.get("/health/detailed", authMiddleware, async (req, res) => {
  const health = await healthService.check();
  res.json(health);
});

export default router;
```

### Registration

```typescript
// app.ts
import { healthService } from "./health";
import { createDatabaseCheck } from "./checks/database";
import { createRedisCheck } from "./checks/redis";

// Register dependency checks
healthService.register("database", createDatabaseCheck(pgPool));
healthService.register("redis", createRedisCheck(redisClient));
healthService.register("payment-api", createExternalAPICheck(
  "https://api.stripe.com/v1",
  "Stripe API"
));

app.use(healthRouter);
```

## Go — Health Check Server

```go
package health

import (
    "context"
    "encoding/json"
    "net/http"
    "sync"
    "time"
)

type Status string

const (
    StatusPass Status = "pass"
    StatusFail Status = "fail"
    StatusWarn Status = "warn"
)

type CheckResult struct {
    Status     Status `json:"status"`
    DurationMs int64  `json:"duration_ms"`
    Message    string `json:"message,omitempty"`
}

type Checker func(ctx context.Context) CheckResult

type HealthResponse struct {
    Status  string                 `json:"status"`
    Version string                 `json:"version"`
    Uptime  string                 `json:"uptime"`
    Checks  map[string]CheckResult `json:"checks"`
}

type Service struct {
    mu       sync.RWMutex
    checks   map[string]Checker
    started  time.Time
    version  string
}

func New(version string) *Service {
    return &Service{
        checks:  make(map[string]Checker),
        started: time.Now(),
        version: version,
    }
}

func (s *Service) Register(name string, checker Checker) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.checks[name] = checker
}

func (s *Service) Check(ctx context.Context) HealthResponse {
    s.mu.RLock()
    defer s.mu.RUnlock()

    results := make(map[string]CheckResult)
    var wg sync.WaitGroup

    var mu sync.Mutex
    for name, checker := range s.checks {
        wg.Add(1)
        go func(n string, c Checker) {
            defer wg.Done()
            checkCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
            defer cancel()

            start := time.Now()
            result := c(checkCtx)
            result.DurationMs = time.Since(start).Milliseconds()

            mu.Lock()
            results[n] = result
            mu.Unlock()
        }(name, checker)
    }
    wg.Wait()

    status := "healthy"
    for _, r := range results {
        if r.Status == StatusFail {
            status = "unhealthy"
            break
        }
        if r.Status == StatusWarn {
            status = "degraded"
        }
    }

    return HealthResponse{
        Status:  status,
        Version: s.version,
        Uptime:  time.Since(s.started).String(),
        Checks:  results,
    }
}

// HTTP handlers
func (s *Service) LivenessHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
            "status": "ok",
            "uptime": time.Since(s.started).String(),
        })
    }
}

func (s *Service) ReadinessHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        result := s.Check(r.Context())
        w.Header().Set("Content-Type", "application/json")
        if result.Status == "unhealthy" {
            w.WriteHeader(http.StatusServiceUnavailable)
        }
        json.NewEncoder(w).Encode(result)
    }
}
```

### Go Dependency Checkers

```go
// Database check
func DatabaseCheck(db *sql.DB) Checker {
    return func(ctx context.Context) CheckResult {
        if err := db.PingContext(ctx); err != nil {
            return CheckResult{Status: StatusFail, Message: err.Error()}
        }
        stats := db.Stats()
        msg := fmt.Sprintf("open: %d, idle: %d, in-use: %d",
            stats.OpenConnections, stats.Idle, stats.InUse)
        if stats.WaitCount > 0 {
            return CheckResult{Status: StatusWarn, Message: msg + fmt.Sprintf(", waiting: %d", stats.WaitCount)}
        }
        return CheckResult{Status: StatusPass, Message: msg}
    }
}

// Redis check
func RedisCheck(client *redis.Client) Checker {
    return func(ctx context.Context) CheckResult {
        start := time.Now()
        if err := client.Ping(ctx).Err(); err != nil {
            return CheckResult{Status: StatusFail, Message: err.Error()}
        }
        latency := time.Since(start)
        status := StatusPass
        if latency > 100*time.Millisecond {
            status = StatusWarn
        }
        return CheckResult{Status: status, Message: fmt.Sprintf("ping: %s", latency)}
    }
}
```

## Kubernetes Probe Configuration

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          ports:
            - containerPort: 3000
          # Startup probe — give slow-starting apps time to initialize
          startupProbe:
            httpGet:
              path: /health
              port: 3000
            failureThreshold: 30     # 30 × 10s = 5 minutes max startup time
            periodSeconds: 10

          # Liveness probe — restart if hung
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 0   # Startup probe handles delay
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3      # 3 failures = restart

          # Readiness probe — remove from service if not ready
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3      # 3 failures = stop sending traffic
            successThreshold: 1      # 1 success = resume traffic
```

## Graceful Degradation

```typescript
// When a non-critical dependency fails, degrade gracefully
router.get("/ready", async (req, res) => {
  const health = await healthService.check();

  // Critical dependencies — service CANNOT function without these
  const criticalDeps = ["database"];
  const criticalFailed = criticalDeps.some(
    (dep) => health.checks[dep]?.status === "fail"
  );

  if (criticalFailed) {
    // 503: remove from load balancer
    return res.status(503).json(health);
  }

  // Non-critical dependencies — service CAN function without these (degraded)
  // e.g., cache (Redis), analytics, email service
  // Return 200 but with "degraded" status so dashboards show the issue
  res.status(200).json(health);
});
```

## Health Check Response Format (RFC Draft)

```json
{
  "status": "degraded",
  "version": "1.2.3",
  "uptime": 86400.5,
  "checks": {
    "database": {
      "status": "pass",
      "duration_ms": 3,
      "message": "pool: 10 total, 7 idle, 0 waiting"
    },
    "redis": {
      "status": "warn",
      "duration_ms": 152,
      "message": "ping: 152ms (high latency)"
    },
    "payment-api": {
      "status": "fail",
      "duration_ms": 5000,
      "message": "timeout after 5000ms"
    }
  }
}
```

## Best Practices

| Rule | Why |
|------|-----|
| `/health` must be lightweight | K8s calls it every 15s — no DB queries |
| `/ready` checks all dependencies | Used for load balancing decisions |
| Set proper timeouts on probes | A 30s timeout blocks pod scheduling |
| Don't check non-critical deps in `/ready` | Redis being slow shouldn't remove pods from service |
| Include version in response | Helps verify deployments rolled out |
| Protect `/health/detailed` | Don't expose internals publicly |
| Use startup probes for slow apps | Prevents premature liveness failures during init |
