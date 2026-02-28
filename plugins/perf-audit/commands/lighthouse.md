---
name: lighthouse
description: Set up Lighthouse CI for automated performance monitoring in your CI/CD pipeline
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /lighthouse — Lighthouse CI Setup

Set up Lighthouse CI to automatically test performance on every pull request and prevent regressions.

## Usage

```
/lighthouse                     # Set up Lighthouse CI for this project
/lighthouse --budget             # Create a performance budget config only
/lighthouse --github-action      # Generate GitHub Actions workflow only
```

## Workflow

1. **Detect project type**: Identify the framework, build command, and dev server
2. **Install dependencies**: `@lhci/cli` as dev dependency
3. **Create config**: `.lighthouserc.json` with sensible defaults
4. **Add CI workflow**: GitHub Actions workflow for automated testing
5. **Add npm scripts**: `lhci` commands in package.json
6. **Verify**: Run a local Lighthouse audit to test the config

## Generated Files

### .lighthouserc.json
Customized for the project with:
- URLs to test (home page + key routes)
- Performance budget assertions (LCP ≤ 2.5s, CLS ≤ 0.1, etc.)
- Accessibility score threshold (≥ 0.9)
- 3 runs per URL for stable results
- Start server command matching the project's framework

### .github/workflows/lighthouse.yml
GitHub Actions workflow that:
- Runs on pull requests to main
- Builds the project
- Starts the production server
- Runs Lighthouse against configured URLs
- Uploads results as artifacts
- Fails the PR if budgets are exceeded

### package.json scripts
```json
{
  "scripts": {
    "lhci": "lhci autorun",
    "lhci:collect": "lhci collect",
    "lhci:assert": "lhci assert"
  }
}
```

## Performance Budgets

Default thresholds (customizable):

| Metric | Threshold | Level |
|--------|-----------|-------|
| Performance Score | ≥ 90 | error |
| Accessibility Score | ≥ 90 | error |
| LCP | ≤ 2500ms | error |
| FCP | ≤ 2000ms | warning |
| CLS | ≤ 0.1 | error |
| Total Blocking Time | ≤ 300ms | error |
| Total Byte Weight | ≤ 500KB | warning |

## Important

- Lighthouse scores can vary between runs — 3 runs with median selection reduces noise
- Lab data (Lighthouse) ≠ field data (RUM) — use both for complete picture
- CI environments may have different performance characteristics than local machines
- Consider using Lighthouse CI Server for historical tracking and comparison
