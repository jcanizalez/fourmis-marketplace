# Bundle Size Optimization

Analyze and reduce JavaScript bundle size. Covers tree shaking, code splitting, dynamic imports, dependency auditing, and build tool configuration.

## Bundle Size Targets

| Metric | Target | Why |
|--------|--------|-----|
| Initial JS | < 100 KB (compressed) | Faster parse + execute on slow devices |
| Per-route JS | < 50 KB (compressed) | Quick route transitions |
| Total JS | < 300 KB (compressed) | Reasonable overall budget |
| CSS | < 50 KB (compressed) | Render-blocking resource |

> These are compressed (gzip/brotli) sizes. Uncompressed is ~3x larger.

## Analyzing Bundle Size

### Webpack / Next.js
```bash
# Next.js — built-in bundle analyzer
npm install @next/bundle-analyzer

# next.config.ts
import withBundleAnalyzer from '@next/bundle-analyzer';
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })({
  // your config
});

# Run analysis
ANALYZE=true npm run build
```

### Vite
```bash
# Install rollup-plugin-visualizer
npm install -D rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';
export default defineConfig({
  plugins: [visualizer({ open: true, gzipSize: true })],
});
```

### size-limit (Standalone)
```bash
npm install -D size-limit @size-limit/preset-app

# package.json
{
  "size-limit": [
    { "path": "dist/**/*.js", "limit": "100 KB", "gzip": true },
    { "path": "dist/**/*.css", "limit": "30 KB", "gzip": true }
  ]
}

npx size-limit
```

### Quick Check — bundlephobia-style
```bash
# Check a package's size before installing
npx package-size lodash        # Full size
npx package-size lodash-es     # ES modules (tree-shakeable)
npx package-size date-fns      # Compare alternatives
```

## Tree Shaking

Tree shaking eliminates unused exports. It requires:
1. ES modules (`import`/`export`, not `require`)
2. Side-effect-free code
3. Proper `"sideEffects"` in package.json

```json
// package.json — mark package as side-effect-free
{
  "sideEffects": false
}

// Or specify files WITH side effects
{
  "sideEffects": ["*.css", "./src/polyfills.ts"]
}
```

### Common Tree Shaking Failures

```typescript
// BAD: barrel import pulls in EVERYTHING
import { Button } from '@/components';
// If components/index.ts re-exports 50 components, all 50 are bundled

// GOOD: direct import — only Button is included
import { Button } from '@/components/ui/button';

// BAD: namespace import prevents tree shaking in some bundlers
import * as utils from './utils';
utils.formatDate(date);

// GOOD: named import — unused exports are removed
import { formatDate } from './utils';
```

### Library Import Optimization

```typescript
// BAD: imports entire lodash (72 KB gzipped)
import _ from 'lodash';
_.debounce(fn, 300);

// GOOD: import only what you need (1.2 KB gzipped)
import debounce from 'lodash/debounce';

// BEST: use lodash-es for tree shaking (0.8 KB for debounce)
import { debounce } from 'lodash-es';

// BAD: imports entire date-fns/moment
import moment from 'moment'; // 72 KB gzipped
import { format } from 'date-fns'; // 13 KB if not tree-shaken

// GOOD: native Intl API (0 KB — built into the browser)
new Intl.DateTimeFormat('en-US').format(date);

// BAD: imports entire icon library
import { FaHome } from 'react-icons/fa'; // Often bundles ALL icons

// GOOD: direct path import
import FaHome from 'react-icons/fa/FaHome';
```

## Code Splitting

### Route-Based (Automatic in Next.js)
```tsx
// Next.js App Router — each page is auto-split
// app/page.tsx → chunk for /
// app/about/page.tsx → chunk for /about
// app/dashboard/page.tsx → chunk for /dashboard
```

### Component-Based (Manual)
```tsx
import { lazy, Suspense } from 'react';

// Heavy component loaded only when needed
const MarkdownEditor = lazy(() => import('./MarkdownEditor'));
const ChartDashboard = lazy(() => import('./ChartDashboard'));

function App({ view }: { view: string }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {view === 'editor' && <MarkdownEditor />}
      {view === 'charts' && <ChartDashboard />}
    </Suspense>
  );
}
```

### Dynamic Import for Conditional Features
```typescript
// Only load the library when the feature is used
async function handleExport() {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.text('Hello', 10, 10);
  doc.save('export.pdf');
}

// Only load analytics in production
if (process.env.NODE_ENV === 'production') {
  import('./analytics').then(({ init }) => init());
}
```

## Common Heavy Dependencies & Lighter Alternatives

| Heavy Package | Size (gzip) | Alternative | Size (gzip) |
|--------------|-------------|-------------|-------------|
| `moment` | 72 KB | `date-fns` (tree-shaken) | 2-5 KB |
| `moment` | 72 KB | `dayjs` | 2 KB |
| `lodash` | 72 KB | `lodash-es` (tree-shaken) | 1-5 KB |
| `lodash` | 72 KB | Native JS (Array methods) | 0 KB |
| `axios` | 13 KB | `fetch` (native) | 0 KB |
| `uuid` | 3 KB | `crypto.randomUUID()` | 0 KB |
| `classnames` | 0.4 KB | Template literals | 0 KB |
| `chart.js` | 65 KB | Lightweight chart libs | 10-20 KB |
| `react-icons` (all) | 60 KB+ | Direct SVG imports | < 1 KB |

## Compression

```nginx
# Nginx — enable Brotli (20-30% smaller than gzip)
brotli on;
brotli_types text/html text/css application/javascript application/json image/svg+xml;
brotli_comp_level 6;

# Fallback to gzip
gzip on;
gzip_types text/html text/css application/javascript application/json image/svg+xml;
gzip_comp_level 6;
```

```typescript
// Next.js — enable compression
// next.config.ts
export default {
  compress: true, // Enabled by default
};
```

### Pre-compression at Build Time
```bash
# Pre-compress static assets
find dist -name '*.js' -o -name '*.css' -o -name '*.html' | \
  xargs -I {} brotli --best {} --keep
# Creates .br files alongside originals
```

## Build Optimization Checklist

1. [ ] Run bundle analyzer — identify largest chunks
2. [ ] Remove unused dependencies (`npx depcheck`)
3. [ ] Replace heavy libraries with lighter alternatives
4. [ ] Use direct imports instead of barrel re-exports
5. [ ] Lazy-load below-the-fold components
6. [ ] Split vendor chunks (framework separate from app code)
7. [ ] Enable Brotli compression
8. [ ] Set up size-limit CI check to prevent regressions
9. [ ] Enable `"sideEffects": false` in package.json
10. [ ] Audit `node_modules` for duplicate packages
