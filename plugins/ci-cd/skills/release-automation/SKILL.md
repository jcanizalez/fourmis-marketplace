# Release Automation

Automate releases — semantic versioning, changelog generation, GitHub Releases, npm publishing, and version bumping workflows.

## When to Activate

When the user asks to:
- Set up automated releases
- Generate changelogs
- Publish to npm or other registries
- Implement semantic versioning in CI
- Create a release workflow
- Automate version bumping

## Semantic Versioning (SemVer)

```
MAJOR.MINOR.PATCH
  │      │     │
  │      │     └── Bug fixes, patches (backward compatible)
  │      └──────── New features (backward compatible)
  └─────────────── Breaking changes
```

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| Bug fix | PATCH | 1.2.3 → 1.2.4 |
| New feature | MINOR | 1.2.3 → 1.3.0 |
| Breaking change | MAJOR | 1.2.3 → 2.0.0 |

## Conventional Commits for Release Automation

```
feat: add user registration        → MINOR bump
fix: correct email validation      → PATCH bump
feat!: redesign auth API           → MAJOR bump (breaking)
fix(auth): handle expired tokens   → PATCH bump

BREAKING CHANGE: footer            → MAJOR bump
```

## Release Please (Google)

Automated release PRs based on conventional commits:

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          release-type: node  # or python, go, etc.

      # Publish to npm when a release is created
      - uses: actions/checkout@v4
        if: ${{ steps.release.outputs.release_created }}
      - uses: actions/setup-node@v4
        if: ${{ steps.release.outputs.release_created }}
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci && npm publish
        if: ${{ steps.release.outputs.release_created }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Manual Release Workflow

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for changelog

      - name: Generate changelog
        id: changelog
        run: |
          # Get commits since last tag
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "$PREV_TAG" ]; then
            CHANGES=$(git log $PREV_TAG..HEAD --pretty=format:"- %s (%h)" --no-merges)
          else
            CHANGES=$(git log --pretty=format:"- %s (%h)" --no-merges)
          fi
          echo "changes<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          body: |
            ## Changes
            ${{ steps.changelog.outputs.changes }}
          generate_release_notes: true

      # Build and attach artifacts
      - run: npm ci && npm run build
      - run: tar czf dist.tar.gz dist/
      - uses: softprops/action-gh-release@v2
        with:
          files: dist.tar.gz
```

## npm Publishing

```yaml
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Scoped Package Publishing

```yaml
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## PyPI Publishing

```yaml
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # For trusted publishing
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install build
      - run: python -m build
      - uses: pypa/gh-action-pypi-publish@release/v1
        # No API token needed with trusted publishing!
```

## Go Module Releasing

Go modules are released by pushing version tags:

```yaml
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

```bash
# Manual release process
git tag v1.2.3
git push origin v1.2.3
# Go modules are auto-published via git tags
```

## Pre-Release Workflow

```yaml
      - uses: docker/metadata-action@v5
        with:
          tags: |
            # v1.2.3 → latest + 1.2.3 + 1.2
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            # v1.2.3-rc.1 → rc tag only (not latest)
            type=semver,pattern={{version}},enable=${{ contains(github.ref, '-rc') }}
```

## Changelog Best Practices

### CHANGELOG.md Format

```markdown
# Changelog

## [1.3.0] - 2026-02-28

### Added
- User registration with email verification
- OAuth2 support for GitHub and Google

### Changed
- Upgraded to Node.js 22
- Improved error messages for validation failures

### Fixed
- Fixed race condition in session management
- Corrected timezone handling in date formatting

### Security
- Updated dependencies to patch CVE-2026-1234
```

### Automated Changelog Categories

Map conventional commits to changelog sections:
- `feat:` → Added
- `fix:` → Fixed
- `perf:` → Changed
- `docs:` → Documentation
- `BREAKING CHANGE` → Breaking Changes
- `security:` or `deps:` with security advisories → Security
