# Library / Package Scaffolding

Generate publishable npm or PyPI packages with proper build pipeline, dual ESM/CJS output, type declarations, testing, and release automation.

## npm Package Structure

```
my-lib/
├── src/
│   ├── index.ts                # Main entry — public API exports
│   ├── core.ts                 # Core logic
│   ├── types.ts                # Public TypeScript types
│   └── utils.ts                # Internal utilities
├── tests/
│   ├── core.test.ts
│   └── utils.test.ts
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + test + build
│       └── release.yml         # Publish to npm on release
├── .gitignore
├── .npmignore                  # Or use "files" in package.json
├── LICENSE
├── README.md
├── tsconfig.json
├── tsup.config.ts              # Build config (dual ESM/CJS)
├── vitest.config.ts
└── package.json
```

## Key Files — npm Package

### package.json

```json
{
  "name": "my-lib",
  "version": "0.1.0",
  "description": "A TypeScript library",
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "test": "vitest",
    "test:run": "vitest --run",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/",
    "prepublishOnly": "npm run build",
    "size": "size-limit",
    "release": "npm run build && npm publish"
  },
  "devDependencies": {
    "tsup": "^8.3.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "eslint": "^9.0.0",
    "@size-limit/preset-small-lib": "^11.0.0",
    "size-limit": "^11.0.0"
  },
  "sideEffects": false,
  "keywords": [],
  "repository": {
    "type": "git",
    "url": "https://github.com/you/my-lib"
  },
  "homepage": "https://github.com/you/my-lib#readme",
  "bugs": "https://github.com/you/my-lib/issues"
}
```

### tsup.config.ts (Dual ESM/CJS build)

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  outDir: "dist",
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
  },
});
```

### Size Limit Config (in package.json)

```json
{
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "10 KB"
    }
  ]
}
```

### GitHub Actions — CI

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run build
      - run: npm run test:run
      - run: npm run size
```

### GitHub Actions — Release to npm

```yaml
name: Release
on:
  release:
    types: [published]

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: "https://registry.npmjs.org"
      - run: npm ci
      - run: npm run build
      - run: npm run test:run
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### .npmignore

```
src/
tests/
.github/
tsconfig.json
tsup.config.ts
vitest.config.ts
.eslintrc.*
*.test.ts
```

## PyPI Package Structure

```
my-lib/
├── src/
│   └── my_lib/
│       ├── __init__.py         # Public API + __version__
│       ├── core.py             # Core logic
│       └── types.py            # Type definitions
├── tests/
│   ├── __init__.py
│   └── test_core.py
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── .gitignore
├── LICENSE
├── README.md
├── pyproject.toml
└── uv.lock
```

### pyproject.toml (PyPI)

```toml
[project]
name = "my-lib"
version = "0.1.0"
description = "A Python library"
readme = "README.md"
license = { text = "MIT" }
requires-python = ">=3.11"
authors = [{ name = "Your Name", email = "you@example.com" }]
keywords = []
classifiers = [
    "Development Status :: 3 - Alpha",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
    "Typing :: Typed",
]

[project.urls]
Homepage = "https://github.com/you/my-lib"
Repository = "https://github.com/you/my-lib"
Issues = "https://github.com/you/my-lib/issues"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv]
dev-dependencies = [
    "pytest>=8.3",
    "pytest-cov>=6.0",
    "ruff>=0.9",
    "mypy>=1.14",
]

[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "SIM"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --tb=short --cov=src/my_lib --cov-report=term-missing"

[tool.mypy]
python_version = "3.11"
strict = true
```

### GitHub Actions — Publish to PyPI

```yaml
name: Release
on:
  release:
    types: [published]

permissions:
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: release
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: uv build
      - uses: pypa/gh-action-pypi-publish@release/v1
```

## API Design Best Practices

### Public API Surface
- Export only what users need from `index.ts` / `__init__.py`
- Use barrel exports to control the public surface
- Mark internal functions with `@internal` or prefix with `_`

```typescript
// src/index.ts — only export public API
export { createClient } from "./core";
export type { ClientOptions, Result } from "./types";
// Don't export: internal helpers, constants, etc.
```

### Versioning
- Follow Semantic Versioning (SemVer)
- Major: breaking changes
- Minor: new features (backward-compatible)
- Patch: bug fixes
- Use `0.x.y` during initial development

### README Template

```markdown
# my-lib

Short description of what this library does.

## Install

\`\`\`bash
npm install my-lib
\`\`\`

## Usage

\`\`\`typescript
import { createClient } from "my-lib";

const client = createClient({ /* options */ });
const result = await client.doSomething();
\`\`\`

## API

### `createClient(options)`

Description of the main function.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `5000` | Request timeout in ms |

## License

MIT
```

## Checklist After Scaffolding

1. Replace `my-lib` with actual package name (check npm/PyPI availability)
2. Update description, keywords, repository URL
3. Choose a license (MIT, Apache-2.0, ISC)
4. Run `npm install` / `uv sync`
5. Implement core logic in `src/`
6. Write tests — aim for >80% coverage
7. Build and verify: `npm run build` / `uv build`
8. Set up npm/PyPI token as GitHub secret
9. Create first release via GitHub Releases
