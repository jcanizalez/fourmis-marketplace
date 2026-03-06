#!/bin/bash
# detect-stack.sh — SessionStart hook
# Auto-detects the project's tech stack and suggests relevant Fourmis plugins.
# Runs on every session start to provide context-aware plugin recommendations.

set -euo pipefail

# Only run if we're in a git repo or project directory
if [ ! -d ".git" ] && [ ! -f "package.json" ] && [ ! -f "go.mod" ] && [ ! -f "Cargo.toml" ] && [ ! -f "pyproject.toml" ] && [ ! -f "requirements.txt" ]; then
  exit 0
fi

STACK=""
FRAMEWORKS=""
PLUGINS=""

# ─── Language Detection ──────────────────────────────────────

# Node.js / TypeScript
if [ -f "package.json" ]; then
  STACK="${STACK:+$STACK, }Node.js"
  if [ -f "tsconfig.json" ] || [ -f "tsconfig.base.json" ]; then
    STACK="${STACK:+$STACK, }TypeScript"
    PLUGINS="${PLUGINS:+$PLUGINS, }typescript-patterns"
  fi
fi

# Go
if [ -f "go.mod" ]; then
  STACK="${STACK:+$STACK, }Go"
  PLUGINS="${PLUGINS:+$PLUGINS, }go-patterns"
fi

# Python
if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "Pipfile" ]; then
  STACK="${STACK:+$STACK, }Python"
fi

# Rust
if [ -f "Cargo.toml" ]; then
  STACK="${STACK:+$STACK, }Rust"
fi

# ─── Framework Detection ─────────────────────────────────────

if [ -f "package.json" ]; then
  PKG=$(cat package.json 2>/dev/null || echo '{}')

  # Next.js
  if echo "$PKG" | grep -q '"next"'; then
    FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }Next.js"
    PLUGINS="${PLUGINS:+$PLUGINS, }nextjs-patterns"
  fi

  # React (only if not Next.js, to avoid duplication)
  if echo "$PKG" | grep -q '"react"' && ! echo "$PKG" | grep -q '"next"'; then
    FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }React"
    PLUGINS="${PLUGINS:+$PLUGINS, }react-patterns"
  fi

  # Express
  if echo "$PKG" | grep -q '"express"'; then
    FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }Express"
    PLUGINS="${PLUGINS:+$PLUGINS, }api-design-patterns"
  fi

  # Prisma
  if echo "$PKG" | grep -q '"prisma"' || echo "$PKG" | grep -q '"@prisma/client"'; then
    FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }Prisma"
    PLUGINS="${PLUGINS:+$PLUGINS, }database-patterns"
  fi

  # XState
  if echo "$PKG" | grep -q '"xstate"'; then
    FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }XState"
    PLUGINS="${PLUGINS:+$PLUGINS, }state-machines"
  fi
fi

# ─── Infra Detection ─────────────────────────────────────────

# Docker
if [ -f "Dockerfile" ] || [ -f "docker-compose.yml" ] || [ -f "docker-compose.yaml" ] || [ -f "compose.yml" ] || [ -f "compose.yaml" ]; then
  FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }Docker"
  PLUGINS="${PLUGINS:+$PLUGINS, }docker-toolkit"
fi

# Kubernetes
if [ -d "k8s" ] || [ -d "kubernetes" ] || ls *.yaml 2>/dev/null | head -1 | xargs grep -l 'apiVersion.*apps/' >/dev/null 2>&1; then
  FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }Kubernetes"
  PLUGINS="${PLUGINS:+$PLUGINS, }kubernetes-patterns"
fi

# GitHub Actions
if [ -d ".github/workflows" ]; then
  FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }GitHub Actions"
  PLUGINS="${PLUGINS:+$PLUGINS, }ci-cd"
fi

# Terraform
if ls *.tf >/dev/null 2>&1; then
  FRAMEWORKS="${FRAMEWORKS:+$FRAMEWORKS, }Terraform"
  PLUGINS="${PLUGINS:+$PLUGINS, }devops-skills"
fi

# ─── Tool Detection ──────────────────────────────────────────

# .env files present
if ls .env* >/dev/null 2>&1; then
  PLUGINS="${PLUGINS:+$PLUGINS, }env-manager"
fi

# Database files (SQLite)
if ls *.db >/dev/null 2>&1 || ls *.sqlite >/dev/null 2>&1 || ls *.sqlite3 >/dev/null 2>&1; then
  PLUGINS="${PLUGINS:+$PLUGINS, }db-explorer"
fi

# ─── Always Recommended ──────────────────────────────────────
PLUGINS="${PLUGINS:+$PLUGINS, }git-workflow"
PLUGINS="${PLUGINS:+$PLUGINS, }hooks-toolkit"

# ─── Output ──────────────────────────────────────────────────
if [ -n "$STACK" ] || [ -n "$FRAMEWORKS" ]; then
  echo "=== Workspace Detected ==="
  [ -n "$STACK" ] && echo "Stack: $STACK"
  [ -n "$FRAMEWORKS" ] && echo "Frameworks: $FRAMEWORKS"
  if [ -n "$PLUGINS" ]; then
    echo ""
    echo "Recommended Fourmis plugins:"
    # Deduplicate and format
    echo "$PLUGINS" | tr ',' '\n' | sed 's/^ *//' | sort -u | while read -r p; do
      [ -n "$p" ] && echo "  - $p"
    done
    echo ""
    echo "Install: claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/<name>"
  fi
  echo "=== End Workspace ==="
fi

exit 0
