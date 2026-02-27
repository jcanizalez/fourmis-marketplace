---
name: headers
description: Check HTTP security headers for a live URL
allowed-tools: sec_check_headers
---

# /headers — Security Header Check

Audit HTTP security headers for any live URL.

## Usage

```
/headers <url>                  # Check security headers
```

## Examples

```
/headers https://example.com
/headers https://my-app.vercel.app
/headers http://localhost:3000
```

## Process

1. Run `sec_check_headers` with the provided URL
2. Show which headers are present and which are missing
3. Display the overall grade and recommendations

## Notes

- Uses HTTP HEAD request — some servers may return different headers for GET
- Timeout is 10 seconds
- Works with both HTTP and HTTPS URLs
- Check both production and staging URLs for comparison
