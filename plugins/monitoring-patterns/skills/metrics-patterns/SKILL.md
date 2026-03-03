---
description: When the user asks about Prometheus metrics, custom metrics, counters, gauges, histograms, RED method, USE method, instrumentation, metrics middleware, or application metrics
---

# Prometheus Metrics Patterns

Instrument your services with Prometheus metrics — counters, gauges, histograms — using the RED and USE methods for comprehensive observability.

## Metric Types

| Type | Use For | Example |
|------|---------|---------|
| **Counter** | Things that only go up | Total requests, errors, bytes sent |
| **Gauge** | Values that go up and down | Active connections, queue depth, temperature |
| **Histogram** | Distribution of values | Request duration, response size |
| **Summary** | Similar to histogram, client-side quantiles | Rarely needed — prefer histograms |

## The RED Method (Request-driven)

For every service, track:
- **R**ate — requests per second
- **E**rrors — failed requests per second
- **D**uration — time per request (histogram)

## The USE Method (Resource-driven)

For every resource (CPU, memory, disk, connections), track:
- **U**tilization — percentage of resource used
- **S**aturation — work queued / waiting
- **E**rrors — error events

## Node.js — prom-client

### Setup

```typescript
// metrics.ts
import client from "prom-client";

// Collect default Node.js metrics (GC, event loop, memory)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({
  prefix: "myapp_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom registry (optional — useful for testing)
export const registry = new client.Registry();
registry.setDefaultLabels({ service: "order-api", env: process.env.NODE_ENV || "dev" });
client.collectDefaultMetrics({ register: registry });
```

### RED Metrics for HTTP

```typescript
import client from "prom-client";

// Rate + Errors
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
});

// Duration
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Request size
const httpRequestSize = new client.Histogram({
  name: "http_request_size_bytes",
  help: "HTTP request body size in bytes",
  labelNames: ["method", "route"] as const,
  buckets: [100, 1000, 10000, 100000, 1000000],
});

// Active requests (gauge)
const httpActiveRequests = new client.Gauge({
  name: "http_active_requests",
  help: "Number of active HTTP requests",
  labelNames: ["method"] as const,
});
```

### Express Metrics Middleware

```typescript
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip metrics endpoint itself
  if (req.path === "/metrics") return next();

  const route = req.route?.path || req.path;
  const method = req.method;

  httpActiveRequests.inc({ method });
  const end = httpRequestDuration.startTimer({ method, route });

  // Track request size
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 0) {
    httpRequestSize.observe({ method, route }, contentLength);
  }

  res.on("finish", () => {
    const statusCode = res.statusCode.toString();
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    end({ status_code: statusCode });
    httpActiveRequests.dec({ method });
  });

  next();
}

// Expose /metrics endpoint for Prometheus scraping
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
```

### Custom Business Metrics

```typescript
// Orders
const ordersCreated = new client.Counter({
  name: "orders_created_total",
  help: "Total orders created",
  labelNames: ["payment_method", "currency"] as const,
});

const orderAmount = new client.Histogram({
  name: "order_amount_dollars",
  help: "Order amount in dollars",
  buckets: [10, 25, 50, 100, 250, 500, 1000, 5000],
});

const activeOrders = new client.Gauge({
  name: "orders_active",
  help: "Number of orders being processed",
});

// Queue metrics
const queueDepth = new client.Gauge({
  name: "queue_depth",
  help: "Number of items in the processing queue",
  labelNames: ["queue_name"] as const,
});

const queueProcessingDuration = new client.Histogram({
  name: "queue_processing_duration_seconds",
  help: "Time to process a queue item",
  labelNames: ["queue_name"] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

// Usage
async function createOrder(order: Order) {
  activeOrders.inc();
  try {
    const result = await processOrder(order);
    ordersCreated.inc({ payment_method: order.paymentMethod, currency: order.currency });
    orderAmount.observe(order.amount);
    return result;
  } finally {
    activeOrders.dec();
  }
}
```

## Go — prometheus/client_golang

### Setup

```go
package metrics

import (
    "net/http"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    // RED metrics
    HTTPRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Namespace: "myapp",
            Name:      "http_requests_total",
            Help:      "Total HTTP requests",
        },
        []string{"method", "route", "status_code"},
    )

    HTTPRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Namespace: "myapp",
            Name:      "http_request_duration_seconds",
            Help:      "HTTP request duration in seconds",
            Buckets:   []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
        },
        []string{"method", "route", "status_code"},
    )

    HTTPActiveRequests = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Namespace: "myapp",
            Name:      "http_active_requests",
            Help:      "Active HTTP requests",
        },
        []string{"method"},
    )

    // Business metrics
    OrdersCreated = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Namespace: "myapp",
            Name:      "orders_created_total",
            Help:      "Total orders created",
        },
        []string{"payment_method"},
    )
)
```

### Go HTTP Metrics Middleware

```go
func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.URL.Path == "/metrics" {
            next.ServeHTTP(w, r)
            return
        }

        route := r.URL.Path
        method := r.Method

        HTTPActiveRequests.WithLabelValues(method).Inc()
        start := time.Now()

        lrw := &statusRecorder{ResponseWriter: w, statusCode: 200}
        next.ServeHTTP(lrw, r)

        duration := time.Since(start).Seconds()
        status := strconv.Itoa(lrw.statusCode)

        HTTPRequestsTotal.WithLabelValues(method, route, status).Inc()
        HTTPRequestDuration.WithLabelValues(method, route, status).Observe(duration)
        HTTPActiveRequests.WithLabelValues(method).Dec()
    })
}

type statusRecorder struct {
    http.ResponseWriter
    statusCode int
}

func (r *statusRecorder) WriteHeader(code int) {
    r.statusCode = code
    r.ResponseWriter.WriteHeader(code)
}

// Expose metrics endpoint
mux.Handle("GET /metrics", promhttp.Handler())
```

## Database Metrics

```typescript
// Track database query performance
const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration",
  labelNames: ["operation", "table"] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

const dbConnectionPool = new client.Gauge({
  name: "db_connection_pool_size",
  help: "Database connection pool size",
  labelNames: ["state"] as const, // active, idle, waiting
});

const dbErrors = new client.Counter({
  name: "db_errors_total",
  help: "Database errors",
  labelNames: ["operation", "error_type"] as const,
});

// Wrapper for instrumented queries
async function instrumentedQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const end = dbQueryDuration.startTimer({ operation, table });
  try {
    const result = await queryFn();
    end();
    return result;
  } catch (err) {
    end();
    dbErrors.inc({ operation, error_type: err.code || "unknown" });
    throw err;
  }
}

// Usage
const users = await instrumentedQuery("select", "users", () =>
  db.query("SELECT * FROM users WHERE id = $1", [userId])
);
```

## External Service Metrics

```typescript
// Track calls to external APIs
const externalRequestDuration = new client.Histogram({
  name: "external_request_duration_seconds",
  help: "External API request duration",
  labelNames: ["service", "method", "status"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
});

const externalRequestsTotal = new client.Counter({
  name: "external_requests_total",
  help: "Total external API requests",
  labelNames: ["service", "method", "status"] as const,
});

const circuitBreakerState = new client.Gauge({
  name: "circuit_breaker_state",
  help: "Circuit breaker state (0=closed, 1=half-open, 2=open)",
  labelNames: ["service"] as const,
});
```

## Prometheus Scrape Config

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "order-api"
    static_configs:
      - targets: ["order-api:3000"]
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: "payment-service"
    static_configs:
      - targets: ["payment-service:8080"]

  # Kubernetes service discovery
  - job_name: "kubernetes-pods"
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

## Label Best Practices

```typescript
// ✅ DO: Low-cardinality labels (finite set of values)
httpRequestsTotal.inc({ method: "GET", route: "/api/orders", status_code: "200" });

// ❌ DON'T: High-cardinality labels (unique per request)
httpRequestsTotal.inc({ userId: "user-123", orderId: "ord-456" }); // EXPLODES metrics

// ✅ DO: Use route patterns, not actual URLs
// route: "/api/orders/:id"  ✅
// route: "/api/orders/456"  ❌

// ✅ DO: Bucket status codes
// status_code: "2xx" or "200" ✅ (choose one convention)
// status_code: "200", "201", "204" ✅ (fine — bounded set)

// ❌ DON'T: Put error messages in labels
// error: "connection refused to 10.0.0.5:5432" ❌ (unbounded)
// error_type: "connection_refused" ✅ (bounded)
```
