#!/bin/bash
# auto-lint.sh — PostToolUse hook for Write/Edit (async)
# Runs the project's linter after file modifications.
# Detects and uses the appropriate linter: ESLint, Prettier, Biome, Ruff, etc.
#
# Since this hook runs async, it reports results via systemMessage
# which Claude sees on the next conversation turn.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"

# --- JavaScript/TypeScript ---
if [[ "$EXT" =~ ^(js|jsx|ts|tsx|mjs|cjs)$ ]]; then
  # Try Biome first, then ESLint, then Prettier
  if command -v biome &>/dev/null || [ -f "biome.json" ] || [ -f "biome.jsonc" ]; then
    RESULT=$(npx biome check "$FILE_PATH" 2>&1)
    if [ $? -ne 0 ]; then
      echo "{\"systemMessage\": \"Lint issues in $FILE_PATH (biome): $RESULT\"}"
    fi
    exit 0
  fi

  if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.yml" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    RESULT=$(npx eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1)
    if [ $? -ne 0 ]; then
      echo "{\"systemMessage\": \"ESLint issues in $FILE_PATH: $RESULT\"}"
    fi
    exit 0
  fi

  if [ -f ".prettierrc" ] || [ -f ".prettierrc.json" ] || [ -f "prettier.config.js" ]; then
    RESULT=$(npx prettier --check "$FILE_PATH" 2>&1)
    if [ $? -ne 0 ]; then
      echo "{\"systemMessage\": \"Formatting issues in $FILE_PATH (prettier): Run 'npx prettier --write' to fix.\"}"
    fi
    exit 0
  fi
fi

# --- Python ---
if [[ "$EXT" == "py" ]]; then
  if command -v ruff &>/dev/null; then
    RESULT=$(ruff check "$FILE_PATH" 2>&1)
    if [ $? -ne 0 ]; then
      echo "{\"systemMessage\": \"Ruff lint issues in $FILE_PATH: $RESULT\"}"
    fi
    exit 0
  fi

  if command -v flake8 &>/dev/null; then
    RESULT=$(flake8 "$FILE_PATH" 2>&1)
    if [ $? -ne 0 ]; then
      echo "{\"systemMessage\": \"Flake8 issues in $FILE_PATH: $RESULT\"}"
    fi
    exit 0
  fi
fi

# --- Go ---
if [[ "$EXT" == "go" ]]; then
  if command -v golangci-lint &>/dev/null; then
    RESULT=$(golangci-lint run "$FILE_PATH" 2>&1)
    if [ $? -ne 0 ]; then
      echo "{\"systemMessage\": \"Go lint issues in $FILE_PATH: $RESULT\"}"
    fi
    exit 0
  fi

  if command -v gofmt &>/dev/null; then
    RESULT=$(gofmt -l "$FILE_PATH" 2>&1)
    if [ -n "$RESULT" ]; then
      echo "{\"systemMessage\": \"Formatting issues in $FILE_PATH: Run 'gofmt -w' to fix.\"}"
    fi
    exit 0
  fi
fi

# --- Rust ---
if [[ "$EXT" == "rs" ]]; then
  if command -v clippy-driver &>/dev/null; then
    RESULT=$(cargo clippy --message-format=short 2>&1 | head -20)
    if [ $? -ne 0 ]; then
      echo "{\"systemMessage\": \"Clippy warnings after editing $FILE_PATH: $RESULT\"}"
    fi
    exit 0
  fi
fi

# No linter found — silent exit
exit 0
