---
description: When the user asks to run a security audit, scan code for vulnerabilities, find hardcoded secrets or API keys, check for SQL injection or XSS or command injection patterns, audit dependencies for known vulnerabilities, check HTTP security headers, review .env file exposure, audit file permissions, get a security grade or security report, or asks about pre-deployment security checklists
---

# Security Scanning

Comprehensive local security scanning for codebases — no cloud APIs, no paid subscriptions. Detect secrets, find vulnerabilities, audit configurations, and check HTTP headers.

## When to Activate

When the user asks about:
- Code security review or audit
- Finding hardcoded secrets or credentials
- Dependency vulnerability checking
- Security best practices for their project
- HTTP security header configuration
- Pre-deployment security checklists

## Available Tools

| Tool | Purpose |
|------|---------|
| `sec_detect_secrets` | Find hardcoded API keys, tokens, passwords in source code |
| `sec_scan_code` | Detect vulnerability patterns (SQLi, XSS, command injection) |
| `sec_scan_dependencies` | Audit package.json/requirements.txt for risky packages |
| `sec_scan_env` | Check .env files for exposure and gitignore compliance |
| `sec_audit_config` | Find config misconfigurations (debug mode, default secrets) |
| `sec_check_permissions` | Verify file permissions on sensitive files |
| `sec_check_headers` | Audit HTTP security headers for a live URL |
| `sec_report` | Full security report combining all local scans with a grade |

## Recommended Workflow

### Quick Check (Before Commit)
1. `sec_detect_secrets` — catch any leaked credentials
2. `sec_scan_env` — verify .env files are gitignored

### Pre-Deployment Review
1. `sec_report` — comprehensive scan with grade
2. `sec_check_headers` — verify production security headers

### Full Security Audit
1. `sec_report` — baseline scan
2. `sec_scan_code` — deep dive on code vulnerabilities
3. `sec_scan_dependencies` — dependency risk analysis
4. `sec_check_headers` — HTTP header audit

## Understanding Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| 🔴 Critical | Immediate risk — exposed credentials, SQL injection | Fix immediately |
| 🟠 High | Significant risk — weak crypto, command injection | Fix before release |
| 🟡 Medium | Moderate risk — debug mode, missing headers | Fix in next sprint |
| 🔵 Low | Minor issue — informational leakage | Nice to fix |

## Common Vulnerability Patterns

### SQL Injection (CWE-89)
```
// BAD: Template literal in query
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// GOOD: Parameterized query
db.query("SELECT * FROM users WHERE id = $1", [userId]);
```

### Command Injection (CWE-78)
```
// BAD: String interpolation in exec
exec(`git clone ${repoUrl}`);

// GOOD: Use spawn with arguments array
spawn("git", ["clone", repoUrl]);
```

### XSS (CWE-79)
```
// BAD: Direct innerHTML assignment
element.innerHTML = userInput;

// GOOD: Use textContent or sanitize
element.textContent = userInput;
```

## Security Grades

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90-100 | Excellent — few or no issues |
| B | 80-89 | Good — minor issues only |
| C | 70-79 | Fair — some issues to address |
| D | 60-69 | Poor — significant issues |
| F | 0-59 | Failing — critical issues present |

## Notes

- All scanning is local — no data leaves the machine
- Pattern-based detection has limitations — supplement with manual review
- False positives are possible — verify each finding in context
- Run `sec_report` regularly to track security posture over time
