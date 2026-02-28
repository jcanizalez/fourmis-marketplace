---
name: bundle
description: Analyze JavaScript bundle size — find heavy dependencies, unused imports, and optimization opportunities
allowed-tools: Read, Glob, Grep, Bash
---

# /bundle — Bundle Size Analysis

Analyze your project's JavaScript bundle size and find optimization opportunities.

## Usage

```
/bundle                         # Analyze bundle size of current project
/bundle --deps                  # Focus on dependency sizes
/bundle --unused                # Find unused dependencies
/bundle --alternatives          # Suggest lighter alternatives for heavy deps
```

## Workflow

1. **Read package.json**: List all dependencies and their install sizes
2. **Analyze imports**: Scan source files for actual usage of each dependency
3. **Identify heavy deps**: Sort by estimated bundle contribution
4. **Find unused deps**: Dependencies installed but never imported
5. **Suggest alternatives**: Lighter libraries or native APIs that can replace heavy ones
6. **Check build config**: Tree shaking, code splitting, compression settings

## Output Format

```
## Bundle Analysis Report

### Top Dependencies by Size (estimated)
| Package | Version | Est. Size (gzip) | Used In | Alternative |
|---------|---------|-------------------|---------|-------------|
| moment | 2.30.1 | 72 KB | 2 files | dayjs (2 KB) |
| lodash | 4.17.21 | 72 KB | 5 files | lodash-es (tree-shaken: 3 KB) |
| chart.js | 4.4.0 | 65 KB | 1 file | lightweight-charts (15 KB) |
| axios | 1.7.0 | 13 KB | 8 files | native fetch (0 KB) |

### Unused Dependencies
| Package | Last Used | Action |
|---------|-----------|--------|
| @types/lodash | devDep (OK) | Keep (type definitions) |
| classnames | never imported | Remove |
| query-string | never imported | Remove |

### Barrel Import Issues
| Import | File | Pulls In | Fix |
|--------|------|----------|-----|
| `import { Button } from '@/components'` | app/page.tsx | All 30 components | `import { Button } from '@/components/ui/button'` |

### Build Configuration
| Setting | Current | Recommended |
|---------|---------|-------------|
| Tree shaking | ✅ enabled | OK |
| Code splitting | ✅ route-based | OK |
| Compression | gzip | Switch to Brotli |
| Source maps | included in prod | Exclude from prod build |
| sideEffects | not set | Add `"sideEffects": false` to package.json |

### Summary
- Total estimated JS: 285 KB (gzip)
- Potential savings: 142 KB (50%)
- Unused deps to remove: 2
- Barrel imports to fix: 3
```

## Dependency Audit

For each heavy dependency, the analysis checks:
1. How many files actually import it
2. Which specific functions/methods are used
3. Whether a lighter alternative exists
4. Whether native browser APIs can replace it

## Common Replacements

| From | To | Savings |
|------|----|---------|
| `moment` | `dayjs` or `Intl.DateTimeFormat` | 70 KB |
| `lodash` | `lodash-es` + named imports | 65 KB |
| `axios` | Native `fetch` | 13 KB |
| `uuid` | `crypto.randomUUID()` | 3 KB |
| `classnames` | Template literals or `clsx` | 0.3 KB |
| `qs` / `query-string` | `URLSearchParams` | 3-8 KB |
| `node-fetch` | Native `fetch` (Node 18+) | 8 KB |

## Important

- Sizes are estimates based on bundlephobia data — actual impact depends on tree shaking
- Run `npx size-limit` or build analyzer for precise measurements
- Some "heavy" deps may be tree-shaken to much smaller sizes in practice
- Always verify alternatives provide the same functionality you need
