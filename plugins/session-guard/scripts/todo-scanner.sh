#!/usr/bin/env bash
# todo-scanner.sh — Stop hook
# Scans modified files for TODO, FIXME, HACK, and stub patterns.
# Blocks session end if incomplete work is detected.
# Prevents the #1 problem in autonomous sessions: omissions.

set -euo pipefail

INPUT=$(cat)

# Find project root
find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.git" ]; then
      echo "$dir"
      return
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)
cd "$PROJECT_ROOT"

# Get files modified in current session (uncommitted + last 5 commits)
MODIFIED_FILES=""

# Uncommitted changes
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  MODIFIED_FILES=$(git diff --name-only HEAD 2>/dev/null || echo "")
  STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")
  MODIFIED_FILES=$(printf "%s\n%s" "$MODIFIED_FILES" "$STAGED")
fi

# Recently committed files (last 5 commits, skip merges)
RECENT=$(git log --oneline -5 --diff-filter=ACMR --name-only --no-merges 2>/dev/null | grep -v '^[a-f0-9]' || echo "")
MODIFIED_FILES=$(printf "%s\n%s" "$MODIFIED_FILES" "$RECENT")

# Deduplicate and filter to existing source files only
MODIFIED_FILES=$(echo "$MODIFIED_FILES" | sort -u | grep -v '^$' | grep -E '\.(ts|tsx|js|jsx|py|go|rs|rb|java|kt|swift|c|cpp|h)$' || echo "")

if [ -z "$MODIFIED_FILES" ]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Scan for incomplete work patterns
TODOS=""
TODO_COUNT=0

while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ ! -f "$file" ] && continue

  # Search for TODO/FIXME/HACK/XXX markers
  MATCHES=$(grep -nE '(TODO|FIXME|HACK|XXX)\b' "$file" 2>/dev/null || echo "")

  # Search for stub patterns: throw new Error("not implemented"), pass, panic("todo")
  STUBS=$(grep -nE '(throw new Error\("not implemented|NotImplementedError|todo!|unimplemented!|panic\("todo|panic\("not implemented|pass\s*#\s*todo)' "$file" 2>/dev/null || echo "")

  # Search for placeholder content: "...", placeholder, lorem ipsum
  PLACEHOLDERS=$(grep -nE '(placeholder|"\.\.\."|lorem ipsum)' "$file" 2>/dev/null || echo "")

  COMBINED=$(printf "%s\n%s\n%s" "$MATCHES" "$STUBS" "$PLACEHOLDERS" | grep -v '^$' || echo "")

  if [ -n "$COMBINED" ]; then
    FILE_COUNT=$(echo "$COMBINED" | wc -l | tr -d ' ')
    TODO_COUNT=$((TODO_COUNT + FILE_COUNT))
    # Take first 3 matches per file
    FIRST_MATCHES=$(echo "$COMBINED" | head -3)
    TODOS="${TODOS}\n${file}:\n${FIRST_MATCHES}\n"
  fi
done <<< "$MODIFIED_FILES"

if [ "$TODO_COUNT" -gt 0 ]; then
  # Escape newlines and quotes for JSON
  DETAILS=$(echo -e "$TODOS" | head -20 | tr '"' "'" | tr '\n' ' ' | sed 's/  */ /g')
  echo "{\"decision\": \"block\", \"reason\": \"📋 INCOMPLETE WORK: Found $TODO_COUNT TODO/FIXME/stub markers in modified files. Complete these before ending the session: $DETAILS\"}"
  exit 0
fi

echo '{"decision": "approve"}'
