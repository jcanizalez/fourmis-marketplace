import * as fs from "node:fs";
import * as path from "node:path";
import {
  SECRET_PATTERNS,
  VULN_PATTERNS,
  SCANNABLE_EXTENSIONS,
  BINARY_EXTENSIONS,
  SKIP_DIRS,
  type SecretPattern,
  type VulnPattern,
} from "./patterns.js";

// --- Finding types ---

export interface Finding {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line: number;
  match: string;
  category: "secret" | "vulnerability" | "config";
  cwe?: string;
  description?: string;
}

// --- File collection ---

export function collectFiles(
  dir: string,
  maxFiles = 5000,
  maxFileSize = 512 * 1024
): string[] {
  const files: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > 15 || files.length >= maxFiles) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // Skip binary files
        if (BINARY_EXTENSIONS.has(ext)) continue;

        // Include known scannable extensions + extensionless files like Dockerfile
        const basename = entry.name.toLowerCase();
        if (
          SCANNABLE_EXTENSIONS.has(ext) ||
          basename === "dockerfile" ||
          basename === "makefile" ||
          basename === ".gitignore" ||
          basename === ".dockerignore" ||
          basename === ".npmrc" ||
          basename === ".env"
        ) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size <= maxFileSize) {
              files.push(fullPath);
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    }
  }

  walk(dir, 0);
  return files;
}

// --- Line-by-line scanner ---

function scanLines(
  content: string,
  filePath: string,
  patterns: (SecretPattern | VulnPattern)[],
  category: "secret" | "vulnerability"
): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments — basic heuristic
    const trimmed = line.trimStart();
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*")
    ) {
      // Still scan comments for secrets — they often contain real credentials
      if (category !== "secret") continue;
    }

    for (const pattern of patterns) {
      if (pattern.pattern.test(line)) {
        // Mask the match for display
        const matchText = line.trim().slice(0, 120);
        const masked = maskSecret(matchText, category === "secret");

        findings.push({
          id: pattern.id,
          name: pattern.name,
          severity: pattern.severity,
          file: filePath,
          line: i + 1,
          match: masked,
          category,
          cwe: "cwe" in pattern ? pattern.cwe : undefined,
          description: "description" in pattern ? pattern.description : undefined,
        });

        // Only one match per pattern per line
        break;
      }
    }
  }

  return findings;
}

function maskSecret(text: string, isSecret: boolean): string {
  if (!isSecret) return text;
  // Mask potential credential values
  return text.replace(
    /(?:=|:\s*)["']?([a-zA-Z0-9+/=\-_]{8,})/g,
    (full, value: string) => {
      if (value.length < 8) return full;
      const visible = value.slice(0, 4);
      return full.replace(value, visible + "****");
    }
  );
}

// --- Public scanner functions ---

export function scanSecrets(dir: string): Finding[] {
  const files = collectFiles(dir);
  const findings: Finding[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const relPath = path.relative(dir, file);
      findings.push(...scanLines(content, relPath, SECRET_PATTERNS, "secret"));
    } catch {
      // skip unreadable files
    }
  }

  return findings;
}

export function scanCode(dir: string): Finding[] {
  const files = collectFiles(dir);
  const findings: Finding[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    // Only scan code files
    if (![".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rb", ".php"].includes(ext)) continue;

    try {
      const content = fs.readFileSync(file, "utf-8");
      const relPath = path.relative(dir, file);
      findings.push(...scanLines(content, relPath, VULN_PATTERNS, "vulnerability"));
    } catch {
      // skip unreadable files
    }
  }

  return findings;
}

export function scanEnvFiles(dir: string): {
  findings: Finding[];
  envFiles: { path: string; inGitignore: boolean; variableCount: number; sensitiveVars: string[] }[];
} {
  const files = collectFiles(dir);
  const findings: Finding[] = [];
  const envFiles: { path: string; inGitignore: boolean; variableCount: number; sensitiveVars: string[] }[] = [];

  // Check .gitignore
  let gitignoreContent = "";
  const gitignorePath = path.join(dir, ".gitignore");
  try {
    gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  } catch {
    // no .gitignore
  }

  const sensitiveKeys = [
    "password", "secret", "key", "token", "auth", "credential",
    "private", "api_key", "apikey", "access_token", "client_secret",
    "database_url", "db_password", "smtp_password", "jwt_secret",
  ];

  for (const file of files) {
    const basename = path.basename(file).toLowerCase();
    if (!basename.startsWith(".env") && !basename.endsWith(".env")) continue;

    const relPath = path.relative(dir, file);

    try {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));

      const vars = lines.filter((l) => l.includes("="));
      const sensitive = vars
        .map((l) => l.split("=")[0].trim().toLowerCase())
        .filter((key) => sensitiveKeys.some((s) => key.includes(s)));

      // Check if .env is in .gitignore
      const inGitignore =
        gitignoreContent.includes(".env") ||
        gitignoreContent.includes(basename) ||
        gitignoreContent.includes(relPath);

      envFiles.push({
        path: relPath,
        inGitignore,
        variableCount: vars.length,
        sensitiveVars: sensitive,
      });

      if (!inGitignore && sensitive.length > 0) {
        findings.push({
          id: "env-not-gitignored",
          name: "Env File with Secrets Not in .gitignore",
          severity: "critical",
          file: relPath,
          line: 0,
          match: `${relPath} contains ${sensitive.length} sensitive variable(s) but is not in .gitignore`,
          category: "config",
        });
      }

      // Scan for actual secret values in env files
      findings.push(...scanLines(content, relPath, SECRET_PATTERNS, "secret"));
    } catch {
      // skip
    }
  }

  return { findings, envFiles };
}

export function checkFilePermissions(dir: string): Finding[] {
  const findings: Finding[] = [];
  const sensitiveFiles = [".env", ".env.local", ".env.production", "credentials.json", "service-account.json", "id_rsa", "id_ed25519"];

  for (const file of sensitiveFiles) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      const mode = stat.mode;
      // Check if world-readable (others have read permission)
      const worldReadable = (mode & 0o004) !== 0;
      // Check if world-writable
      const worldWritable = (mode & 0o002) !== 0;

      if (worldReadable) {
        findings.push({
          id: "world-readable-sensitive",
          name: "Sensitive File World-Readable",
          severity: "high",
          file,
          line: 0,
          match: `${file} is world-readable (mode: ${(mode & 0o777).toString(8)})`,
          category: "config",
        });
      }
      if (worldWritable) {
        findings.push({
          id: "world-writable-sensitive",
          name: "Sensitive File World-Writable",
          severity: "critical",
          file,
          line: 0,
          match: `${file} is world-writable (mode: ${(mode & 0o777).toString(8)})`,
          category: "config",
        });
      }
    } catch {
      // file doesn't exist — that's fine
    }
  }

  return findings;
}

// --- Report helpers ---

export function severityScore(severity: string): number {
  switch (severity) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => severityScore(b.severity) - severityScore(a.severity)
  );
}

export function gradeFindings(findings: Finding[]): {
  grade: string;
  score: number;
  summary: string;
} {
  const criticals = findings.filter((f) => f.severity === "critical").length;
  const highs = findings.filter((f) => f.severity === "high").length;
  const mediums = findings.filter((f) => f.severity === "medium").length;

  // Score: start at 100, deduct per finding
  let score = 100;
  score -= criticals * 15;
  score -= highs * 8;
  score -= mediums * 3;
  score = Math.max(0, Math.min(100, score));

  let grade: string;
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";

  const summary =
    criticals + highs === 0
      ? "No critical or high severity issues found."
      : `${criticals} critical, ${highs} high severity issue(s) require attention.`;

  return { grade, score, summary };
}
