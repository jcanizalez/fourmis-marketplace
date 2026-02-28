# Monorepo Scaffolding

Generate production-ready monorepo setups with Turborepo, shared packages, and consistent tooling across all workspaces.

## Project Structure

```
my-monorepo/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tsconfig.json
│   ├── api/                    # Express/Fastify backend
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── docs/                   # Documentation site (optional)
│       ├── src/
│       └── package.json
├── packages/
│   ├── ui/                     # Shared React component library
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── index.ts        # Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/                 # Shared utilities and types
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   ├── validations.ts  # Shared Zod schemas
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── eslint-config/          # Shared ESLint config
│   │   ├── base.js
│   │   ├── react.js
│   │   └── package.json
│   └── tsconfig/               # Shared TypeScript configs
│       ├── base.json
│       ├── nextjs.json
│       ├── node.json
│       └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .npmrc
├── package.json                # Root workspace config
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # pnpm workspace definition
└── README.md
```

## Key Files

### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\"",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.4.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Shared TypeScript Config — base.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist"]
}
```

### Shared TypeScript Config — node.json

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "outDir": "dist"
  }
}
```

### Shared TypeScript Config — nextjs.json

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["DOM", "DOM.Iterable", "ES2017"],
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

### Shared UI Package — package.json

```json
{
  "name": "@my-monorepo/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@my-monorepo/tsconfig": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

### Shared Package — package.json

```json
{
  "name": "@my-monorepo/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@my-monorepo/tsconfig": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

### App package.json (referencing internal packages)

```json
{
  "name": "@my-monorepo/web",
  "dependencies": {
    "@my-monorepo/ui": "workspace:*",
    "@my-monorepo/shared": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

### .npmrc

```
auto-install-peers=true
strict-peer-dependencies=false
```

### GitHub Actions CI

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
```

## Adding a New App

```bash
# 1. Create the app directory
mkdir -p apps/my-new-app/src

# 2. Create package.json with workspace references
# 3. Create tsconfig.json extending shared config
# 4. Import shared packages:
#    import { Button } from "@my-monorepo/ui"
#    import { type User } from "@my-monorepo/shared"
```

## Adding a New Shared Package

```bash
# 1. Create package directory
mkdir -p packages/my-lib/src

# 2. Add package.json with name "@my-monorepo/my-lib"
# 3. Export from src/index.ts
# 4. Add as dependency in consuming apps:
#    "@my-monorepo/my-lib": "workspace:*"
```

## Patterns

### Internal Package Exports
Always use explicit exports in shared packages:
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./utils": "./src/utils.ts",
    "./types": "./src/types.ts"
  }
}
```

### Environment Variables
- Define `.env.example` per app, not at root
- Use `@t3-oss/env-nextjs` for type-safe env in Next.js apps
- Pass env vars in turbo.json `globalEnv` if needed across tasks

### Deployment
- Deploy each app independently (Vercel, Fly.io, etc.)
- Use Docker with `--filter` for specific app builds
- Turborepo Remote Cache (Vercel) for CI speed

## Checklist After Scaffolding

1. Replace `my-monorepo` with actual name everywhere
2. Run `pnpm install`
3. Run `pnpm dev` — verify all apps start
4. Run `pnpm build` — verify all apps build
5. Run `pnpm type-check` — verify no type errors
6. Customize shared UI components
7. Set up Turborepo Remote Cache for CI speed
8. Configure deployment per app
