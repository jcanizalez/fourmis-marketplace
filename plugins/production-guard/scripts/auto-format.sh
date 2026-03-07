#!/usr/bin/env bash
# auto-format.sh — PostToolUse hook for Write|Edit (async)
# Detects file language and runs the appropriate formatter.
# Supports: prettier (JS/TS/CSS/JSON/MD), gofmt (Go), black (Python),
# rustfmt (Rust), shfmt (Shell).
# Silently skips if formatter isn't installed.

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"
BASENAME=$(basename "$FILE_PATH")

# Skip generated files, node_modules, vendor, dist
if echo "$FILE_PATH" | grep -qE 'node_modules/|vendor/|dist/|\.min\.|\.generated\.|\.gen\.'; then
  exit 0
fi

# Skip lock files
if echo "$BASENAME" | grep -qE '^(package-lock|yarn\.lock|pnpm-lock|Cargo\.lock|go\.sum|poetry\.lock)'; then
  exit 0
fi

format_with_prettier() {
  if command -v npx &>/dev/null; then
    # Check if prettier is available (project-local or global)
    if npx --no-install prettier --version &>/dev/null 2>&1; then
      npx --no-install prettier --write "$FILE_PATH" 2>/dev/null || true
    elif command -v prettier &>/dev/null; then
      prettier --write "$FILE_PATH" 2>/dev/null || true
    fi
  fi
}

case "$EXT" in
  # JavaScript/TypeScript — prettier
  js|jsx|ts|tsx|mjs|cjs)
    format_with_prettier
    ;;

  # CSS/SCSS/Less — prettier
  css|scss|less)
    format_with_prettier
    ;;

  # JSON/YAML — prettier
  json|yaml|yml)
    format_with_prettier
    ;;

  # Markdown — prettier
  md|mdx)
    format_with_prettier
    ;;

  # HTML — prettier
  html|htm|vue|svelte)
    format_with_prettier
    ;;

  # Go — gofmt
  go)
    if command -v gofmt &>/dev/null; then
      gofmt -w "$FILE_PATH" 2>/dev/null || true
    fi
    ;;

  # Python — black or ruff
  py)
    if command -v ruff &>/dev/null; then
      ruff format "$FILE_PATH" 2>/dev/null || true
    elif command -v black &>/dev/null; then
      black --quiet "$FILE_PATH" 2>/dev/null || true
    fi
    ;;

  # Rust — rustfmt
  rs)
    if command -v rustfmt &>/dev/null; then
      rustfmt "$FILE_PATH" 2>/dev/null || true
    fi
    ;;

  # Shell — shfmt
  sh|bash|zsh)
    if command -v shfmt &>/dev/null; then
      shfmt -w "$FILE_PATH" 2>/dev/null || true
    fi
    ;;

  # SQL — pg_format or sql-formatter
  sql)
    if command -v pg_format &>/dev/null; then
      TEMP=$(mktemp)
      pg_format "$FILE_PATH" > "$TEMP" 2>/dev/null && mv "$TEMP" "$FILE_PATH" || rm -f "$TEMP"
    fi
    ;;

  # TOML — taplo
  toml)
    if command -v taplo &>/dev/null; then
      taplo format "$FILE_PATH" 2>/dev/null || true
    fi
    ;;
esac

exit 0
