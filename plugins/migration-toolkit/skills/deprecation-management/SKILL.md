---
description: When the user asks about deprecating code, features, or APIs, sunset planning, end-of-life announcements, migration guides for deprecated features, managing technical debt from deprecations, or tracking deprecated usage across a codebase
---

# Deprecation Management

Systematic approach to deprecating code, features, and services. Covers sunset planning, codebase-wide deprecation tracking, migration communication, and safe removal timelines.

## Deprecation Lifecycle

```
Announce → Warn → Restrict → Sunset → Remove
   │         │        │         │        │
   │         │        │         │        └─ Delete dead code
   │         │        │         └─ Return errors/redirects
   │         │        └─ Rate limit or block new usage
   │         └─ Compiler/runtime warnings
   └─ Blog post, changelog, in-code annotation
```

## Code-Level Deprecation

### TypeScript / JavaScript

```typescript
/**
 * @deprecated Use `getUserProfile()` instead. Will be removed in v3.0.
 * @see getUserProfile
 */
function getUser(id: string): User {
  console.warn(
    `[DEPRECATED] getUser() is deprecated. Use getUserProfile() instead. ` +
    `Will be removed in v3.0. Called from: ${new Error().stack?.split('\n')[2]?.trim()}`
  );
  return getUserProfile(id);
}

// Modern approach: TypeScript overload with JSDoc
/** @deprecated Use the object form: `createUser({ name, email })` */
function createUser(name: string, email: string): User;
function createUser(input: CreateUserInput): User;
function createUser(nameOrInput: string | CreateUserInput, email?: string): User {
  if (typeof nameOrInput === 'string') {
    // Legacy path — log deprecation
    logDeprecation('createUser-positional-args', {
      migration: 'Use createUser({ name, email }) instead',
      removeBy: '2026-06-01',
    });
    return createUserImpl({ name: nameOrInput, email: email! });
  }
  return createUserImpl(nameOrInput);
}
```

### Go

```go
// Deprecated: Use GetUserProfile instead. Will be removed in v3.0.
func GetUser(id string) (*User, error) {
    log.Printf("DEPRECATED: GetUser is deprecated, use GetUserProfile instead")
    return GetUserProfile(id)
}

// Using the staticcheck-compatible deprecation comment
// Deprecated: Use [NewClient] with [WithTimeout] option.
func NewClientWithTimeout(timeout time.Duration) *Client {
    return NewClient(WithTimeout(timeout))
}
```

### Python

```python
import warnings
from functools import wraps

def deprecated(message: str, remove_in: str = ""):
    """Decorator to mark functions as deprecated."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            warnings.warn(
                f"{func.__name__} is deprecated. {message}"
                + (f" Will be removed in {remove_in}." if remove_in else ""),
                DeprecationWarning,
                stacklevel=2,
            )
            return func(*args, **kwargs)
        return wrapper
    return decorator

@deprecated("Use get_user_profile() instead", remove_in="v3.0")
def get_user(user_id: str) -> User:
    return get_user_profile(user_id)
```

## Deprecation Tracking

### Centralized Registry

```typescript
// lib/deprecation-registry.ts
interface DeprecationEntry {
  id: string;
  description: string;
  alternative: string;
  announcedDate: string;
  removeAfter: string;
  usageCount?: number;
  owners: string[];
}

const DEPRECATIONS: DeprecationEntry[] = [
  {
    id: 'legacy-auth-header',
    description: 'X-API-Key header authentication',
    alternative: 'Authorization: Bearer <token> (OAuth2)',
    announcedDate: '2025-12-01',
    removeAfter: '2026-06-01',
    owners: ['auth-team'],
  },
  {
    id: 'v1-users-endpoint',
    description: 'GET /api/v1/users',
    alternative: 'GET /api/v2/users',
    announcedDate: '2026-01-15',
    removeAfter: '2026-07-15',
    owners: ['api-team'],
  },
];

// Check which deprecations are past their removal date
function getOverdueDeprecations(): DeprecationEntry[] {
  const now = new Date();
  return DEPRECATIONS.filter(d => new Date(d.removeAfter) < now);
}

// Generate deprecation report
function generateReport(): string {
  const overdue = getOverdueDeprecations();
  const upcoming = DEPRECATIONS
    .filter(d => new Date(d.removeAfter) >= new Date())
    .sort((a, b) => a.removeAfter.localeCompare(b.removeAfter));

  return [
    `# Deprecation Report — ${new Date().toISOString().split('T')[0]}`,
    '',
    `## Overdue (${overdue.length})`,
    ...overdue.map(d => `- ❌ **${d.id}** — should have been removed by ${d.removeAfter}`),
    '',
    `## Upcoming (${upcoming.length})`,
    ...upcoming.map(d => `- ⏳ **${d.id}** — remove after ${d.removeAfter} (${d.alternative})`),
  ].join('\n');
}
```

### Finding Deprecated Usage in Codebase

```bash
# Find @deprecated JSDoc annotations
grep -rn "@deprecated" --include="*.ts" --include="*.tsx" src/

# Find deprecated Go functions (staticcheck style)
grep -rn "// Deprecated:" --include="*.go" .

# Find Python deprecation warnings
grep -rn "DeprecationWarning\|@deprecated" --include="*.py" .

# Find usage of a deprecated function
grep -rn "getUser\b" --include="*.ts" --include="*.tsx" src/ | grep -v "getUserProfile"

# Count deprecated function calls for prioritization
grep -rc "getUser\b" --include="*.ts" src/ | grep -v ":0$" | sort -t: -k2 -nr
```

## Sunset Planning Template

```markdown
## Sunset Plan: [Feature/API Name]

### Summary
- **What**: [Description of what's being deprecated]
- **Why**: [Reason — replaced by X, low usage, maintenance burden]
- **Alternative**: [What to use instead]
- **Timeline**: [Announcement] → [Sunset date]

### Impact Assessment
- **Users affected**: [Number/percentage of active users]
- **API consumers**: [Number of API keys hitting deprecated endpoints]
- **Internal usage**: [List of internal services depending on this]
- **Revenue impact**: [Any paying customers affected?]

### Timeline
| Date | Phase | Action |
|------|-------|--------|
| Month 0 | Announce | Blog post, email, changelog, in-app banner |
| Month 1 | Warn | Add deprecation headers/warnings |
| Month 2 | Guide | Publish migration guide with code examples |
| Month 3 | Restrict | Block new signups/usage of deprecated feature |
| Month 4 | Throttle | Reduce rate limits on deprecated endpoints |
| Month 6 | Sunset | Return 410 Gone / remove feature |
| Month 7 | Cleanup | Remove dead code, close related issues |

### Communication Plan
| Audience | Channel | Message | Timing |
|----------|---------|---------|--------|
| All users | Blog | Announcement post | Month 0 |
| API consumers | Email | Personalized migration notice | Month 0 |
| Heavy users | 1:1 email | Offer migration support | Month 1 |
| Internal teams | Slack | Migration task assignments | Month 0 |
| Support team | Internal doc | FAQ for customer questions | Month 0 |

### Rollback Criteria
If > [X]% of users haven't migrated by [date]:
- Extend timeline by [N] months
- Escalate to [decision maker]
- Consider compatibility shim

### Success Criteria
- [ ] < 1% of traffic hitting deprecated endpoints
- [ ] All internal services migrated
- [ ] No P1/P2 support tickets related to deprecation
- [ ] Dead code removed, codebase smaller
```

## Feature Flags for Gradual Sunset

```typescript
// Use feature flags to gradually sunset a feature
import { getFeatureFlag } from './feature-flags';

function renderDashboard() {
  const showLegacyWidget = getFeatureFlag('legacy-analytics-widget', {
    // Gradually reduce rollout percentage
    // Month 1: 100% → Month 3: 50% → Month 5: 10% → Month 6: 0%
    defaultValue: false,
  });

  if (showLegacyWidget) {
    return <LegacyAnalyticsWidget
      deprecationBanner="This widget is being replaced. Try the new Analytics Dashboard."
    />;
  }

  return <NewAnalyticsDashboard />;
}
```

## API Sunset with Graceful Errors

```typescript
// Return helpful errors after sunset
app.use('/api/v1/*', (req, res) => {
  res.status(410).json({
    error: 'Gone',
    message: 'API v1 has been sunset as of June 2026.',
    migration: {
      docs: 'https://docs.example.com/migration/v1-to-v2',
      newEndpoint: req.path.replace('/v1/', '/v2/'),
      support: 'support@example.com',
    },
  });
});
```

## Dependency Deprecation Tracking

```typescript
// Check for deprecated dependencies in package.json
// Run periodically to catch newly deprecated packages

import { execSync } from 'child_process';

function checkDeprecatedDeps(): string[] {
  const result = execSync('npm outdated --json', { encoding: 'utf-8' });
  const outdated = JSON.parse(result);

  const deprecated: string[] = [];
  for (const [pkg, info] of Object.entries(outdated)) {
    // Check npm registry for deprecation notice
    try {
      const meta = execSync(`npm view ${pkg} deprecated --json`, { encoding: 'utf-8' });
      if (meta.trim() !== 'undefined') {
        deprecated.push(`${pkg}: ${meta.trim()}`);
      }
    } catch {}
  }

  return deprecated;
}
```

## Safe Code Removal

When it's time to remove deprecated code:

```typescript
// Step 1: Verify zero usage (check logs/metrics)
// Step 2: Remove in a single, focused PR
// Step 3: Title the PR clearly

// PR title: "chore: remove deprecated getUser() (sunset complete)"
// PR body should include:
// - Link to original deprecation announcement
// - Metrics showing zero usage
// - Sunset date that has passed
// - Any config/env vars being cleaned up
```

### Removal Checklist

```markdown
## Code Removal Checklist

- [ ] Deprecation period has elapsed (announced date + grace period)
- [ ] Usage metrics confirm zero or near-zero usage
- [ ] All known consumers migrated
- [ ] Internal services updated
- [ ] Tests updated (remove deprecated tests, add sunset tests)
- [ ] Documentation updated (remove old docs, update migration guide)
- [ ] Environment variables / config cleaned up
- [ ] Database columns/tables cleaned up (if applicable)
- [ ] Monitoring removed for deprecated feature
- [ ] PR is focused — only removes deprecated code, no other changes
```

## Checklist

- [ ] Deprecation announced with clear timeline and alternative
- [ ] In-code deprecation annotations with migration instructions
- [ ] Centralized deprecation registry maintained
- [ ] Usage of deprecated features tracked (logs, metrics, grep)
- [ ] Migration guide published with code examples
- [ ] Sunset date enforced (410 Gone / removal)
- [ ] Dead code removed after sunset
- [ ] Communication sent to all affected users at each phase
- [ ] Feature flags used for gradual rollout of replacement
- [ ] Rollback plan defined if migration adoption is too low
