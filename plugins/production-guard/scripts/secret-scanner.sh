#!/usr/bin/env bash
# secret-scanner.sh — PreToolUse hook for Write|Edit
# Scans file content for leaked secrets before allowing writes.
# Blocks writes that contain API keys, tokens, passwords, or private keys.

set -euo pipefail

INPUT=$(cat)

# Extract tool input from hook payload
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty' 2>/dev/null)
if [ -z "$TOOL_INPUT" ]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Get the content being written — check both Write and Edit payloads
CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content // .new_string // empty' 2>/dev/null)
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

if [ -z "$CONTENT" ]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Skip scanning for test files, mocks, and documentation
if echo "$FILE_PATH" | grep -qiE '\.(test|spec|mock|fixture|md|txt|snap)\b|__tests__|__mocks__|testdata|fixtures'; then
  echo '{"decision": "approve"}'
  exit 0
fi

VIOLATIONS=""

# AWS Access Keys (AKIA followed by 16 alphanumeric chars)
if echo "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
  VIOLATIONS="${VIOLATIONS}AWS Access Key detected. "
fi

# AWS Secret Keys (40-char base64-like strings after common prefixes)
if echo "$CONTENT" | grep -qE '(aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*[A-Za-z0-9/+=]{40}'; then
  VIOLATIONS="${VIOLATIONS}AWS Secret Key detected. "
fi

# GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_ followed by 36+ chars)
if echo "$CONTENT" | grep -qE 'gh[pousr]_[A-Za-z0-9_]{36,}'; then
  VIOLATIONS="${VIOLATIONS}GitHub token detected. "
fi

# Generic API keys (long alphanumeric strings after key/token/secret assignments)
if echo "$CONTENT" | grep -qiE '(api[_-]?key|api[_-]?secret|api[_-]?token)\s*[=:]\s*["\x27][A-Za-z0-9_\-]{20,}["\x27]'; then
  VIOLATIONS="${VIOLATIONS}API key/secret literal detected. "
fi

# Private keys (PEM format) — use -- to prevent pattern being treated as flag
if echo "$CONTENT" | grep -qE -- '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'; then
  VIOLATIONS="${VIOLATIONS}Private key detected. "
fi

# Stripe keys (sk_live_, sk_test_, pk_live_, pk_test_)
if echo "$CONTENT" | grep -qE '(sk|pk)_(live|test)_[A-Za-z0-9]{20,}'; then
  VIOLATIONS="${VIOLATIONS}Stripe key detected. "
fi

# Slack tokens (xoxb-, xoxp-, xoxo-, xoxa-)
if echo "$CONTENT" | grep -qE 'xox[bpoa]-[A-Za-z0-9\-]{20,}'; then
  VIOLATIONS="${VIOLATIONS}Slack token detected. "
fi

# Database connection strings with passwords
if echo "$CONTENT" | grep -qiE '(postgres|mysql|mongodb(\+srv)?|redis)://[^:]+:[^@]{8,}@'; then
  VIOLATIONS="${VIOLATIONS}Database connection string with password detected. "
fi

# JWT tokens (3 base64 segments separated by dots)
if echo "$CONTENT" | grep -qE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'; then
  VIOLATIONS="${VIOLATIONS}JWT token detected. "
fi

# SendGrid, Mailgun, Twilio keys
if echo "$CONTENT" | grep -qE 'SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}'; then
  VIOLATIONS="${VIOLATIONS}SendGrid API key detected. "
fi

if [ -n "$VIOLATIONS" ]; then
  echo "{\"decision\": \"block\", \"reason\": \"🔒 SECRET DETECTED in ${FILE_PATH}: ${VIOLATIONS}Move secrets to environment variables or a .env file (which should be in .gitignore).\"}"
  exit 0
fi

echo '{"decision": "approve"}'
