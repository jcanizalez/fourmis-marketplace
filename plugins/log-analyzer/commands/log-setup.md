---
name: log-setup
description: Set up structured logging for a project — configure pino, structlog, or slog with best practices
---

# /log-setup — Configure Structured Logging

Set up production-ready structured logging for your project.

## Usage

```
/log-setup                      # Auto-detect project type and configure logging
/log-setup node                 # Set up Pino for Node.js/TypeScript
/log-setup python               # Set up structlog for Python
/log-setup go                   # Set up slog for Go
/log-setup --with-otel          # Include OpenTelemetry trace correlation
/log-setup --with-request-log   # Include HTTP request logging middleware
```

## Examples

```
/log-setup
/log-setup node --with-request-log
/log-setup python --with-otel
/log-setup go --with-request-log --with-otel
```

## Process

1. **Auto-detect**: Check for `package.json`, `pyproject.toml`, or `go.mod` to determine the stack
2. **Install dependencies**: Show the install command for the logging library
3. **Create logger module**: Generate a `logger.ts` / `logging_config.py` / `logger.go` file with:
   - JSON output in production, pretty-print in development
   - Configurable log level via environment variable
   - Service name and version in every log line
   - Sensitive field redaction
4. **--with-request-log**: Generate request logging middleware:
   - Request ID generation and propagation
   - Method, path, status, duration on every request
   - Skip health check endpoints
5. **--with-otel**: Add OpenTelemetry trace ID to every log line
6. **Show usage examples**: How to use the logger throughout the codebase

## Output

Creates files in the project:
- Logger configuration module
- Request logging middleware (if requested)
- Environment variable documentation
- Usage examples with child loggers and context binding

## Notes

- Follows the structured-logging skill patterns
- Uses the project's existing code style and conventions
- Adds to existing logging setup if one exists (doesn't overwrite)
- Recommends Pino for Node.js, structlog for Python, slog for Go
