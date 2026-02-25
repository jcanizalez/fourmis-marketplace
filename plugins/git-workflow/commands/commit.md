---
name: commit
description: Stage changes and create a conventional commit with a well-crafted message
---

# Commit Command

When the user runs `/commit`, help them create a proper conventional commit.

## Steps

1. **Check status**: Run `git status` and `git diff` (staged and unstaged) to understand what changed
2. **Stage files**: If nothing is staged, suggest which files to stage based on the changes. Ask the user which files to include if unclear. Prefer staging specific files over `git add -A`
3. **Analyze changes**: Read the staged diff carefully to understand the purpose of the changes
4. **Choose type**: Select the most appropriate conventional commit type (feat, fix, refactor, docs, test, chore, etc.)
5. **Write message**: Draft a concise commit message following the Conventional Commits spec
6. **Pre-commit check**: Quickly scan for debug code, secrets, or merge conflict markers in the staged diff
7. **Commit**: Create the commit using a HEREDOC for proper multi-line formatting

## Rules

- Always use imperative mood: "add feature" not "added feature"
- Keep the first line under 72 characters
- Add a body if the change needs explanation (the WHY, not the WHAT)
- Never commit files that look like they contain secrets (.env, credentials, tokens)
- If changes span multiple concerns, suggest splitting into separate commits
- Show the user the proposed message before committing and ask for confirmation

## Example Flow

```
User: /commit

→ Run git status, git diff --staged
→ "I see you've added a new user validation function and fixed the email regex.
   These look like two separate changes. Want me to:
   1. Commit both together as: feat(auth): add user validation with email regex fix
   2. Split into two commits?

   I recommend option 2 for cleaner history."

→ User picks option
→ Create the commit(s)
```
