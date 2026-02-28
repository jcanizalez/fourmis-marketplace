# Performance Monitoring

Set up real-user monitoring (RUM), synthetic testing, and CI performance budgets to catch regressions before they reach production.

## Real User Monitoring (RUM)

Measure actual performance from real users in the field:

### web-vitals Library

```typescript
// src/lib/analytics.ts
import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from 'web-vitals';

function sendMetric(metric: Metric) {
  // Send to your analytics endpoint
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,     // "good" | "needs-improvement" | "poor"
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
  });

  // Use sendBeacon for reliable delivery (even on page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body);
  } else {
    fetch('/api/vitals', { body, method: 'POST', keepalive: true });
  }
}

// Register all metrics
onLCP(sendMetric);
onINP(sendMetric);
onCLS(sendMetric);
onFCP(sendMetric);
onTTFB(sendMetric);
```

### Next.js Built-in Reporting

```typescript
// app/layout.tsx — Next.js Web Vitals reporting
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric); // or send to analytics
    // metric: { id, name, startTime, value, label }
  });
  return null;
}
```

### Performance Observer API

```typescript
// Custom performance observation
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.entryType}: ${entry.name} — ${entry.duration.toFixed(0)}ms`);
  }
});

// Observe different entry types
observer.observe({ type: 'largest-contentful-paint', buffered: true });
observer.observe({ type: 'layout-shift', buffered: true });
observer.observe({ type: 'long-animation-frame', buffered: true });
observer.observe({ type: 'resource', buffered: true });
observer.observe({ type: 'navigation', buffered: true });
```

### Long Tasks / Long Animation Frames

```typescript
// Detect main thread blocking (tasks > 50ms)
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 100) {
      console.warn(`Long animation frame: ${entry.duration.toFixed(0)}ms`, {
        scripts: entry.scripts?.map(s => ({
          sourceURL: s.sourceURL,
          functionName: s.functionName,
          duration: s.duration,
        })),
      });
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

## Lighthouse CI

Automated Lighthouse audits in CI/CD to prevent performance regressions:

### Setup

```bash
npm install -D @lhci/cli
```

### Configuration

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000",
        "http://localhost:3000/products",
        "http://localhost:3000/about"
      ],
      "numberOfRuns": 3,
      "startServerCommand": "npm run start",
      "startServerReadyPattern": "listening on"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "total-byte-weight": ["warning", { "maxNumericValue": 500000 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### GitHub Actions Integration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: .lighthouserc.json
          uploadArtifacts: true
```

## Size Budget CI Check

```yaml
# package.json
{
  "scripts": {
    "size": "size-limit"
  },
  "size-limit": [
    { "path": "dist/**/*.js", "limit": "100 KB", "gzip": true },
    { "path": "dist/**/*.css", "limit": "30 KB", "gzip": true }
  ]
}
```

```yaml
# GitHub Actions — fail PR if bundle exceeds budget
- name: Check bundle size
  run: npx size-limit
```

## Server Timing Headers

Expose server-side performance data to the browser:

```typescript
// Express middleware
function serverTiming(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  // Track database query time
  const dbStart = performance.now();
  // ... query ...
  const dbDuration = performance.now() - dbStart;

  const totalDuration = performance.now() - start;

  res.set('Server-Timing', [
    `total;dur=${totalDuration.toFixed(1)};desc="Total"`,
    `db;dur=${dbDuration.toFixed(1)};desc="Database"`,
    `cache;desc="MISS"`,
  ].join(', '));

  next();
}

// Visible in Chrome DevTools → Network → Timing tab
```

## Custom Metrics Dashboard

### Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| LCP (p75) | web-vitals RUM | > 2.5s |
| INP (p75) | web-vitals RUM | > 200ms |
| CLS (p75) | web-vitals RUM | > 0.1 |
| TTFB (p75) | web-vitals RUM | > 800ms |
| Error rate | Error tracking | > 1% |
| JS bundle size | CI build | > 100 KB gzip |
| Lighthouse score | Lighthouse CI | < 90 |
| Cache hit rate | CDN dashboard | < 80% |

### Alerting Strategy

```
p75 LCP > 3s for 10 min     → Alert (degraded experience)
p75 INP > 300ms for 10 min  → Alert (unresponsive UI)
p75 CLS > 0.2 for 10 min    → Alert (visual instability)
Error rate > 2% for 5 min   → Critical alert
Bundle size increased > 20%  → CI failure (prevent merge)
```

## Chrome DevTools Performance Workflow

### Recording a Performance Trace

1. Open DevTools → **Performance** tab
2. Check ☑ **Screenshots** and ☑ **Web Vitals**
3. Click **⏺ Record** → **Reload page** → **⏹ Stop**
4. Analyze:

| Section | What to Look For |
|---------|-----------------|
| **Timings** | LCP, FCP markers — are they within budget? |
| **Web Vitals** | CLS events (red markers) — what shifted? |
| **Main thread** | Long tasks (red bars) — what's blocking? |
| **Network** | Waterfall — are resources loaded efficiently? |
| **Flame chart** | Expensive functions — where's the time spent? |
| **Bottom-Up** | Sort by "Self Time" — find the hotspots |

### Using Performance Insights Panel

1. Open DevTools → **Performance Insights** (or More tools)
2. Click **Record** → Reload → **Stop**
3. Review auto-detected insights:
   - Render-blocking resources
   - Layout shifts (with screenshots)
   - Long tasks
   - LCP breakdown

## Monitoring Checklist

1. [ ] web-vitals library installed and reporting to analytics
2. [ ] Lighthouse CI running on every PR
3. [ ] Bundle size budget enforced in CI (size-limit)
4. [ ] Performance regression alerts set up (LCP, INP, CLS thresholds)
5. [ ] Server-Timing headers exposing backend metrics
6. [ ] CDN cache hit rate monitored
7. [ ] Error rate tracking (Sentry, LogRocket, etc.)
8. [ ] Weekly performance review of p75 Core Web Vitals
9. [ ] Real device testing (not just fast laptops)
10. [ ] Performance budget documented and shared with team
