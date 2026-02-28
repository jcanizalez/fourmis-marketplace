# Core Web Vitals

Measure and optimize the three Core Web Vitals (CWV) that Google uses for search ranking: Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS).

## The Three Core Web Vitals

| Metric | Good | Needs Improvement | Poor | What It Measures |
|--------|------|-------------------|------|-----------------|
| **LCP** | ≤ 2.5s | ≤ 4.0s | > 4.0s | Loading speed — when the largest visible element renders |
| **INP** | ≤ 200ms | ≤ 500ms | > 500ms | Responsiveness — delay between user input and visual response |
| **CLS** | ≤ 0.1 | ≤ 0.25 | > 0.25 | Visual stability — how much the layout shifts unexpectedly |

## Largest Contentful Paint (LCP)

### What Counts as LCP?
The largest element in the viewport when it finishes rendering:
- `<img>` elements
- `<video>` poster images
- Elements with `background-image` (via CSS)
- Block-level text elements (`<h1>`, `<p>`, etc.)

### LCP Optimization Checklist

#### 1. Eliminate Render-Blocking Resources
```html
<!-- BAD: blocking CSS in <head> -->
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="large-library.css">

<!-- GOOD: critical CSS inline, rest deferred -->
<style>
  /* Critical above-the-fold CSS only (~14KB max) */
  body { margin: 0; font-family: system-ui; }
  .hero { height: 100vh; display: grid; place-items: center; }
</style>
<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">
```

#### 2. Optimize the LCP Element
```html
<!-- If LCP is an image: preload it -->
<link rel="preload" as="image" href="hero.webp" fetchpriority="high">

<!-- Use fetchpriority on the LCP image -->
<img src="hero.webp" alt="Hero" fetchpriority="high" loading="eager"
     width="1200" height="600">

<!-- If LCP is a background image: preload it -->
<link rel="preload" as="image" href="hero-bg.webp">
```

#### 3. Optimize Server Response Time (TTFB)
```
Target: TTFB < 800ms

Strategies:
1. Use a CDN (Cloudflare, Vercel Edge, AWS CloudFront)
2. Cache HTML responses (stale-while-revalidate)
3. Optimize database queries (index, connection pooling)
4. Use HTTP/2 or HTTP/3
5. Enable compression (Brotli > gzip)
```

#### 4. Font Loading
```html
<!-- Preload critical fonts -->
<link rel="preload" as="font" type="font/woff2" href="/fonts/inter.woff2" crossorigin>

<!-- Use font-display: swap to avoid invisible text -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter.woff2') format('woff2');
    font-display: swap;
  }
</style>

<!-- Or use system fonts for best LCP -->
<style>
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
                 Roboto, 'Helvetica Neue', sans-serif;
  }
</style>
```

## Interaction to Next Paint (INP)

### What Triggers INP?
Every user interaction that causes a visual update:
- Clicks, taps, key presses
- NOT: scrolling, hovering, pinch-zoom

### INP = Input Delay + Processing Time + Presentation Delay

```
User clicks button
  ├── Input Delay: time waiting for main thread (event handlers queued)
  ├── Processing Time: time running event handlers
  └── Presentation Delay: time for browser to render the update
```

### INP Optimization Checklist

#### 1. Reduce Input Delay (yield to the main thread)
```typescript
// BAD: long synchronous task blocks input
function processLargeList(items: Item[]) {
  items.forEach(item => {
    expensiveOperation(item); // Blocks main thread for 500ms+
  });
}

// GOOD: break into chunks using scheduler.yield()
async function processLargeList(items: Item[]) {
  for (const item of items) {
    expensiveOperation(item);
    // Yield to let browser process pending interactions
    if (navigator.scheduling?.isInputPending?.()) {
      await scheduler.yield();
    }
  }
}

// GOOD: use requestIdleCallback for non-urgent work
function processInBackground(items: Item[]) {
  let index = 0;
  function processChunk(deadline: IdleDeadline) {
    while (index < items.length && deadline.timeRemaining() > 5) {
      expensiveOperation(items[index++]);
    }
    if (index < items.length) {
      requestIdleCallback(processChunk);
    }
  }
  requestIdleCallback(processChunk);
}
```

#### 2. Reduce Processing Time
```typescript
// BAD: expensive computation in click handler
button.addEventListener('click', () => {
  const result = computeExpensiveAnalytics(); // 200ms
  updateUI(result);
});

// GOOD: show immediate feedback, defer heavy work
button.addEventListener('click', () => {
  showSpinner(); // Instant visual feedback
  requestAnimationFrame(() => {
    const result = computeExpensiveAnalytics();
    updateUI(result);
    hideSpinner();
  });
});

// GOOD: move heavy work to Web Worker
const worker = new Worker('/analytics-worker.js');
button.addEventListener('click', () => {
  showSpinner();
  worker.postMessage({ type: 'compute', data });
});
worker.onmessage = (e) => {
  updateUI(e.data.result);
  hideSpinner();
};
```

#### 3. Reduce Presentation Delay
```css
/* Avoid layout thrashing — don't force synchronous reflows */

/* BAD: reading then writing layout repeatedly */
elements.forEach(el => {
  const height = el.offsetHeight; /* forces reflow */
  el.style.height = height + 10 + 'px'; /* triggers another reflow */
});

/* GOOD: batch reads and writes */
const heights = elements.map(el => el.offsetHeight); /* batch read */
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px'; /* batch write */
});
```

```css
/* Use CSS containment to limit rendering scope */
.card {
  contain: layout style paint;
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;
}
```

## Cumulative Layout Shift (CLS)

### What Causes Layout Shifts?
- Images/videos without dimensions
- Dynamically injected content (ads, banners, embeds)
- Web fonts causing FOUT (Flash of Unstyled Text)
- Late-loading content pushing elements down

### CLS Optimization Checklist

#### 1. Always Set Image/Video Dimensions
```html
<!-- BAD: no dimensions — causes shift when image loads -->
<img src="photo.jpg" alt="Photo">

<!-- GOOD: explicit dimensions — browser reserves space -->
<img src="photo.jpg" alt="Photo" width="800" height="600">

<!-- GOOD: CSS aspect ratio for responsive images -->
<style>
  .responsive-img {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }
</style>
<img src="photo.jpg" alt="Photo" class="responsive-img">
```

#### 2. Reserve Space for Dynamic Content
```css
/* BAD: ad slot with no reserved space */
.ad-slot { }

/* GOOD: reserve space with min-height */
.ad-slot {
  min-height: 250px;
  background: #f5f5f5;
}

/* GOOD: skeleton loader with exact dimensions */
.card-skeleton {
  width: 100%;
  height: 320px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

#### 3. Use CSS `transform` for Animations (No Layout Shifts)
```css
/* BAD: animating layout properties causes shifts */
.toast { bottom: -100px; transition: bottom 0.3s; }
.toast.visible { bottom: 20px; }

/* GOOD: use transform — no layout shift */
.toast { transform: translateY(100%); transition: transform 0.3s; }
.toast.visible { transform: translateY(0); }
```

#### 4. Prevent Font Swap Shifts
```css
/* Use font-display: optional to prevent layout shift entirely */
@font-face {
  font-family: 'Custom';
  src: url('custom.woff2') format('woff2');
  font-display: optional; /* Use system font if custom font doesn't load fast */
}

/* Or match fallback font metrics to minimize shift */
@font-face {
  font-family: 'Custom';
  src: url('custom.woff2') format('woff2');
  font-display: swap;
  size-adjust: 105%; /* Adjust to match system font metrics */
  ascent-override: 90%;
  descent-override: 20%;
}
```

## Measuring Core Web Vitals

### In the Browser
```javascript
// Using web-vitals library
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log);  // { name: 'LCP', value: 1234, rating: 'good' }
onINP(console.log);  // { name: 'INP', value: 85, rating: 'good' }
onCLS(console.log);  // { name: 'CLS', value: 0.05, rating: 'good' }
```

### In Chrome DevTools
1. **Lighthouse** tab → Performance audit → Core Web Vitals scores
2. **Performance** tab → Record → Reload → Inspect LCP, CLS events
3. **Performance Insights** panel → Automated CWV analysis

### In CI/CD
```yaml
# Lighthouse CI
- name: Lighthouse
  uses: treosh/lighthouse-ci-action@v12
  with:
    configPath: .lighthouserc.json
    urls: |
      http://localhost:3000
      http://localhost:3000/products
```

## Quick Wins Checklist

1. [ ] Add `width`/`height` to all `<img>` and `<video>` tags
2. [ ] Add `fetchpriority="high"` to the LCP image
3. [ ] Preload the LCP image/font with `<link rel="preload">`
4. [ ] Inline critical CSS (first 14KB)
5. [ ] Defer non-critical JavaScript with `defer` or `async`
6. [ ] Use `font-display: swap` or `optional`
7. [ ] Add `loading="lazy"` to below-the-fold images
8. [ ] Set `content-visibility: auto` on off-screen sections
9. [ ] Use a CDN for static assets
10. [ ] Enable Brotli compression
