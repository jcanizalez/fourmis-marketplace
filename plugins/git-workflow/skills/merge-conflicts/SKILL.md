---
description: When the user asks about merge conflicts, resolving conflicts, rebasing, rebase vs merge, interactive rebase, squashing commits, cherry-picking, git stash, recovering lost commits, git reflog, undoing commits, reverting changes, git reset, fixing git mistakes, git worktree, or how to undo a force push
---

# Merge Conflicts, Rebasing & Recovery

Resolve merge conflicts, rebase effectively, recover from git mistakes, and manage complex git operations safely.

## Merge Conflict Resolution

### Understanding Conflict Markers

```
<<<<<<< HEAD (yours)
const API_URL = 'https://api.example.com/v2';
=======
const API_URL = process.env.API_URL || 'https://api.example.com';
>>>>>>> feature/config-api-url (theirs)
```

- **Above `=======`**: Your current branch's version
- **Below `=======`**: The incoming branch's version
- **Resolution**: Keep one, keep both, or write something new — then remove all markers

### Step-by-Step Resolution

```bash
# 1. See which files conflict
git status
# Both modified: src/config.ts
# Both modified: src/api/client.ts

# 2. See the conflict diff
git diff

# 3. Open conflicted file, resolve each conflict block
#    Remove <<<<<<< ======= >>>>>>> markers completely

# 4. After resolving, mark as resolved
git add src/config.ts src/api/client.ts

# 5. Continue the merge/rebase
git merge --continue    # if merging
git rebase --continue   # if rebasing

# 6. If things go wrong, abort
git merge --abort       # undo the merge attempt
git rebase --abort      # undo the rebase attempt
```

### Common Conflict Patterns

| Pattern | Resolution Strategy |
|---------|-------------------|
| Both modified same line | Understand intent, combine manually |
| One added, one deleted | Decide if the feature/fix is still needed |
| File renamed + modified | Accept rename, apply modifications |
| Both added new file | Merge contents or rename one file |
| Lockfile conflicts | Accept either, then re-run install |

### Lockfile Conflicts (Most Common)

```bash
# package-lock.json / pnpm-lock.yaml conflicts:
# NEVER manually merge lockfiles

# Accept ours and regenerate:
git checkout --ours package-lock.json
npm install
git add package-lock.json

# Or accept theirs:
git checkout --theirs package-lock.json
npm install
git add package-lock.json
```

## Rebase vs Merge

### When to Rebase

```bash
# Update your feature branch with latest main (before PR)
git checkout feature/my-work
git fetch origin
git rebase origin/main

# Result: your commits replay on top of latest main
# History is linear and clean
```

### When to Merge

```bash
# Merge main into your branch (preserves history)
git checkout feature/my-work
git merge origin/main

# Result: creates a merge commit
# History shows the exact timeline
```

### Decision Guide

| Situation | Use | Why |
|-----------|-----|-----|
| Updating feature branch before PR | **Rebase** | Clean linear history |
| Integrating PR into main | **Merge** (squash) | Single commit per feature |
| Shared branch (multiple people) | **Merge** | Don't rewrite shared history |
| Long-running branch | **Merge** | Rebase will be painful |
| Personal branch, few commits | **Rebase** | Clean history |

**Golden Rule**: Never rebase commits that others have based work on.

## Interactive Rebase

Clean up commits before creating a PR:

```bash
# Rebase last 4 commits interactively
git rebase -i HEAD~4
```

The editor shows:

```
pick a1b2c3d feat: add login form
pick e4f5g6h fix: typo in login form
pick i7j8k9l feat: add validation
pick m0n1o2p fix: validation edge case
```

### Common Operations

```
# Squash fix into its feature commit:
pick a1b2c3d feat: add login form
fixup e4f5g6h fix: typo in login form        # squash, discard message
pick i7j8k9l feat: add validation
fixup m0n1o2p fix: validation edge case       # squash, discard message

# Reword a commit message:
reword a1b2c3d feat: add login form           # will prompt for new message

# Reorder commits:
pick i7j8k9l feat: add validation
pick a1b2c3d feat: add login form             # moved after validation

# Drop a commit:
drop e4f5g6h fix: typo in login form          # remove entirely
```

| Command | Effect |
|---------|--------|
| `pick` | Keep commit as-is |
| `reword` | Keep commit, edit message |
| `edit` | Pause to amend the commit |
| `squash` | Merge into previous, combine messages |
| `fixup` | Merge into previous, discard message |
| `drop` | Delete the commit |

## Git Stash

Temporarily save uncommitted work:

```bash
# Stash everything (tracked files)
git stash

# Stash with a name
git stash push -m "WIP: login validation"

# Stash including untracked files
git stash push -u -m "WIP: new feature with new files"

# List stashes
git stash list
# stash@{0}: On feature/login: WIP: login validation
# stash@{1}: On main: quick experiment

# Apply most recent stash (keep in stash list)
git stash apply

# Apply and remove from stash list
git stash pop

# Apply a specific stash
git stash apply stash@{1}

# Drop a stash
git stash drop stash@{0}

# Stash specific files
git stash push -m "just the config" -- src/config.ts
```

### When to Stash

- Switching branches with uncommitted work
- Pulling changes when you have local modifications
- Temporarily shelving work to handle an urgent fix
- Testing something on a clean working directory

## Recovery & Undo

### Undo Last Commit (Keep Changes)

```bash
# Soft reset — uncommit but keep changes staged
git reset --soft HEAD~1

# Mixed reset — uncommit and unstage (changes in working dir)
git reset HEAD~1
```

### Undo Pushed Commit (Safe)

```bash
# Create a NEW commit that undoes the changes (safe for shared branches)
git revert HEAD
# or revert a specific commit
git revert abc123

# Revert multiple commits
git revert HEAD~3..HEAD    # revert last 3 commits
```

### Recover Lost Commits (Reflog)

```bash
# See all recent HEAD movements
git reflog
# abc1234 HEAD@{0}: reset: moving to HEAD~1
# def5678 HEAD@{1}: commit: feat: the commit I lost
# ghi9012 HEAD@{2}: checkout: moving from main to feature

# Recover by checking out or cherry-picking
git cherry-pick def5678    # re-apply the lost commit
# or
git reset --hard def5678   # go back to that point (destructive!)
```

### Recover Deleted Branch

```bash
# Find where the branch was
git reflog | grep "checkout: moving from deleted-branch"

# Recreate it
git checkout -b deleted-branch abc1234
```

### Fix the Wrong Branch

```bash
# Committed to main instead of feature branch?
# 1. Create the feature branch at current position
git branch feature/my-work

# 2. Move main back
git reset --hard HEAD~1    # ⚠️ destructive on main

# 3. Switch to the feature branch
git checkout feature/my-work
```

## Cherry-Pick

Apply specific commits from one branch to another:

```bash
# Apply a single commit
git cherry-pick abc1234

# Apply multiple commits
git cherry-pick abc1234 def5678

# Cherry-pick without committing (just stage changes)
git cherry-pick --no-commit abc1234

# If conflicts arise during cherry-pick
git cherry-pick --continue   # after resolving
git cherry-pick --abort      # cancel the operation
```

### When to Cherry-Pick

- Backporting a fix to a release branch
- Applying a specific commit from a feature branch
- Moving a commit that was made on the wrong branch

## Git Worktree

Work on multiple branches simultaneously without stashing:

```bash
# Create a worktree for a different branch
git worktree add ../my-project-hotfix hotfix/urgent-fix
# Now you have two directories, each on a different branch

# List worktrees
git worktree list

# Remove when done
git worktree remove ../my-project-hotfix
```

### When to Use Worktrees

- Reviewing a PR while working on your own branch
- Hotfix on main while keeping your feature branch open
- Running tests on one branch while coding on another
- Comparing behavior between branches side-by-side

## Recover from Force Push

If someone (or you) accidentally force-pushed to a shared branch:

```bash
# On a teammate's machine that still has the old commits:
git reflog show origin/main
# Find the commit before the force push

# Push the correct history back
git push origin <correct-commit>:main --force-with-lease

# Better: always use --force-with-lease instead of --force
# It refuses if the remote has commits you haven't fetched
git push --force-with-lease origin feature/my-branch
```

## Checklist

- [ ] Always check `git status` before and after conflict resolution
- [ ] Never manually edit lockfiles — accept one side and regenerate
- [ ] Use `rebase` for personal branches, `merge` for shared branches
- [ ] Clean up commits with interactive rebase before creating PRs
- [ ] Use `git revert` (not reset) for undoing pushed commits
- [ ] Know about `git reflog` — it's your safety net for recovery
- [ ] Stash work before switching branches with uncommitted changes
- [ ] Test after resolving conflicts — don't assume the merge is correct
- [ ] Use `--force-with-lease` instead of `--force` when force-pushing
