---
name: init
description: Initialize missing configs in an existing project — add linting, testing, CI, Docker, or TypeScript
allowed-tools: Read, Write, Bash, Glob, Grep
---

# /init — Add Configs to Existing Projects

Add missing production configs to a project that already exists. Unlike `/scaffold` which creates from scratch, `/init` augments what's already there.

## Usage

```
/init                         # Analyze project, suggest what's missing
/init eslint                  # Add ESLint configuration
/init prettier                # Add Prettier configuration
/init typescript              # Add TypeScript (tsconfig.json + types)
/init testing                 # Add Vitest/pytest test setup
/init ci                      # Add GitHub Actions CI workflow
/init docker                  # Add Dockerfile + docker-compose.yml
/init husky                   # Add git hooks (lint-staged, commitlint)
/init env                     # Add .env.example from existing .env
```

## Workflow

1. **Analyze the project**: Read `package.json`, `pyproject.toml`, `go.mod`, or directory structure to detect the stack
2. **Identify what's missing**: Check for existing configs and only add what's needed
3. **Generate configs**: Create files that integrate with the existing project structure
4. **Install dependencies**: Add any required dev dependencies
5. **Verify**: Run the newly added tool to confirm it works

## Detection Logic

| File | Stack |
|------|-------|
| `package.json` + `next.config.*` | Next.js |
| `package.json` + express/fastify | Express/Fastify |
| `go.mod` | Go |
| `pyproject.toml` / `setup.py` | Python |
| `pnpm-workspace.yaml` / `turbo.json` | Monorepo |
| `Cargo.toml` | Rust |

## Config Templates

### ESLint (Flat Config)
```javascript
// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["dist/", "node_modules/"] }
);
```

### Prettier
```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Git Hooks (Husky + lint-staged)
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

## Important

- Never overwrite existing configs — warn the user and ask before replacing
- Respect the project's existing code style and conventions
- Add dependencies as devDependencies unless they're runtime-required
- Test that the new config doesn't break the existing build
