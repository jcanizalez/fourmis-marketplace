---
description: When the user asks about observability, setting up OpenTelemetry, distributed tracing, correlating logs with traces and metrics, choosing an observability stack, or the three pillars of observability (logs, metrics, traces)
---

# Observability Setup

Guide to implementing the three pillars of observability — logs, metrics, and traces — using OpenTelemetry and modern tooling.

## The Three Pillars

```
Logs    — What happened (discrete events)
Metrics — How much / how often (aggregated numbers)
Traces  — How long / where (request flow across services)
```

### How They Work Together

```
User Request → API Gateway → Auth Service → Database
                  ↓              ↓             ↓
               trace_id: abc-123 (same across all services)
                  ↓              ↓             ↓
               Log: "request received"  Log: "auth check"  Log: "query executed"
               Metric: request_count++  Metric: auth_time  Metric: query_time
               Span: gateway (parent)   Span: auth (child)  Span: db (child)
```

**Correlation**: All three share a `trace_id`, so you can jump from a spike in metrics → to the trace → to the exact log line that shows the error.

## OpenTelemetry Setup

### Node.js — Auto-Instrumentation

```typescript
// src/instrumentation.ts — MUST be loaded before your app
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "my-api",
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || "0.0.0",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 30000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },
    }),
  ],
});

sdk.start();
process.on("SIGTERM", () => sdk.shutdown());
```

```json
// package.json — run with instrumentation
{
  "scripts": {
    "start": "node --import ./dist/instrumentation.js ./dist/main.js",
    "dev": "tsx --import ./src/instrumentation.ts ./src/main.ts"
  },
  "dependencies": {
    "@opentelemetry/sdk-node": "^0.57.0",
    "@opentelemetry/auto-instrumentations-node": "^0.55.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.57.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.57.0"
  }
}
```

### Python — Auto-Instrumentation

```python
# src/tracing.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

def configure_telemetry(service_name: str):
    resource = Resource.create({"service.name": service_name})

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter())
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Auto-instrument frameworks
    FastAPIInstrumentor.instrument()
    HTTPXClientInstrumentor().instrument()
    # SQLAlchemyInstrumentor().instrument(engine=engine)
```

```bash
# Or use zero-code instrumentation
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install  # auto-detect and install instrumentations
opentelemetry-instrument python -m my_app  # run with auto-instrumentation
```

### Go — Manual + Auto Instrumentation

```go
// internal/telemetry/telemetry.go
package telemetry

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

func Init(ctx context.Context, serviceName string) (func(), error) {
    res, _ := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName(serviceName),
        ),
    )

    exporter, err := otlptracehttp.New(ctx)
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )
    otel.SetTracerProvider(tp)

    return func() { tp.Shutdown(ctx) }, nil
}
```

## Connecting Logs to Traces

The key to observability: every log line includes the `trace_id` so you can jump from logs to traces.

### Node.js — Pino + OpenTelemetry

```typescript
import pino from "pino";
import { context, trace } from "@opentelemetry/api";

const logger = pino({
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      const ctx = span.spanContext();
      return {
        trace_id: ctx.traceId,
        span_id: ctx.spanId,
        trace_flags: ctx.traceFlags,
      };
    }
    return {};
  },
});

// Now every log line automatically includes trace_id:
// {"level":30,"msg":"processing order","trace_id":"abc123","span_id":"def456",...}
```

### Python — structlog + OpenTelemetry

```python
import structlog
from opentelemetry import trace

def add_trace_context(logger, method_name, event_dict):
    span = trace.get_current_span()
    if span.is_recording():
        ctx = span.get_span_context()
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict

structlog.configure(
    processors=[
        add_trace_context,  # Add before renderer
        structlog.processors.JSONRenderer(),
    ]
)
```

## Observability Stack — Docker Compose

Complete local setup with Grafana, Loki (logs), Tempo (traces), Prometheus (metrics):

```yaml
# docker-compose.observability.yml
services:
  # Traces
  tempo:
    image: grafana/tempo:2.7.0
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
      - tempo-data:/var/tempo
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP

  # Logs
  loki:
    image: grafana/loki:3.3.0
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki

  # Metrics
  prometheus:
    image: prom/prometheus:v3.2.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

  # Visualization
  grafana:
    image: grafana/grafana:11.5.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_FEATURE_TOGGLES_ENABLE=traceToLogs,traceToMetrics
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml

  # OpenTelemetry Collector (receives from apps, forwards to backends)
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.120.0
    command: ["--config=/etc/otel-collector.yaml"]
    volumes:
      - ./otel-collector.yaml:/etc/otel-collector.yaml
    ports:
      - "4317"    # OTLP gRPC (internal)
      - "4318"    # OTLP HTTP (internal)

volumes:
  tempo-data:
  loki-data:
  prometheus-data:
  grafana-data:
```

### OpenTelemetry Collector Config

```yaml
# otel-collector.yaml
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
    send_batch_size: 1000

exporters:
  otlphttp/tempo:
    endpoint: http://tempo:4318
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

## Custom Metrics

### Node.js

```typescript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("my-api");

// Counter — things that only go up
const requestCounter = meter.createCounter("http_requests_total", {
  description: "Total HTTP requests",
});

// Histogram — distribution of values
const requestDuration = meter.createHistogram("http_request_duration_ms", {
  description: "HTTP request duration in milliseconds",
  unit: "ms",
});

// Usage in middleware
app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const duration = performance.now() - start;
    requestCounter.add(1, { method: req.method, path: req.route?.path, status: res.statusCode });
    requestDuration.record(duration, { method: req.method, path: req.route?.path });
  });
  next();
});
```

## Checklist

### Minimum Viable Observability

- [ ] Structured JSON logging with levels (info, warn, error)
- [ ] Request ID propagated across services
- [ ] Request logging (method, path, status, duration)
- [ ] Error logging with stack traces
- [ ] Health check endpoint (`/health`)
- [ ] Basic alerting on error rate spikes

### Production Observability

- [ ] All of the above, plus:
- [ ] OpenTelemetry SDK configured
- [ ] Distributed tracing across services
- [ ] Trace ID in log lines
- [ ] Custom business metrics (signups, orders, revenue)
- [ ] Dashboards for key metrics (Grafana)
- [ ] Alerting on SLOs (latency, error rate, availability)
- [ ] Log aggregation (Loki, ELK, Datadog)
- [ ] Log retention policy configured
