import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import * as http from "node:http";
import {
  scanSecrets,
  scanCode,
  scanEnvFiles,
  checkFilePermissions,
  collectFiles,
  sortFindings,
  gradeFindings,
  type Finding,
} from "./scanner.js";
import { CONFIG_CHECKS, SECURITY_HEADERS } from "./patterns.js";

const server = new McpServer({
  name: "security-audit",
  version: "1.0.0",
});

// =============================================================================
// Tool 1: sec_scan_dependencies
// =============================================================================

server.tool(
  "sec_scan_dependencies",
  `Scan project dependencies for known vulnerabilities.

Use this tool to audit package.json (npm/Node.js) or requirements.txt (Python) for packages with known security issues. Runs npm audit or pip-audit analysis using local data only.

When to use:
- Before deploying or releasing a project
- When inheriting or reviewing an existing codebase
- As part of a regular security review
- After adding new dependencies

Do NOT use:
- On directories without package.json or requirements.txt
- For non-Node.js/non-Python projects (Go, Rust — use their native audit tools)

Limitations:
- Requires package-lock.json for accurate npm audit results
- Only detects vulnerabilities in the npm/PyPI advisory databases
- Does not scan transitive dependencies without lock files
- Maximum scan depth is 1 directory (no recursive project detection)
- Cannot determine if a vulnerability is actually exploitable in your code

Parameters:
- directory: Absolute path to the project root containing package.json or requirements.txt

Returns: Vulnerability report with package names, severity levels, advisory URLs, and fix recommendations.`,
  { directory: z.string().describe("Absolute path to the project root") },
  async ({ directory }) => {
    try {
      const dir = path.resolve(directory);
      if (!fs.existsSync(dir)) {
        return { content: [{ type: "text", text: `Error: Directory not found: ${dir}` }], isError: true };
      }

      const results: string[] = [];
      const packageJsonPath = path.join(dir, "package.json");
      const lockPath = path.join(dir, "package-lock.json");

      if (fs.existsSync(packageJsonPath)) {
        results.push("## npm Dependency Audit\n");

        try {
          const pkgContent = fs.readFileSync(packageJsonPath, "utf-8");
          const pkg = JSON.parse(pkgContent);
          const deps = Object.keys(pkg.dependencies || {});
          const devDeps = Object.keys(pkg.devDependencies || {});
          results.push(`Dependencies: ${deps.length} production, ${devDeps.length} development\n`);

          if (!fs.existsSync(lockPath)) {
            results.push("⚠️  No package-lock.json found — cannot run full audit.");
            results.push("Run `npm install` to generate a lock file, then re-scan.\n");
          }

          // Check for known risky packages
          const riskyPackages: { name: string; reason: string }[] = [];
          const allDeps = [...deps, ...devDeps];

          const riskyList: Record<string, string> = {
            "event-stream": "Compromised in 2018 with crypto-stealing malware",
            "ua-parser-js": "Had supply chain attack in Oct 2021",
            "colors": "Maintainer intentionally corrupted (v1.4.1+)",
            "faker": "Maintainer intentionally corrupted (v6.6.6)",
            "node-ipc": "Protestware — deletes files based on locale",
            "flatmap-stream": "Known malicious package",
            "left-pad": "Historically unstable — use String.padStart()",
          };

          for (const dep of allDeps) {
            if (riskyList[dep]) {
              riskyPackages.push({ name: dep, reason: riskyList[dep] });
            }
          }

          if (riskyPackages.length > 0) {
            results.push("### ⚠️ Known Risky Packages\n");
            for (const rp of riskyPackages) {
              results.push(`- **${rp.name}**: ${rp.reason}`);
            }
            results.push("");
          }

          // Check for wildcard or git dependencies
          const wildcards: string[] = [];
          const gitDeps: string[] = [];
          for (const [name, version] of [
            ...Object.entries(pkg.dependencies || {}),
            ...Object.entries(pkg.devDependencies || {}),
          ]) {
            const v = version as string;
            if (v === "*" || v === "latest") wildcards.push(name);
            if (v.startsWith("git") || v.includes("github")) gitDeps.push(name);
          }

          if (wildcards.length > 0) {
            results.push(`### ⚠️ Wildcard/Latest Versions (${wildcards.length})\n`);
            results.push("These packages use `*` or `latest` — pin to specific versions:\n");
            for (const w of wildcards) results.push(`- ${w}`);
            results.push("");
          }

          if (gitDeps.length > 0) {
            results.push(`### ⚠️ Git Dependencies (${gitDeps.length})\n`);
            results.push("These install from Git URLs — verify integrity:\n");
            for (const g of gitDeps) results.push(`- ${g}`);
            results.push("");
          }

          // Check for outdated engines
          if (pkg.engines?.node) {
            const nodeVersion = pkg.engines.node;
            results.push(`### Node.js Engine: ${nodeVersion}\n`);
            // Check for very old Node versions
            const match = /(\d+)/.exec(nodeVersion);
            if (match && parseInt(match[1]) < 18) {
              results.push("⚠️  Node.js < 18 is end-of-life — upgrade recommended.\n");
            }
          }

          if (riskyPackages.length === 0 && wildcards.length === 0 && gitDeps.length === 0) {
            results.push("✅ No known risky packages, wildcard versions, or git dependencies found.\n");
          }
        } catch (e) {
          results.push(`Error parsing package.json: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Check requirements.txt
      const reqPath = path.join(dir, "requirements.txt");
      if (fs.existsSync(reqPath)) {
        results.push("## Python Dependency Check\n");
        const content = fs.readFileSync(reqPath, "utf-8");
        const packages = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

        const unpinned = packages.filter((p) => !p.includes("=="));
        if (unpinned.length > 0) {
          results.push(`### ⚠️ Unpinned Packages (${unpinned.length})\n`);
          results.push("Pin versions with `==` for reproducible builds:\n");
          for (const u of unpinned.slice(0, 20)) results.push(`- ${u.trim()}`);
          results.push("");
        } else {
          results.push(`✅ All ${packages.length} packages are pinned.\n`);
        }
      }

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No package.json or requirements.txt found in this directory." }],
        };
      }

      return { content: [{ type: "text", text: results.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  }
);

// =============================================================================
// Tool 2: sec_detect_secrets
// =============================================================================

server.tool(
  "sec_detect_secrets",
  `Scan a project directory for hardcoded secrets, API keys, tokens, and credentials.

Use this tool to find accidentally committed secrets like AWS keys, GitHub tokens, Stripe keys, private keys, database connection strings, and generic passwords or API keys in source code.

When to use:
- Before committing code to a repository
- When auditing a codebase for credential exposure
- As part of a pre-deployment security check
- When reviewing third-party code or pull requests

Do NOT use:
- To scan single files (it scans entire directories recursively)
- For encrypted or binary files
- When you need to validate if a secret is still active (this only detects patterns)

Limitations:
- Pattern-based detection — may produce false positives on test fixtures or examples
- Cannot determine if a detected credential is still active or valid
- Skips node_modules, .git, dist, build, and other common non-source directories
- Maximum 5,000 files per scan, max 512KB per file
- Does not scan binary files or images

Parameters:
- directory: Absolute path to the project root to scan

Returns: List of detected secrets with file paths, line numbers, severity, and masked match text. Secrets are partially masked for safety.`,
  { directory: z.string().describe("Absolute path to the project root") },
  async ({ directory }) => {
    try {
      const dir = path.resolve(directory);
      if (!fs.existsSync(dir)) {
        return { content: [{ type: "text", text: `Error: Directory not found: ${dir}` }], isError: true };
      }

      const findings = scanSecrets(dir);
      const sorted = sortFindings(findings);

      if (sorted.length === 0) {
        return { content: [{ type: "text", text: `✅ No hardcoded secrets detected in ${dir}\n\nScanned ${collectFiles(dir).length} file(s).` }] };
      }

      const lines: string[] = [
        `## Secret Detection Report`,
        `**Directory**: ${dir}`,
        `**Findings**: ${sorted.length}\n`,
      ];

      const bySeverity = {
        critical: sorted.filter((f) => f.severity === "critical"),
        high: sorted.filter((f) => f.severity === "high"),
        medium: sorted.filter((f) => f.severity === "medium"),
        low: sorted.filter((f) => f.severity === "low"),
      };

      for (const [sev, items] of Object.entries(bySeverity)) {
        if (items.length === 0) continue;
        const icon = sev === "critical" ? "🔴" : sev === "high" ? "🟠" : sev === "medium" ? "🟡" : "🔵";
        lines.push(`### ${icon} ${sev.toUpperCase()} (${items.length})\n`);
        for (const f of items) {
          lines.push(`- **${f.name}** — \`${f.file}:${f.line}\``);
          lines.push(`  \`${f.match}\``);
        }
        lines.push("");
      }

      lines.push("---");
      lines.push("💡 **Remediation**: Remove secrets from code, use environment variables or a secrets manager. Rotate any exposed credentials immediately.");

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  }
);

// =============================================================================
// Tool 3: sec_scan_code
// =============================================================================

server.tool(
  "sec_scan_code",
  `Scan source code for common vulnerability patterns like SQL injection, XSS, command injection, and insecure crypto.

Use this tool to find potentially exploitable code patterns in JavaScript, TypeScript, Python, Go, and other languages. Detects CWE-classified vulnerabilities including injection attacks, insecure communication, weak cryptography, and dangerous function usage.

When to use:
- During code review to catch security issues
- Before merging pull requests
- When auditing an unfamiliar codebase
- As part of a security-focused code review

Do NOT use:
- For dependency vulnerability scanning (use sec_scan_dependencies)
- For secret detection (use sec_detect_secrets)
- On non-source-code files (config files, documentation)

Limitations:
- Pattern-based analysis — cannot follow data flow across functions
- May produce false positives on sanitized inputs
- Does not execute code or verify exploitability
- Skips test files by default convention (but scans them for completeness)
- Limited to common web vulnerability patterns (not exhaustive SAST)
- Maximum 5,000 files per scan, max 512KB per file

Parameters:
- directory: Absolute path to the project root to scan

Returns: List of vulnerability findings with file paths, line numbers, CWE references, severity, and remediation context.`,
  { directory: z.string().describe("Absolute path to the project root") },
  async ({ directory }) => {
    try {
      const dir = path.resolve(directory);
      if (!fs.existsSync(dir)) {
        return { content: [{ type: "text", text: `Error: Directory not found: ${dir}` }], isError: true };
      }

      const findings = scanCode(dir);
      const sorted = sortFindings(findings);

      if (sorted.length === 0) {
        return { content: [{ type: "text", text: `✅ No code vulnerability patterns detected in ${dir}\n\nScanned ${collectFiles(dir).length} file(s).` }] };
      }

      const lines: string[] = [
        `## Code Vulnerability Scan`,
        `**Directory**: ${dir}`,
        `**Findings**: ${sorted.length}\n`,
      ];

      for (const f of sorted) {
        const icon = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : f.severity === "medium" ? "🟡" : "🔵";
        lines.push(`### ${icon} ${f.name} [${f.severity.toUpperCase()}]`);
        if (f.cwe) lines.push(`**CWE**: ${f.cwe}`);
        lines.push(`**File**: \`${f.file}:${f.line}\``);
        lines.push(`**Match**: \`${f.match}\``);
        if (f.description) lines.push(`**Issue**: ${f.description}`);
        lines.push("");
      }

      lines.push("---");
      lines.push("💡 **Note**: Pattern-based analysis may produce false positives. Verify each finding in context before applying fixes.");

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  }
);

// =============================================================================
// Tool 4: sec_scan_env
// =============================================================================

server.tool(
  "sec_scan_env",
  `Analyze .env files for security issues — checks for secrets exposure, .gitignore compliance, and sensitive variable detection.

Use this tool to audit environment files (.env, .env.local, .env.production, etc.) for proper handling of secrets and configuration.

When to use:
- When setting up or reviewing a project's environment configuration
- Before committing to verify .env files are properly gitignored
- When auditing what sensitive data is stored in env files
- During security review of deployment configurations

Do NOT use:
- For scanning code for hardcoded secrets (use sec_detect_secrets)
- For non-dotenv configuration files (YAML, TOML, JSON)

Limitations:
- Only scans files matching .env* naming patterns
- Cannot verify if .env values are actually used in the application
- Gitignore check is basic pattern matching, not full gitignore spec
- Does not check for .env files in subdirectories beyond scan depth
- Maximum scan depth of 15 directories

Parameters:
- directory: Absolute path to the project root to scan

Returns: List of .env files found, whether each is gitignored, count of sensitive variables, and any security findings.`,
  { directory: z.string().describe("Absolute path to the project root") },
  async ({ directory }) => {
    try {
      const dir = path.resolve(directory);
      if (!fs.existsSync(dir)) {
        return { content: [{ type: "text", text: `Error: Directory not found: ${dir}` }], isError: true };
      }

      const { findings, envFiles } = scanEnvFiles(dir);

      const lines: string[] = [
        `## Environment File Audit`,
        `**Directory**: ${dir}\n`,
      ];

      if (envFiles.length === 0) {
        lines.push("No .env files found in this directory.");
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      lines.push(`### Env Files Found (${envFiles.length})\n`);
      for (const ef of envFiles) {
        const gitIcon = ef.inGitignore ? "✅" : "❌";
        lines.push(`- **${ef.path}** — ${ef.variableCount} variables, ${gitIcon} gitignored`);
        if (ef.sensitiveVars.length > 0) {
          lines.push(`  Sensitive keys: ${ef.sensitiveVars.join(", ")}`);
        }
      }
      lines.push("");

      if (findings.length > 0) {
        const sorted = sortFindings(findings);
        lines.push(`### Security Findings (${findings.length})\n`);
        for (const f of sorted) {
          const icon = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : "🟡";
          lines.push(`${icon} **${f.name}** [${f.severity.toUpperCase()}]`);
          lines.push(`  ${f.match}`);
        }
      } else {
        lines.push("✅ No security issues found in env files.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  }
);

// =============================================================================
// Tool 5: sec_audit_config
// =============================================================================

server.tool(
  "sec_audit_config",
  `Audit configuration files for security misconfigurations — debug mode, default secrets, exposed ports, missing rate limiting, and more.

Use this tool to check JSON, YAML, TOML, Docker Compose, and code files for common configuration security mistakes.

When to use:
- Before deploying to production
- When reviewing infrastructure or application configuration
- As part of a pre-release security checklist
- When setting up a new project or environment

Do NOT use:
- For scanning code vulnerabilities (use sec_scan_code)
- For checking dependencies (use sec_scan_dependencies)
- On projects with no configuration files

Limitations:
- Checks a fixed set of common misconfigurations (not exhaustive)
- Cannot validate runtime configuration or environment-specific overrides
- Docker Compose checks are basic pattern matching
- Rate limiting detection is heuristic — may miss custom implementations
- Maximum 5,000 files per scan

Parameters:
- directory: Absolute path to the project root to scan

Returns: List of configuration issues with severity, file location, and remediation advice.`,
  { directory: z.string().describe("Absolute path to the project root") },
  async ({ directory }) => {
    try {
      const dir = path.resolve(directory);
      if (!fs.existsSync(dir)) {
        return { content: [{ type: "text", text: `Error: Directory not found: ${dir}` }], isError: true };
      }

      const files = collectFiles(dir);
      const findings: Finding[] = [];

      for (const file of files) {
        const relPath = path.relative(dir, file);
        try {
          const content = fs.readFileSync(file, "utf-8");
          for (const check of CONFIG_CHECKS) {
            const result = check.check(content, relPath);
            if (result.found) {
              findings.push({
                id: check.id,
                name: check.name,
                severity: check.severity,
                file: relPath,
                line: 0,
                match: result.detail,
                category: "config",
              });
            }
          }
        } catch {
          // skip unreadable files
        }
      }

      const sorted = sortFindings(findings);

      if (sorted.length === 0) {
        return { content: [{ type: "text", text: `✅ No configuration issues detected in ${dir}\n\nChecked ${files.length} file(s).` }] };
      }

      const lines: string[] = [
        `## Configuration Audit`,
        `**Directory**: ${dir}`,
        `**Issues**: ${sorted.length}\n`,
      ];

      for (const f of sorted) {
        const icon = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : f.severity === "medium" ? "🟡" : "🔵";
        lines.push(`${icon} **${f.name}** [${f.severity.toUpperCase()}]`);
        lines.push(`  File: \`${f.file}\``);
        lines.push(`  ${f.match}\n`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  }
);

// =============================================================================
// Tool 6: sec_check_permissions
// =============================================================================

server.tool(
  "sec_check_permissions",
  `Check file permissions on sensitive files like .env, credentials, and private keys.

Use this tool to verify that sensitive files have appropriate filesystem permissions (not world-readable or world-writable).

When to use:
- After deploying to a server
- When auditing file security on shared systems
- As part of infrastructure security review
- When checking if credentials files are properly protected

Do NOT use:
- On Windows systems (file permissions work differently)
- For checking Git-tracked permissions (Git has limited permission support)
- When running in a container without real filesystem permissions

Limitations:
- Only checks a predefined list of common sensitive filenames
- Does not recursively search for sensitive files in subdirectories
- Unix/macOS permissions only — not Windows ACLs
- Cannot check permissions on remote filesystems
- Limited to project root directory

Parameters:
- directory: Absolute path to the project root

Returns: Permission report for each sensitive file found, flagging world-readable or world-writable permissions.`,
  { directory: z.string().describe("Absolute path to the project root") },
  async ({ directory }) => {
    try {
      const dir = path.resolve(directory);
      if (!fs.existsSync(dir)) {
        return { content: [{ type: "text", text: `Error: Directory not found: ${dir}` }], isError: true };
      }

      const findings = checkFilePermissions(dir);

      const lines: string[] = [
        `## File Permission Audit`,
        `**Directory**: ${dir}\n`,
      ];

      if (findings.length === 0) {
        lines.push("✅ No sensitive file permission issues found.");
        lines.push("\nChecked: .env, .env.local, .env.production, credentials.json, service-account.json, id_rsa, id_ed25519");
      } else {
        for (const f of sortFindings(findings)) {
          const icon = f.severity === "critical" ? "🔴" : "🟠";
          lines.push(`${icon} **${f.name}** [${f.severity.toUpperCase()}]`);
          lines.push(`  ${f.match}\n`);
        }
        lines.push("💡 **Fix**: `chmod 600 <file>` to restrict access to owner only.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  }
);

// =============================================================================
// Tool 7: sec_check_headers
// =============================================================================

function fetchHeaders(url: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.request(url, { method: "HEAD", timeout: 10000 }, (res) => {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(res.headers)) {
        if (typeof value === "string") headers[key.toLowerCase()] = value;
        else if (Array.isArray(value)) headers[key.toLowerCase()] = value.join(", ");
      }
      resolve(headers);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.end();
  });
}

server.tool(
  "sec_check_headers",
  `Check HTTP security headers for a live URL — analyzes Strict-Transport-Security, Content-Security-Policy, X-Frame-Options, and more.

Use this tool to verify that a web application has proper security headers configured. Checks 7 key security headers and grades the result.

When to use:
- After deploying a web application
- When auditing an existing site's security posture
- To verify security header configuration changes
- As part of a penetration testing or security review

Do NOT use:
- On internal/localhost URLs that are not accessible from this machine
- For non-HTTP services (databases, gRPC, etc.)
- When the target server is behind authentication that blocks HEAD requests

Limitations:
- Only checks response headers — does not test for actual vulnerabilities
- Uses HTTP HEAD request — some servers may return different headers for GET
- Does not follow redirects automatically
- Cannot access sites behind VPN or authentication
- Timeout of 10 seconds per request
- Some CDNs add security headers that the origin server doesn't set

Parameters:
- url: Full URL to check (must start with http:// or https://)

Returns: Security header report with present/missing headers, current values, recommended values, and an overall grade.`,
  { url: z.string().url().describe("Full URL to check (http:// or https://)") },
  async ({ url }) => {
    try {
      const headers = await fetchHeaders(url);

      const lines: string[] = [
        `## Security Header Audit`,
        `**URL**: ${url}\n`,
      ];

      let presentCount = 0;
      const totalHeaders = SECURITY_HEADERS.length;

      for (const sh of SECURITY_HEADERS) {
        const headerName = sh.name.toLowerCase();
        const value = headers[headerName];

        if (value) {
          presentCount++;
          lines.push(`✅ **${sh.name}**: \`${value}\``);
        } else {
          const icon = sh.severity === "high" ? "🔴" : sh.severity === "medium" ? "🟠" : "🟡";
          lines.push(`${icon} **${sh.name}**: Missing`);
          lines.push(`  ${sh.description}`);
          lines.push(`  Recommended: \`${sh.recommended}\``);
        }
        lines.push("");
      }

      // Grade
      const score = Math.round((presentCount / totalHeaders) * 100);
      let grade: string;
      if (score >= 85) grade = "A";
      else if (score >= 70) grade = "B";
      else if (score >= 55) grade = "C";
      else if (score >= 40) grade = "D";
      else grade = "F";

      lines.push(`---`);
      lines.push(`**Grade**: ${grade} (${presentCount}/${totalHeaders} headers present, ${score}%)`);

      // Check for information leakage headers
      const serverHeader = headers["server"];
      const poweredBy = headers["x-powered-by"];
      if (serverHeader || poweredBy) {
        lines.push("\n### Information Leakage\n");
        if (serverHeader) lines.push(`⚠️ **Server**: \`${serverHeader}\` — consider removing to hide server software`);
        if (poweredBy) lines.push(`⚠️ **X-Powered-By**: \`${poweredBy}\` — remove to hide framework information`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  }
);

// =============================================================================
// Tool 8: sec_report
// =============================================================================

server.tool(
  "sec_report",
  `Generate a comprehensive security report for a project — combines secret detection, code scanning, dependency audit, env file analysis, config audit, and file permissions into a single graded report.

Use this tool for a complete security overview of a project. Runs all available local scans and produces a unified report with a security grade (A-F).

When to use:
- For a full security review of a project
- Before a major release or deployment
- When onboarding to a new codebase
- To generate a security baseline or track improvements over time

Do NOT use:
- For quick single-check scans (use specific tools instead for speed)
- On very large monorepos (>10,000 files) — may be slow
- When you only need one specific check type

Limitations:
- Runs all scanners sequentially — may take 10-30 seconds on large projects
- Same limitations as individual tools apply (pattern-based, no data flow analysis)
- Report grade is heuristic — not a formal security assessment
- Does not include HTTP header checks (requires a live URL — use sec_check_headers separately)
- Maximum 5,000 files scanned

Parameters:
- directory: Absolute path to the project root to scan

Returns: Comprehensive security report with grade (A-F), score (0-100), and categorized findings from all scanners.`,
  { directory: z.string().describe("Absolute path to the project root") },
  async ({ directory }) => {
    try {
      const dir = path.resolve(directory);
      if (!fs.existsSync(dir)) {
        return { content: [{ type: "text", text: `Error: Directory not found: ${dir}` }], isError: true };
      }

      const allFindings: Finding[] = [];
      const sections: string[] = [];

      // 1. Secret detection
      const secrets = scanSecrets(dir);
      allFindings.push(...secrets);
      sections.push(`**Secrets**: ${secrets.length} finding(s)`);

      // 2. Code vulnerabilities
      const codeVulns = scanCode(dir);
      allFindings.push(...codeVulns);
      sections.push(`**Code Vulnerabilities**: ${codeVulns.length} finding(s)`);

      // 3. Env files
      const { findings: envFindings, envFiles } = scanEnvFiles(dir);
      allFindings.push(...envFindings);
      sections.push(`**Env Files**: ${envFiles.length} file(s), ${envFindings.length} issue(s)`);

      // 4. File permissions
      const permFindings = checkFilePermissions(dir);
      allFindings.push(...permFindings);
      sections.push(`**File Permissions**: ${permFindings.length} issue(s)`);

      // 5. Config audit
      const files = collectFiles(dir);
      const configFindings: Finding[] = [];
      for (const file of files) {
        const relPath = path.relative(dir, file);
        try {
          const content = fs.readFileSync(file, "utf-8");
          for (const check of CONFIG_CHECKS) {
            const result = check.check(content, relPath);
            if (result.found) {
              configFindings.push({
                id: check.id,
                name: check.name,
                severity: check.severity,
                file: relPath,
                line: 0,
                match: result.detail,
                category: "config",
              });
            }
          }
        } catch { /* skip */ }
      }
      allFindings.push(...configFindings);
      sections.push(`**Config Issues**: ${configFindings.length} finding(s)`);

      // Grade
      const { grade, score, summary } = gradeFindings(allFindings);
      const sorted = sortFindings(allFindings);

      const criticals = sorted.filter((f) => f.severity === "critical").length;
      const highs = sorted.filter((f) => f.severity === "high").length;
      const mediums = sorted.filter((f) => f.severity === "medium").length;
      const lows = sorted.filter((f) => f.severity === "low").length;

      const lines: string[] = [
        `# Security Report`,
        `**Directory**: ${dir}`,
        `**Files Scanned**: ${files.length}`,
        `**Grade**: ${grade} (${score}/100)`,
        `**Total Findings**: ${allFindings.length}`,
        `  🔴 Critical: ${criticals} | 🟠 High: ${highs} | 🟡 Medium: ${mediums} | 🔵 Low: ${lows}\n`,
        `${summary}\n`,
        `## Summary\n`,
        ...sections.map((s) => `- ${s}`),
        "",
      ];

      if (sorted.length > 0) {
        lines.push(`## Top Findings\n`);
        // Show top 20 findings
        for (const f of sorted.slice(0, 20)) {
          const icon = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : f.severity === "medium" ? "🟡" : "🔵";
          lines.push(`${icon} **${f.name}** [${f.severity.toUpperCase()}] — \`${f.file}${f.line ? ":" + f.line : ""}\``);
          if (f.match) lines.push(`  ${f.match}`);
        }
        if (sorted.length > 20) {
          lines.push(`\n...and ${sorted.length - 20} more finding(s). Use specific scan tools for details.`);
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  }
);

// =============================================================================
// Start server
// =============================================================================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Security Audit MCP server running on stdio");
}

main().catch(console.error);
