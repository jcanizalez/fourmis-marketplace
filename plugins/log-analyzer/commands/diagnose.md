---
name: diagnose
description: Debug an error from a stack trace, error message, or log output — identify root cause and suggest fixes
---

# /diagnose — Error Diagnosis

Analyze an error, stack trace, or failure to identify the root cause and suggest fixes.

## Usage

```
/diagnose <file:line>           # Diagnose error at a specific location
/diagnose paste                 # Analyze a pasted stack trace or error
/diagnose <log-file> --last     # Diagnose the most recent error in a log file
/diagnose <log-file> --all      # Summarize all distinct error types in a log file
```

## Examples

```
/diagnose src/services/payment.ts:45
/diagnose paste
/diagnose app.log --last
/diagnose /var/log/app.log --all
```

## Process

1. **file:line**: Read the file around the specified line, identify the error-prone code, explain the issue, and suggest a fix
2. **paste**: Ask the user to paste a stack trace or error output, then:
   - Identify the error type and message
   - Read the source file at the stack trace location
   - Explain why the error occurred
   - Suggest a fix with code example
3. **--last**: Find the most recent error in the log file and diagnose it
4. **--all**: Group all errors by type/message, show frequency, and diagnose the top 3

## Output Format

```
## Diagnosis: [Error Type]

**Error**: [message]
**Location**: [file:line:column]
**Category**: [Runtime / Network / Resource / Permission / Data]

### Root Cause
[Explanation of why this happened]

### Fix
[Code example showing the fix]

### Prevention
[How to prevent this class of error in the future]
```

## Notes

- Supports Node.js, Python, Go, and Java stack traces
- For HTTP errors (4xx, 5xx), explains the status code and common causes
- For database errors, explains the constraint or connection issue
- Cross-references with the error-diagnosis skill for comprehensive analysis
