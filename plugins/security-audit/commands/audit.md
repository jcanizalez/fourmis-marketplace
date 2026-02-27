---
name: audit
description: Run a comprehensive security audit on the current project or a specified directory
allowed-tools: sec_report, sec_detect_secrets, sec_scan_code, sec_scan_dependencies, sec_scan_env, sec_audit_config, sec_check_permissions
---

# /audit — Security Audit

Run a full security scan on your project and get a graded report.

## Usage

```
/audit                          # Audit the current project
/audit <directory>              # Audit a specific directory
/audit secrets                  # Only scan for hardcoded secrets
/audit deps                     # Only check dependencies
/audit code                     # Only scan code vulnerabilities
/audit env                      # Only check .env files
/audit config                   # Only audit configuration
```

## Examples

```
/audit
/audit /Users/me/my-project
/audit secrets
/audit deps
```

## Process

1. **No arguments or directory path**: Run `sec_report` for a full scan with grade
2. **"secrets"**: Run `sec_detect_secrets` only
3. **"deps" or "dependencies"**: Run `sec_scan_dependencies` only
4. **"code"**: Run `sec_scan_code` only
5. **"env"**: Run `sec_scan_env` only
6. **"config"**: Run `sec_audit_config` only
7. Present findings sorted by severity with actionable recommendations

## Notes

- All scanning is local — no data leaves your machine
- Pattern-based detection may produce false positives — verify in context
- For HTTP header checks, use `/headers <url>` instead
