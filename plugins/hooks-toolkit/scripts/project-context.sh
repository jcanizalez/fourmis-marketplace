#!/bin/bash
# project-context.sh — SessionStart hook
# Loads useful project context at the start of each session.
# Outputs plain text that gets added to Claude's context.

echo "=== Project Context ==="

# Git info
if git rev-parse --git-dir &>/dev/null 2>&1; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  LAST_COMMIT=$(git log --oneline -1 2>/dev/null)
  UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  STASH_COUNT=$(git stash list 2>/dev/null | wc -l | tr -d ' ')

  echo ""
  echo "Git:"
  echo "  Branch: $BRANCH"
  echo "  Last commit: $LAST_COMMIT"
  [ "$UNCOMMITTED" -gt 0 ] && echo "  Uncommitted changes: $UNCOMMITTED files"
  [ "$STASH_COUNT" -gt 0 ] && echo "  Stashed changes: $STASH_COUNT"

  # Recent activity (last 5 commits)
  echo ""
  echo "Recent commits:"
  git log --oneline -5 2>/dev/null | sed 's/^/  /'
fi

# TODOs/FIXMEs count
TODO_COUNT=$(grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" . 2>/dev/null | grep -v node_modules | grep -v .git | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt 0 ]; then
  echo ""
  echo "TODOs/FIXMEs: $TODO_COUNT markers in source files"
fi

# Package manager detection
echo ""
echo "Stack:"
[ -f "package.json" ] && echo "  Node.js ($(node --version 2>/dev/null || echo 'not in PATH'))"
[ -f "go.mod" ] && echo "  Go ($(go version 2>/dev/null | awk '{print $3}' || echo 'not in PATH'))"
[ -f "Cargo.toml" ] && echo "  Rust ($(rustc --version 2>/dev/null | awk '{print $2}' || echo 'not in PATH'))"
[ -f "requirements.txt" ] || [ -f "pyproject.toml" ] && echo "  Python ($(python3 --version 2>/dev/null | awk '{print $2}' || echo 'not in PATH'))"

echo ""
echo "=== End Context ==="
