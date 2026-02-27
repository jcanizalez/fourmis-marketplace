// --- Security scanning patterns ---

export interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
}

export const SECRET_PATTERNS: SecretPattern[] = [
  // API Keys & Tokens
  {
    id: "aws-access-key",
    name: "AWS Access Key ID",
    pattern: /(?:^|[^a-zA-Z0-9])(AKIA[0-9A-Z]{16})(?:[^a-zA-Z0-9]|$)/,
    severity: "critical",
  },
  {
    id: "aws-secret-key",
    name: "AWS Secret Access Key",
    pattern: /(?:aws_secret_access_key|aws_secret_key|secret_key)\s*[=:]\s*["']?([a-zA-Z0-9/+=]{40})["']?/i,
    severity: "critical",
  },
  {
    id: "github-token",
    name: "GitHub Token",
    pattern: /(?:^|[^a-zA-Z0-9])(gh[ps]_[a-zA-Z0-9]{36,255})(?:[^a-zA-Z0-9]|$)/,
    severity: "critical",
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth Token",
    pattern: /(?:^|[^a-zA-Z0-9])(gho_[a-zA-Z0-9]{36,255})(?:[^a-zA-Z0-9]|$)/,
    severity: "critical",
  },
  {
    id: "slack-token",
    name: "Slack Token",
    pattern: /(?:^|[^a-zA-Z0-9])(xox[bprs]-[a-zA-Z0-9\-]{10,255})(?:[^a-zA-Z0-9]|$)/,
    severity: "critical",
  },
  {
    id: "stripe-secret",
    name: "Stripe Secret Key",
    pattern: /(?:^|[^a-zA-Z0-9])(sk_live_[a-zA-Z0-9]{20,255})(?:[^a-zA-Z0-9]|$)/,
    severity: "critical",
  },
  {
    id: "stripe-restricted",
    name: "Stripe Restricted Key",
    pattern: /(?:^|[^a-zA-Z0-9])(rk_live_[a-zA-Z0-9]{20,255})(?:[^a-zA-Z0-9]|$)/,
    severity: "high",
  },
  {
    id: "google-api-key",
    name: "Google API Key",
    pattern: /(?:^|[^a-zA-Z0-9])(AIza[0-9A-Za-z\-_]{35})(?:[^a-zA-Z0-9]|$)/,
    severity: "high",
  },
  {
    id: "openai-api-key",
    name: "OpenAI API Key",
    pattern: /(?:^|[^a-zA-Z0-9])(sk-[a-zA-Z0-9]{20,255})(?:[^a-zA-Z0-9]|$)/,
    severity: "critical",
  },
  {
    id: "anthropic-api-key",
    name: "Anthropic API Key",
    pattern: /(?:^|[^a-zA-Z0-9])(sk-ant-[a-zA-Z0-9\-]{20,255})(?:[^a-zA-Z0-9]|$)/,
    severity: "critical",
  },
  // Generic patterns
  {
    id: "private-key",
    name: "Private Key",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    severity: "critical",
  },
  {
    id: "generic-password",
    name: "Hardcoded Password",
    pattern: /(?:password|passwd|pwd)\s*[=:]\s*["'][^"']{8,}["']/i,
    severity: "high",
  },
  {
    id: "generic-secret",
    name: "Hardcoded Secret",
    pattern: /(?:secret|token|api_key|apikey|access_key)\s*[=:]\s*["'][a-zA-Z0-9+/=\-_]{16,}["']/i,
    severity: "high",
  },
  {
    id: "connection-string",
    name: "Database Connection String",
    pattern: /(?:mongodb\+srv|postgres(?:ql)?|mysql|mssql):\/\/[^\s"']+:[^\s"']+@[^\s"']+/i,
    severity: "critical",
  },
  {
    id: "jwt-token",
    name: "JWT Token",
    pattern: /(?:^|[^a-zA-Z0-9])(eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})(?:[^a-zA-Z0-9]|$)/,
    severity: "high",
  },
  {
    id: "basic-auth",
    name: "Basic Auth Header",
    pattern: /(?:authorization|auth)\s*[=:]\s*["']?Basic\s+[a-zA-Z0-9+/=]{10,}["']?/i,
    severity: "high",
  },
];

// --- Code vulnerability patterns ---

export interface VulnPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  cwe: string;
  description: string;
  languages: string[];
}

export const VULN_PATTERNS: VulnPattern[] = [
  // SQL Injection
  {
    id: "sql-injection-template",
    name: "SQL Injection (Template Literal)",
    pattern: /(?:query|exec|execute|prepare|raw)\s*\(\s*`[^`]*\$\{/,
    severity: "critical",
    cwe: "CWE-89",
    description: "SQL query built with template literals may be vulnerable to injection",
    languages: ["javascript", "typescript"],
  },
  {
    id: "sql-injection-concat",
    name: "SQL Injection (String Concatenation)",
    pattern: /(?:query|exec|execute)\s*\(\s*["'][^"']*["']\s*\+\s*(?!["'])/,
    severity: "critical",
    cwe: "CWE-89",
    description: "SQL query built with string concatenation may be vulnerable to injection",
    languages: ["javascript", "typescript", "python", "go"],
  },
  {
    id: "sql-injection-fstring",
    name: "SQL Injection (f-string)",
    pattern: /(?:cursor\.execute|\.query)\s*\(\s*f["'][^"']*\{/,
    severity: "critical",
    cwe: "CWE-89",
    description: "SQL query built with f-string may be vulnerable to injection",
    languages: ["python"],
  },
  // XSS
  {
    id: "xss-innerhtml",
    name: "XSS (innerHTML)",
    pattern: /\.innerHTML\s*=\s*(?!["']<)/,
    severity: "high",
    cwe: "CWE-79",
    description: "Setting innerHTML with dynamic content may enable cross-site scripting",
    languages: ["javascript", "typescript"],
  },
  {
    id: "xss-dangerously-set",
    name: "XSS (dangerouslySetInnerHTML)",
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/,
    severity: "medium",
    cwe: "CWE-79",
    description: "dangerouslySetInnerHTML usage — ensure input is sanitized",
    languages: ["javascript", "typescript"],
  },
  {
    id: "xss-document-write",
    name: "XSS (document.write)",
    pattern: /document\.write\s*\(/,
    severity: "high",
    cwe: "CWE-79",
    description: "document.write with dynamic content may enable cross-site scripting",
    languages: ["javascript", "typescript"],
  },
  // Command Injection
  {
    id: "cmd-injection-exec",
    name: "Command Injection (exec)",
    pattern: /(?:child_process|exec|execSync|spawn)\s*\(\s*(?:`[^`]*\$\{|["'][^"']*["']\s*\+)/,
    severity: "critical",
    cwe: "CWE-78",
    description: "Shell command built with dynamic input may be vulnerable to injection",
    languages: ["javascript", "typescript"],
  },
  {
    id: "cmd-injection-os-system",
    name: "Command Injection (os.system)",
    pattern: /os\.system\s*\(\s*(?:f["']|["'][^"']*["']\s*\+|\s*[a-zA-Z])/,
    severity: "critical",
    cwe: "CWE-78",
    description: "os.system with dynamic input may be vulnerable to command injection",
    languages: ["python"],
  },
  {
    id: "cmd-injection-subprocess",
    name: "Command Injection (subprocess shell=True)",
    pattern: /subprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True/,
    severity: "high",
    cwe: "CWE-78",
    description: "subprocess with shell=True may be vulnerable to command injection",
    languages: ["python"],
  },
  // Path Traversal
  {
    id: "path-traversal",
    name: "Path Traversal",
    pattern: /(?:readFile|writeFile|readFileSync|createReadStream|open)\s*\(\s*(?:`[^`]*\$\{|[a-zA-Z_]+\s*\+|path\.join\s*\([^)]*(?:req\.|params\.|query\.))/,
    severity: "high",
    cwe: "CWE-22",
    description: "File operation with user input may allow path traversal attacks",
    languages: ["javascript", "typescript"],
  },
  // Crypto weaknesses
  {
    id: "weak-hash-md5",
    name: "Weak Hash (MD5)",
    pattern: /(?:createHash|hashlib\.md5|MD5\.Create|md5sum)\s*\(\s*["']?md5["']?\s*\)/i,
    severity: "medium",
    cwe: "CWE-328",
    description: "MD5 is cryptographically broken — use SHA-256 or better",
    languages: ["javascript", "typescript", "python", "go"],
  },
  {
    id: "weak-hash-sha1",
    name: "Weak Hash (SHA-1)",
    pattern: /createHash\s*\(\s*["']sha1["']\s*\)/,
    severity: "medium",
    cwe: "CWE-328",
    description: "SHA-1 is deprecated for security — use SHA-256 or better",
    languages: ["javascript", "typescript"],
  },
  {
    id: "hardcoded-iv",
    name: "Hardcoded Initialization Vector",
    pattern: /(?:createCipheriv|createDecipheriv)\s*\([^,]+,\s*[^,]+,\s*(?:Buffer\.from\s*\(\s*["']|new Uint8Array\s*\(\s*\[)/,
    severity: "high",
    cwe: "CWE-329",
    description: "Hardcoded IV weakens encryption — use random IV for each operation",
    languages: ["javascript", "typescript"],
  },
  // Insecure communication
  {
    id: "no-tls-verify",
    name: "TLS Verification Disabled",
    pattern: /(?:NODE_TLS_REJECT_UNAUTHORIZED|rejectUnauthorized)\s*[=:]\s*(?:['"]?0['"]?|false)/,
    severity: "high",
    cwe: "CWE-295",
    description: "TLS certificate verification disabled — vulnerable to MITM attacks",
    languages: ["javascript", "typescript"],
  },
  {
    id: "http-url-hardcoded",
    name: "Insecure HTTP URL",
    pattern: /["']http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|::1)[a-zA-Z]/,
    severity: "medium",
    cwe: "CWE-319",
    description: "HTTP URL may transmit sensitive data in cleartext — use HTTPS",
    languages: ["javascript", "typescript", "python", "go"],
  },
  // Eval / code execution
  {
    id: "eval-usage",
    name: "Eval Usage",
    pattern: /(?:^|[^a-zA-Z])eval\s*\(/,
    severity: "high",
    cwe: "CWE-95",
    description: "eval() with dynamic input can execute arbitrary code",
    languages: ["javascript", "typescript", "python"],
  },
  {
    id: "new-function",
    name: "Dynamic Function Constructor",
    pattern: /new\s+Function\s*\(/,
    severity: "high",
    cwe: "CWE-95",
    description: "new Function() with dynamic input can execute arbitrary code",
    languages: ["javascript", "typescript"],
  },
  // CORS
  {
    id: "cors-wildcard",
    name: "CORS Wildcard Origin",
    pattern: /(?:Access-Control-Allow-Origin|origin)\s*[=:]\s*["']\*["']/i,
    severity: "medium",
    cwe: "CWE-942",
    description: "CORS wildcard allows any origin — restrict to specific domains",
    languages: ["javascript", "typescript", "python", "go"],
  },
];

// --- Config audit patterns ---

export interface ConfigIssue {
  id: string;
  name: string;
  file_pattern: string;
  check: (content: string, filename: string) => { found: boolean; detail: string };
  severity: "critical" | "high" | "medium" | "low";
}

export const CONFIG_CHECKS: ConfigIssue[] = [
  {
    id: "debug-enabled",
    name: "Debug Mode Enabled",
    file_pattern: "**/*.{json,yaml,yml,toml,env}",
    check: (content) => {
      const match = /(?:debug|DEBUG)\s*[=:]\s*(?:true|1|yes|on)/i.exec(content);
      return { found: !!match, detail: match ? `Debug mode is on: ${match[0]}` : "" };
    },
    severity: "medium",
  },
  {
    id: "default-secret-key",
    name: "Default Secret Key",
    file_pattern: "**/*.{py,json,yaml,yml,env}",
    check: (content) => {
      const patterns = [
        /SECRET_KEY\s*[=:]\s*["'](?:changeme|secret|default|your[_-]?secret|please[_-]?change)/i,
        /SECRET_KEY\s*[=:]\s*["'](?:django-insecure-|xxx|abc123|password)/i,
      ];
      for (const p of patterns) {
        const match = p.exec(content);
        if (match) return { found: true, detail: `Default secret key detected: ${match[0].slice(0, 60)}` };
      }
      return { found: false, detail: "" };
    },
    severity: "critical",
  },
  {
    id: "exposed-port-all-interfaces",
    name: "Service Exposed on All Interfaces",
    file_pattern: "**/{docker-compose,compose}.{yml,yaml}",
    check: (content) => {
      const match = /ports:\s*\n\s*-\s*["']?(\d+):(\d+)/m.exec(content);
      if (match && !content.includes("127.0.0.1")) {
        return { found: true, detail: `Port ${match[1]}:${match[2]} exposed on all interfaces (missing 127.0.0.1 binding)` };
      }
      return { found: false, detail: "" };
    },
    severity: "medium",
  },
  {
    id: "no-rate-limiting",
    name: "No Rate Limiting Detected",
    file_pattern: "**/*.{ts,js,py}",
    check: (content, filename) => {
      if (!/(?:route|router|app\.(?:get|post|put|delete|patch)|@app\.route)/i.test(content)) {
        return { found: false, detail: "" };
      }
      const hasRateLimit = /(?:rate[_-]?limit|throttle|express-rate-limit|slowapi|limiter)/i.test(content);
      return {
        found: !hasRateLimit,
        detail: hasRateLimit ? "" : `API routes in ${filename} without rate limiting`,
      };
    },
    severity: "medium",
  },
];

// --- Security header checks ---

export interface SecurityHeader {
  name: string;
  description: string;
  recommended: string;
  severity: "high" | "medium" | "low";
}

export const SECURITY_HEADERS: SecurityHeader[] = [
  {
    name: "Strict-Transport-Security",
    description: "Enforces HTTPS connections",
    recommended: "max-age=31536000; includeSubDomains",
    severity: "high",
  },
  {
    name: "Content-Security-Policy",
    description: "Prevents XSS and data injection attacks",
    recommended: "default-src 'self'",
    severity: "high",
  },
  {
    name: "X-Content-Type-Options",
    description: "Prevents MIME type sniffing",
    recommended: "nosniff",
    severity: "medium",
  },
  {
    name: "X-Frame-Options",
    description: "Prevents clickjacking",
    recommended: "DENY or SAMEORIGIN",
    severity: "medium",
  },
  {
    name: "Referrer-Policy",
    description: "Controls referrer information sent with requests",
    recommended: "strict-origin-when-cross-origin",
    severity: "low",
  },
  {
    name: "Permissions-Policy",
    description: "Controls browser feature access (camera, mic, geolocation)",
    recommended: "camera=(), microphone=(), geolocation=()",
    severity: "low",
  },
  {
    name: "X-XSS-Protection",
    description: "Legacy XSS filter (deprecated but still checked)",
    recommended: "0 (rely on CSP instead)",
    severity: "low",
  },
];

// --- File extensions to scan ---

export const SCANNABLE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyw",
  ".go",
  ".rb",
  ".java", ".kt",
  ".php",
  ".cs",
  ".rs",
  ".swift",
  ".sh", ".bash", ".zsh",
  ".env", ".env.local", ".env.production", ".env.development",
  ".json", ".yaml", ".yml", ".toml", ".xml",
  ".sql",
  ".tf", ".tfvars",
  ".dockerfile",
  ".conf", ".cfg", ".ini",
]);

export const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
  ".woff", ".woff2", ".ttf", ".eot",
  ".mp3", ".mp4", ".webm", ".ogg",
  ".zip", ".tar", ".gz", ".bz2",
  ".exe", ".dll", ".so", ".dylib",
  ".lock", ".min.js", ".min.css",
]);

export const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  ".cache", "vendor", ".venv", "venv", "target", ".idea", ".vscode",
  "coverage", ".nyc_output", ".tox", "eggs", ".eggs",
]);
