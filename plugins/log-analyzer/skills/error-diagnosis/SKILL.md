---
description: When the user asks to debug an error, analyze a stack trace, diagnose a crash or exception, find the root cause of a bug, understand an error message, or asks about error patterns and common failure modes
---

# Error Diagnosis

Systematic approach to diagnosing errors from stack traces, error messages, and logs. Covers Node.js, Python, Go, and common infrastructure errors.

## Error Diagnosis Framework

### Step 1: Read the Error

```
1. What is the error type? (TypeError, ConnectionRefused, OOM, etc.)
2. What is the error message? (the human-readable description)
3. Where did it happen? (file, line, function from stack trace)
4. When did it start? (check timestamps for first occurrence)
5. What changed? (recent deploys, config changes, traffic spike)
```

### Step 2: Classify the Error

| Category | Examples | Typical Cause |
|----------|----------|---------------|
| **Runtime** | TypeError, NullPointerException, panic | Code bug, missing validation |
| **Network** | ECONNREFUSED, timeout, DNS failure | Service down, firewall, DNS |
| **Resource** | OOM, disk full, too many open files | Leak, insufficient capacity |
| **Permission** | EACCES, 403, EPERM | File permissions, IAM, auth |
| **Configuration** | Missing env var, invalid config | Deployment issue, missing secret |
| **Data** | Constraint violation, parse error | Bad input, schema mismatch |
| **Dependency** | Module not found, version conflict | Missing install, version mismatch |

### Step 3: Investigate

```
1. Check surrounding log lines (context before/after the error)
2. Check if it's intermittent or consistent
3. Check if it affects all users or specific ones
4. Check recent changes (git log, deploy history)
5. Check system metrics (CPU, memory, disk, network)
6. Reproduce in a controlled environment if possible
```

## Stack Trace Analysis

### Node.js / TypeScript

```
TypeError: Cannot read properties of undefined (reading 'email')
    at processUser (/app/src/services/user.ts:45:23)
    at async UserController.update (/app/src/controllers/user.ts:78:5)
    at async /app/src/middleware/error-handler.ts:12:7
```

**How to read it:**
1. **First line**: Error type + message → `user.email` accessed when `user` is `undefined`
2. **Second line**: Where it happened → `user.ts`, line 45, column 23, in `processUser`
3. **Rest**: Call chain leading to the error (most recent first)
4. **Fix**: Add null check before accessing `.email`

```typescript
// Before (crashes)
const email = user.email;

// After (safe)
const email = user?.email;
if (!email) {
  throw new Error(`User ${userId} has no email`);
}
```

### Common Node.js Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `TypeError: Cannot read properties of undefined` | Accessing property on null/undefined | Add null checks, use optional chaining |
| `TypeError: X is not a function` | Wrong type, missing import, stale closure | Check imports, verify the value's type |
| `RangeError: Maximum call stack size exceeded` | Infinite recursion | Add base case, check for circular refs |
| `Error: ENOENT: no such file or directory` | File doesn't exist at path | Check path, use `path.resolve()`, verify cwd |
| `Error: ECONNREFUSED` | Target service not running | Check service status, port, firewall |
| `Error: listen EADDRINUSE` | Port already in use | Kill process on port, use a different port |
| `SyntaxError: Unexpected token` | Invalid JSON, syntax error | Validate input, check file encoding |
| `Error: MODULE_NOT_FOUND` | Missing dependency | Run `npm install`, check import path |

### Python

```
Traceback (most recent call last):
  File "/app/src/services/user.py", line 45, in process_user
    email = user["email"]
  File "/app/src/controllers/user.py", line 78, in update
    result = await process_user(user_data)
KeyError: 'email'
```

**How to read it (bottom-up):**
1. **Last line**: Error type + key → `KeyError: 'email'` — dictionary missing the key
2. **First traceback entry**: Where it happened → `user.py`, line 45
3. **Read bottom-up**: Python tracebacks show the call chain oldest-first

```python
# Before (crashes)
email = user["email"]

# After (safe)
email = user.get("email")
if email is None:
    raise ValueError(f"User {user_id} has no email")
```

### Common Python Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `KeyError` | Dictionary key doesn't exist | Use `.get()` with default |
| `AttributeError: 'NoneType'` | Method on None | Add null check before access |
| `ImportError: No module named` | Missing package or wrong path | `pip install`, check `PYTHONPATH` |
| `IndentationError` | Mixed tabs/spaces or wrong indent | Fix whitespace, use formatter |
| `ConnectionRefusedError` | Service not running | Check service, port, firewall |
| `PermissionError: [Errno 13]` | File permission denied | Check file permissions, run as correct user |
| `JSONDecodeError` | Invalid JSON input | Validate before parsing |
| `RecursionError` | Infinite recursion | Add base case |

### Go

```
goroutine 1 [running]:
main.processUser(...)
    /app/cmd/server/main.go:45
main.handleUpdate(0xc0000b4000)
    /app/cmd/server/handlers.go:78 +0x1a3
net/http.HandlerFunc.ServeHTTP(...)
    /usr/local/go/src/net/http/server.go:2166 +0x2f
```

**How to read it:**
1. **First line**: Goroutine state → `[running]` means it's the active goroutine
2. **Function + file:line**: Where the panic happened
3. **Arguments**: Memory addresses (usually not helpful directly)
4. **Read top-down**: Go stack traces show most recent first

### Common Go Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `runtime error: invalid memory address or nil pointer dereference` | Nil pointer access | Check for nil before use |
| `fatal error: concurrent map writes` | Map written from multiple goroutines | Use `sync.Mutex` or `sync.Map` |
| `context deadline exceeded` | Timeout | Increase timeout or optimize |
| `dial tcp: connection refused` | Service not running | Check service availability |
| `too many open files` | File descriptor leak | Close files/connections, increase ulimit |
| `out of memory` | Memory leak or insufficient RAM | Profile with pprof, increase limits |

## Infrastructure Errors

### HTTP Status Codes

| Code | Meaning | Common Cause | Action |
|------|---------|------------|--------|
| 400 | Bad Request | Invalid input, malformed JSON | Check request body/params |
| 401 | Unauthorized | Missing/expired auth token | Re-authenticate |
| 403 | Forbidden | No permission for resource | Check IAM/RBAC policies |
| 404 | Not Found | Wrong URL, deleted resource | Check URL path and routing |
| 408 | Timeout | Slow processing | Optimize query/logic, increase timeout |
| 429 | Too Many Requests | Rate limited | Back off, implement retry with jitter |
| 500 | Internal Server Error | Unhandled exception | Check server logs |
| 502 | Bad Gateway | Upstream service down | Check upstream, health checks |
| 503 | Service Unavailable | Overloaded, deploying | Wait, check capacity |
| 504 | Gateway Timeout | Upstream too slow | Increase upstream timeout, optimize |

### Database Errors

| Error | Meaning | Fix |
|-------|---------|-----|
| `connection refused` | DB not running or wrong host/port | Check DB status, connection string |
| `too many connections` | Connection pool exhausted | Increase pool size, check for leaks |
| `deadlock detected` | Competing transactions | Retry with backoff, fix query order |
| `duplicate key value` | Unique constraint violation | Check for existing record first |
| `relation does not exist` | Table/view missing | Run migrations |
| `permission denied` | DB user lacks privileges | Grant required permissions |
| `statement timeout` | Query too slow | Add indexes, optimize query |

### DNS and Network

| Error | Meaning | Fix |
|-------|---------|-----|
| `ENOTFOUND` / `getaddrinfo` | DNS resolution failed | Check hostname, DNS config |
| `ECONNREFUSED` | Connection actively rejected | Service not running on that port |
| `ETIMEDOUT` | Connection timed out | Firewall blocking, service overloaded |
| `ECONNRESET` | Connection dropped | Server crashed, load balancer timeout |
| `EHOSTUNREACH` | Host unreachable | Network issue, wrong IP/subnet |
| `CERT_HAS_EXPIRED` | SSL certificate expired | Renew certificate |

## Root Cause Analysis Template

When investigating a production incident:

```markdown
## Incident: [Brief description]

### Timeline
- **[HH:MM]** First error detected
- **[HH:MM]** Impact confirmed — [who/what affected]
- **[HH:MM]** Root cause identified
- **[HH:MM]** Fix deployed
- **[HH:MM]** Recovery confirmed

### Root Cause
[What actually broke and why]

### Contributing Factors
1. [Missing validation/monitoring/test]
2. [Configuration that made it possible]
3. [Process gap that allowed it]

### Impact
- **Users affected**: [N]
- **Duration**: [Xm]
- **Data loss**: [None/description]

### Fix
[What was done to resolve it]

### Prevention
1. [Action item — who — when]
2. [Action item — who — when]
```
