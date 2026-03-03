---
description: When the user asks about distributed tracing, OpenTelemetry, trace context, spans, Jaeger, Tempo, trace propagation, sampling strategies, or request tracing across services
---

# Distributed Tracing Patterns

Trace requests across service boundaries with OpenTelemetry. Covers SDK setup, auto-instrumentation, manual spans, context propagation, sampling, and integration with Jaeger and Grafana Tempo.

## How Distributed Tracing Works

```
Client Request
    │
    ▼ trace_id: abc-123
┌──────────┐  span: api-gateway
│ API      │  parent: none
│ Gateway  │
└────┬─────┘
     │ propagate trace_id + span_id via headers
     ▼
┌──────────┐  span: order-service
│ Order    │  parent: api-gateway
│ Service  │
└──┬────┬──┘
   │    │
   ▼    ▼
┌─────┐ ┌──────────┐  span: payment-service
│ DB  │ │ Payment  │  parent: order-service
│     │ │ Service  │
└─────┘ └──────────┘

Trace: abc-123
├── api-gateway (200ms)
│   └── order-service (150ms)
│       ├── db.query (10ms)
│       └── payment-service (120ms)
```

## Node.js — OpenTelemetry Setup

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

### SDK Initialization (Must Run Before App Code)

```typescript
// tracing.ts — import this FIRST in your entry point
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || "order-api",
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || "1.0.0",
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || "development",
  }),

  // Trace exporter — sends to OTLP collector (Jaeger, Tempo, etc.)
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
  }),

  // Metric exporter (optional — if also sending metrics via OTLP)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 30000,
  }),

  // Auto-instrument common libraries
  instrumentations: [
    getNodeAutoInstrumentations({
      // Customize which auto-instrumentations to enable
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) =>
          req.url === "/health" || req.url === "/ready" || req.url === "/metrics",
      },
      "@opentelemetry/instrumentation-express": { enabled: true },
      "@opentelemetry/instrumentation-pg": { enabled: true },
      "@opentelemetry/instrumentation-redis-4": { enabled: true },
      "@opentelemetry/instrumentation-fs": { enabled: false }, // noisy
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

### Entry Point

```typescript
// index.ts
import "./tracing"; // MUST be first import
import express from "express";
import { app } from "./app";

app.listen(3000);
```

### Manual Spans

```typescript
import { trace, SpanStatusCode, SpanKind } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service");

async function createOrder(orderData: OrderInput): Promise<Order> {
  // Create a span for this operation
  return tracer.startActiveSpan("createOrder", async (span) => {
    try {
      // Add attributes (searchable metadata)
      span.setAttribute("order.customer_id", orderData.customerId);
      span.setAttribute("order.items_count", orderData.items.length);
      span.setAttribute("order.total", orderData.total);

      // Validate
      const validated = await tracer.startActiveSpan("validateOrder", async (validateSpan) => {
        const result = await validateOrderData(orderData);
        validateSpan.setAttribute("validation.passed", result.valid);
        if (!result.valid) {
          validateSpan.addEvent("validation_failed", { errors: JSON.stringify(result.errors) });
        }
        validateSpan.end();
        return result;
      });

      if (!validated.valid) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Validation failed" });
        throw new Error("Invalid order data");
      }

      // Save to database (auto-instrumented by pg instrumentation)
      const order = await saveOrder(orderData);
      span.setAttribute("order.id", order.id);

      // Add event (timestamped log within the span)
      span.addEvent("order_created", {
        orderId: order.id,
        total: order.total,
      });

      // Call payment service (HTTP auto-instrumented, trace context propagated)
      const payment = await processPayment(order);
      span.addEvent("payment_processed", { paymentId: payment.id });

      span.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (err) {
      // Record error on span
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Context Propagation (Manual)

```typescript
import { context, propagation } from "@opentelemetry/api";

// Inject trace context into outgoing HTTP headers
async function callDownstream(url: string, body: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Inject W3C Trace Context headers (traceparent, tracestate)
  propagation.inject(context.active(), headers);

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

// Extract trace context from incoming request (usually auto-handled)
function extractContext(req: Request) {
  return propagation.extract(context.active(), req.headers);
}
```

## Go — OpenTelemetry Setup

### Installation

```bash
go get go.opentelemetry.io/otel \
  go.opentelemetry.io/otel/sdk/trace \
  go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp \
  go.opentelemetry.io/otel/propagation \
  go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

### SDK Initialization

```go
package tracing

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func InitTracer(ctx context.Context, serviceName, version string) (func(), error) {
    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpointURL(
            envOrDefault("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("creating exporter: %w", err)
    }

    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(serviceName),
            semconv.ServiceVersionKey.String(version),
            semconv.DeploymentEnvironmentKey.String(envOrDefault("ENV", "development")),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("creating resource: %w", err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter,
            sdktrace.WithBatchTimeout(5*time.Second),
            sdktrace.WithMaxExportBatchSize(512),
        ),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))), // 10% sampling
    )

    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    cleanup := func() {
        ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()
        _ = tp.Shutdown(ctx)
    }

    return cleanup, nil
}
```

### Go Manual Spans

```go
package orders

import (
    "context"
    "fmt"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("order-service")

func CreateOrder(ctx context.Context, input OrderInput) (*Order, error) {
    ctx, span := tracer.Start(ctx, "CreateOrder",
        trace.WithAttributes(
            attribute.String("order.customer_id", input.CustomerID),
            attribute.Int("order.items_count", len(input.Items)),
            attribute.Float64("order.total", input.Total),
        ),
    )
    defer span.End()

    // Validate
    if err := validateOrder(ctx, input); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "validation failed")
        return nil, fmt.Errorf("validation: %w", err)
    }

    // Save (SQL auto-instrumented or manual span)
    order, err := saveOrder(ctx, input)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "save failed")
        return nil, fmt.Errorf("saving order: %w", err)
    }

    span.SetAttributes(attribute.String("order.id", order.ID))
    span.AddEvent("order_created", trace.WithAttributes(
        attribute.String("orderId", order.ID),
    ))

    // Call payment service (context propagation automatic with otelhttp)
    if err := processPayment(ctx, order); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "payment failed")
        return nil, fmt.Errorf("payment: %w", err)
    }

    span.SetStatus(codes.Ok, "")
    return order, nil
}
```

### Go HTTP Instrumentation

```go
import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

// Instrument incoming requests
mux := http.NewServeMux()
mux.HandleFunc("POST /orders", createOrderHandler)

handler := otelhttp.NewHandler(mux, "http-server",
    otelhttp.WithFilter(func(r *http.Request) bool {
        // Skip health checks
        return r.URL.Path != "/health" && r.URL.Path != "/ready"
    }),
)

// Instrument outgoing HTTP clients
httpClient := &http.Client{
    Transport: otelhttp.NewTransport(http.DefaultTransport),
}
```

## Sampling Strategies

| Strategy | Use When | Config |
|----------|----------|--------|
| **Always On** | Dev/staging, low traffic | `AlwaysOnSampler()` |
| **Always Off** | Disabled tracing | `AlwaysOffSampler()` |
| **Ratio-based** | Production, cost control | `TraceIDRatioBased(0.1)` → 10% |
| **Parent-based** | Respect upstream decision | `ParentBased(TraceIDRatioBased(0.1))` |
| **Rate-limiting** | Fixed traces/second | Custom or tail-based |

```typescript
// Recommended production setup: parent-based with ratio fallback
import { ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";

const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1), // 10% of new traces
  // If parent says "sample", we sample. If parent says "don't sample", we don't.
});
```

## Collector Architecture

```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel/config.yaml"]
    ports:
      - "4317:4317"   # gRPC
      - "4318:4318"   # HTTP
    volumes:
      - ./otel-config.yaml:/etc/otel/config.yaml

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # UI
      - "4317"        # OTLP gRPC

  # OR Grafana Tempo
  tempo:
    image: grafana/tempo:latest
    ports:
      - "4317"
      - "3200:3200"   # Tempo API
```

### Collector Config

```yaml
# otel-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
  # Drop health check spans
  filter:
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/ready"'

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter, batch]
      exporters: [otlp/jaeger]
```

## Connecting Traces to Logs

```typescript
import { trace } from "@opentelemetry/api";

// Add trace context to log lines
function getLogContext() {
  const span = trace.getActiveSpan();
  if (!span) return {};

  const ctx = span.spanContext();
  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    traceFlags: ctx.traceFlags,
  };
}

// Usage with Pino
const log = logger.child(getLogContext());
log.info({ orderId }, "order created");
// Output: {"traceId":"abc123","spanId":"def456","orderId":"ord-789","msg":"order created"}
```

## Best Practices

| Practice | Why |
|----------|-----|
| Initialize tracing before any imports | Auto-instrumentation patches libraries at import time |
| Use `startActiveSpan` not just `startSpan` | Active span sets context for child spans |
| Always `span.end()` (use try/finally) | Unclosed spans leak memory and break traces |
| Add business attributes to spans | Makes traces searchable (`order.id`, `customer.tier`) |
| Use events for important checkpoints | Timestamped within span, visible in trace UI |
| Set meaningful span names | `createOrder` not `handler` or `function` |
| Record errors with `recordException` | Shows stack trace in trace UI |
| Use parent-based sampling in production | Respects upstream sampling decisions |
| Filter out health checks | Noise in traces, wastes storage |
