---
name: env-setup
description: Set up type-safe environment validation for a project — configure t3-env, Zod, pydantic-settings, or envconfig
---

# /env-setup — Configure Env Validation

Set up type-safe environment variable validation for your project. Catch missing config at startup, not at runtime.

## Usage

```
/env-setup                      # Auto-detect project and configure
/env-setup node                 # Set up t3-env + Zod for Node.js/TypeScript
/env-setup python               # Set up pydantic-settings for Python
/env-setup go                   # Set up envconfig for Go
/env-setup --from-env           # Generate schema from existing .env file
```

## Examples

```
/env-setup
/env-setup node --from-env
/env-setup python
/env-setup go
```

## Process

1. **Auto-detect**: Check for `package.json` / `pyproject.toml` / `go.mod`
2. **Scan existing config**: Read `.env` and `.env.example` to discover all variables
3. **Generate schema**: Create type-safe config module:
   - **Node.js**: `src/env.ts` using `@t3-oss/env-nextjs` or `@t3-oss/env-core` + Zod
   - **Python**: `src/config.py` using `pydantic-settings`
   - **Go**: `internal/config/config.go` using `envconfig`
4. **Install dependencies**: Show install command
5. **Wire up**: Show how to import and use in your app
6. **--from-env**: Infer types from existing `.env` values:
   - Numbers → `z.coerce.number()` / `int` / `int`
   - URLs → `z.string().url()` / `str` (with URL validator) / `string`
   - Booleans → `z.coerce.boolean()` / `bool` / `bool`
   - Everything else → `z.string()` / `str` / `string`

## Output

Creates:
- Config/env validation module
- Type declarations (for TypeScript)
- Updated `.env.example` with type hints in comments

Shows:
- Install command for dependencies
- How to import the config module
- How to replace `process.env.X` with `config.x`

## Notes

- For Next.js projects, uses `@t3-oss/env-nextjs` which handles `NEXT_PUBLIC_*` separation
- For Vite projects, generates `src/vite-env.d.ts` type declarations
- Follows the single-config-module pattern (see config-patterns skill)
- Generated code follows the project's existing style and conventions
