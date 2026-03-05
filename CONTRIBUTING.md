# Contributing to Fourmis Marketplace

This guide covers everything you need to create a Claude Code plugin for the Fourmis Marketplace — from a simple knowledge plugin to a full MCP server with live tools.

## Table of Contents

- [Plugin Types](#plugin-types)
- [Quick Start: Your First Plugin](#quick-start-your-first-plugin)
- [Plugin Manifest](#plugin-manifest)
- [Skills](#skills)
- [Commands](#commands)
- [Agents](#agents)
- [MCP Server Plugins](#mcp-server-plugins)
- [Directory Structure](#directory-structure)
- [Testing & QA](#testing--qa)
- [Submitting a PR](#submitting-a-pr)
- [Style Guide](#style-guide)

---

## Plugin Types

There are two types of plugins:

| Type | What it is | Examples |
|------|-----------|----------|
| **Knowledge plugin** | Markdown-only — skills, commands, agents. No runtime code. | `typescript-patterns`, `git-workflow`, `design-system` |
| **MCP plugin** | Includes a TypeScript MCP server with live tools (database, API, etc.) | `local-crm`, `security-audit`, `seo-toolkit` |

Most plugins are knowledge plugins. Start there unless you need live tool integrations.

---

## Quick Start: Your First Plugin

### 1. Create the directory

```bash
mkdir -p plugins/my-plugin/.claude-plugin
mkdir -p plugins/my-plugin/skills/my-topic
mkdir -p plugins/my-plugin/commands
mkdir -p plugins/my-plugin/agents
```

### 2. Create the manifest

```bash
cat > plugins/my-plugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "One-line description of what this plugin does and who it's for.",
  "author": {
    "name": "Your Name"
  },
  "license": "MIT"
}
EOF
```

### 3. Add a skill

```bash
cat > plugins/my-plugin/skills/my-topic/SKILL.md << 'EOF'
---
description: When the user asks about [topic], [related topic], [specific use case], or needs help with [task]
---

# My Topic

## Overview

Brief introduction to the topic.

## Patterns

### Pattern 1: Basic Usage

```typescript
// Complete, runnable example
function example() {
  return "hello";
}
```

### Pattern 2: Advanced Usage

```typescript
// Another complete example showing a more complex case
```

## Best Practices

- Practice 1 — why it matters
- Practice 2 — when to use it
- Practice 3 — common pitfall to avoid
EOF
```

### 4. Add a command

```bash
cat > plugins/my-plugin/commands/my-command.md << 'EOF'
---
name: my-command
description: What this command does in one sentence
arguments:
  - name: target
    description: File or directory to analyze
    required: false
---

# My Command

When the user runs `/my-command`, do the following:

## Steps

1. **Analyze** — Read the target file or directory
2. **Process** — Apply the relevant patterns
3. **Report** — Present findings in a clear format

## Output Format

Present results as a markdown table or structured list.

## Example

```
User: /my-command src/utils.ts

Output:
| Finding | Severity | Suggestion |
|---------|----------|------------|
| ...     | ...      | ...        |
```
EOF
```

### 5. Add an agent

```bash
cat > plugins/my-plugin/agents/my-expert.md << 'EOF'
---
name: my-expert
description: Expert in [domain] — helps with [task 1], [task 2], and [task 3]
color: "#3178C6"
---

You are an expert in [domain]. You help users with [specific tasks].

## Core Capabilities

1. **Capability 1** — what you can do
2. **Capability 2** — what you can do
3. **Capability 3** — what you can do

## Workflow

When helping with tasks:

1. **Read first** — understand the existing code before suggesting changes
2. **Match the style** — follow the project's conventions
3. **Explain why** — don't just show what, explain the reasoning

## Key Principles

- Principle 1
- Principle 2
- Principle 3
EOF
```

### 6. Install and test

```bash
fourmis plugin install my-plugin
```

Then open Claude Code and try:
- Ask about your topic (skill should activate)
- Run `/my-command` (command should work)
- The agent should appear in your agent list

---

## Plugin Manifest

Every plugin needs `.claude-plugin/plugin.json`:

```json
{
  "$schema": "https://anthropic.com/claude-code/plugin.schema.json",
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Clear description — what it does, who it's for, key features.",
  "author": {
    "name": "Your Name",
    "url": "https://github.com/your-username"
  },
  "license": "MIT",
  "keywords": ["topic", "category", "use-case"]
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique plugin identifier (kebab-case) |
| `version` | Yes | Semver version string |
| `description` | Yes | One paragraph — what it does, features, component count |
| `author.name` | Yes | Author or organization name |
| `author.url` | No | Author homepage or repo URL |
| `license` | No | License identifier (default: MIT) |
| `keywords` | No | Array of tags for discoverability |
| `$schema` | No | Schema URL for validation |

### Description Best Practices

The description appears in the marketplace listing. Make it count:

```
GOOD: "Advanced TypeScript patterns — generics, utility types, type guards,
       Zod validation, Result types, module patterns. 6 skills, 3 commands,
       1 agent. No dependencies."

BAD:  "TypeScript stuff"
BAD:  "A plugin for TypeScript"
```

Include: what it covers, key topics, component count, dependency note.

---

## Skills

Skills are the most powerful component — they activate automatically based on context. When a user asks about a topic covered by your skill, Claude Code pulls in that knowledge.

### File Location

```
plugins/my-plugin/skills/<topic>/SKILL.md
```

Each skill lives in its own subdirectory under `skills/`.

### YAML Frontmatter

```yaml
---
description: When the user asks about [specific topic], [related topic], [use case], or needs help with [task]
---
```

The `description` field is the **trigger**. Claude Code reads this to decide when to activate the skill. Be specific:

```yaml
# GOOD — specific, intent-based triggers
description: When the user asks about React custom hooks, useCallback, useMemo,
  useRef, useReducer, hook composition, debounce hooks, or how to write reusable
  hooks in React

# BAD — too vague, will activate for everything
description: React help

# BAD — too narrow, will rarely activate
description: When the user asks about useCallback
```

### Optional Frontmatter Fields

| Field | Default | Description |
|-------|---------|-------------|
| `description` | (required) | Trigger condition — when to activate |
| `name` | — | Display name for the skill |
| `version` | — | Skill version |
| `alwaysApply` | `false` | If `true`, always included in context |

### Skill Content Structure

After the frontmatter, write markdown documentation:

```markdown
---
description: When the user asks about [topic]...
---

# Topic Name

Brief overview (2-3 sentences).

## Section 1: Fundamentals

### Pattern Name

Explain when to use this pattern.

\`\`\`typescript
// Complete, working example
// Include types, imports, error handling
function realExample(input: string): Result<Output> {
  // ...
}
\`\`\`

### Anti-Pattern

\`\`\`typescript
// BAD — explain why
function badExample() { /* ... */ }

// GOOD — explain why
function goodExample() { /* ... */ }
\`\`\`

## Section 2: Advanced Patterns

...

## Best Practices

- Use bullet points for quick-reference rules
- Explain the "why" not just the "what"
- Include gotchas and common mistakes

## Decision Guide

| Scenario | Use This | Why |
|----------|----------|-----|
| Simple case | Pattern A | Lower complexity |
| Complex case | Pattern B | Better composability |
```

### Content Guidelines

1. **Complete examples** — every code block should be runnable on its own
2. **Real-world patterns** — not toy examples, show production code
3. **Multiple languages** — if applicable, show TypeScript, Python, Go
4. **Progressive disclosure** — basics first, then advanced patterns
5. **Anti-patterns** — show what NOT to do and explain why
6. **Decision guides** — tables comparing when to use which approach

---

## Commands

Commands are slash commands (`/command-name`) that users invoke explicitly.

### File Location

```
plugins/my-plugin/commands/<command-name>.md
```

Command files go directly in the `commands/` directory (no subdirectories).

### YAML Frontmatter

```yaml
---
name: my-command
description: What this command does in one sentence
arguments:
  - name: target
    description: File or directory to analyze
    required: false
  - name: format
    description: "Output format: table, json, or markdown"
    required: false
---
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Command name (kebab-case, no `/` prefix) |
| `description` | Yes | One-line description shown in command list |
| `arguments` | No | Array of argument definitions |
| `arguments[].name` | Yes | Argument name |
| `arguments[].description` | Yes | What the argument is for |
| `arguments[].required` | No | Whether the argument is mandatory (default: false) |

### Command Body Structure

After the frontmatter, write instructions for Claude Code:

```markdown
---
name: review-code
description: Run a structured code review on a file or PR
arguments:
  - name: target
    description: File path, directory, or PR number
    required: true
---

# Code Review Command

When the user runs `/review-code`, perform a structured code review.

## Steps

1. **Read the code** — Use the Read tool to examine the target
2. **Analyze** — Check for issues in these categories:
   - Type safety
   - Error handling
   - Performance
   - Security
3. **Report** — Present findings using the format below

## Output Format

### Summary
One paragraph overview of the code quality.

### Findings

| # | Category | Severity | File:Line | Issue | Suggestion |
|---|----------|----------|-----------|-------|------------|
| 1 | Security | High     | auth.ts:42 | ... | ... |

### Verdict
APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION

## Rules

- Never modify code unless explicitly asked
- Focus on substance, not style (ignore formatting nitpicks)
- If the code is good, say so — don't invent issues
```

### Tips

- Use `$ARGUMENTS` in the body to reference user-provided arguments
- Keep steps numbered and clear — Claude follows them sequentially
- Include output format examples so results are consistent
- Add rules/constraints to prevent unwanted behavior

---

## Agents

Agents are specialized AI personas with domain expertise. They appear in the agent selector and can be invoked for focused work.

### File Location

```
plugins/my-plugin/agents/<agent-name>.md
```

### YAML Frontmatter

```yaml
---
name: my-expert
description: One-line description of the agent's role and capabilities
color: "#3178C6"
---
```

Or with full options:

```yaml
---
name: my-expert
description: Expert in [domain] that helps with [tasks]
when-to-use: When the user asks about [topic], needs help with [task], or says "[trigger phrase]"
model: sonnet
colors:
  light: "#3178C6"
  dark: "#5A9BD5"
tools:
  - Read
  - Glob
  - Bash
  - Grep
---
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Agent identifier (kebab-case) |
| `description` | Yes | What the agent does — shown in agent list |
| `color` | No | Hex color for the agent avatar |
| `colors.light` | No | Light theme color |
| `colors.dark` | No | Dark theme color |
| `model` | No | Model to use (`haiku`, `sonnet`, `opus`) |
| `when-to-use` | No | When Claude should suggest this agent |
| `tools` | No | List of tools the agent can use |

### Agent Body Structure

```markdown
---
name: go-expert
description: Idiomatic Go expert — concurrency, error handling, interfaces, HTTP, testing, project structure
color: "#00ADD8"
---

You are a Go expert. You write idiomatic, production-ready Go code.

## Core Capabilities

1. **Concurrency** — goroutines, channels, sync primitives, errgroup
2. **Error Handling** — wrapping, sentinel errors, custom types
3. **HTTP Servers** — net/http, middleware, graceful shutdown
4. **Testing** — table-driven tests, benchmarks, fuzzing
5. **Project Structure** — cmd/internal layout, modules, linting

## Workflow

1. **Read first** — understand the codebase before writing
2. **Match conventions** — follow the project's existing patterns
3. **Write tests** — every non-trivial function gets a test
4. **Handle errors** — never ignore errors, always wrap with context

## Key Principles

- **Simplicity** — the Go way. No clever abstractions.
- **Explicit over implicit** — return errors, don't panic
- **Composition** — interfaces and embedding, not inheritance
- **Standard library first** — reach for third-party only when needed

## Style

- Concise explanations, working code
- Show idiomatic Go, not Java-in-Go
- When reviewing, focus on Go-specific patterns
```

### Color Palette Guide

Pick a color that represents the domain:

| Domain | Suggested Color | Hex |
|--------|----------------|-----|
| TypeScript | Blue | `#3178C6` |
| React | Cyan | `#61DAFB` |
| Go | Teal | `#00ADD8` |
| Python | Yellow | `#FFD43B` |
| DevOps | Orange | `#FF6F00` |
| Security | Red | `#E74C3C` |
| Database | Green | `#2ECC71` |
| AI/ML | Purple | `#7C3AED` |
| Productivity | Emerald | `#10B981` |
| Design | Pink | `#EC4899` |

---

## MCP Server Plugins

MCP (Model Context Protocol) plugins include a TypeScript server that provides live tools — database queries, API calls, file processing, etc.

### Additional Files Required

On top of the standard plugin files, MCP plugins need:

```
plugins/my-mcp-plugin/
├── .mcp.json           # MCP server configuration
├── package.json        # Node.js package manifest
├── tsconfig.json       # TypeScript configuration
├── .gitignore          # Ignore node_modules/, dist/
├── src/
│   └── index.ts        # MCP server implementation
└── dist/               # Compiled output (gitignored)
```

### `.mcp.json`

```json
{
  "my-mcp-plugin": {
    "type": "stdio",
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/dist/index.js"],
    "env": {
      "MY_DATA_DIR": "${CLAUDE_PLUGIN_ROOT}/data"
    }
  }
}
```

- The key is your MCP server name (matches tool prefixes)
- `type` is always `"stdio"` for Claude Code
- Use `${CLAUDE_PLUGIN_ROOT}` to reference the plugin directory
- `env` is optional — use it for configuration

### `package.json`

```json
{
  "name": "@fourmis/my-mcp-plugin",
  "version": "1.0.0",
  "description": "What this MCP server does.",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.6.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  },
  "license": "MIT"
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

### `.gitignore`

```
node_modules/
dist/
data/*.db
```

### MCP Server Template (`src/index.ts`)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-mcp-plugin",
  version: "1.0.0",
});

// Define a tool
server.tool(
  "my_tool_name",
  "What this tool does — shown in tool list",
  {
    // Input schema using Zod
    param1: z.string().describe("Description of param1"),
    param2: z.number().optional().describe("Optional param"),
  },
  async ({ param1, param2 }) => {
    // Tool implementation
    const result = await doSomething(param1, param2);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### Building & Testing MCP Plugins

```bash
cd plugins/my-mcp-plugin

# Install dependencies
npm install

# Build
npm run build

# Test locally
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

---

## Directory Structure

### Knowledge Plugin

```
plugins/my-plugin/
├── .claude-plugin/
│   └── plugin.json         # Required — manifest
├── skills/
│   ├── topic-one/
│   │   └── SKILL.md        # Auto-activating knowledge
│   └── topic-two/
│       └── SKILL.md
├── commands/
│   ├── do-thing.md          # /do-thing slash command
│   └── check-thing.md       # /check-thing slash command
├── agents/
│   └── my-expert.md         # Specialized agent persona
└── hooks/                   # Optional — event-driven automation
    └── pre-commit.md
```

### MCP Plugin

```
plugins/my-mcp-plugin/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json                # MCP server configuration
├── .gitignore               # node_modules/, dist/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts             # MCP server code
├── skills/
│   └── usage-guide/
│       └── SKILL.md
├── commands/
│   └── setup.md
└── agents/
    └── my-agent.md
```

### Auto-Discovery

Claude Code automatically discovers components by directory name:

| Directory | Discovered As | Notes |
|-----------|--------------|-------|
| `skills/*/SKILL.md` | Skills | Each skill in its own subdirectory |
| `commands/*.md` | Slash commands | Filename becomes `/command-name` |
| `agents/*.md` | Agent personas | Appears in agent selector |
| `hooks/*.md` | Event hooks | Triggered by events (PreToolUse, PostToolUse, etc.) |
| `.mcp.json` | MCP servers | Live tool integrations |

No registration needed — just put files in the right directories.

---

## Testing & QA

Before submitting, verify your plugin works:

### Checklist

- [ ] `fourmis plugin install my-plugin` — installs without errors
- [ ] Skills activate when asking about the topic naturally
- [ ] Commands run successfully with `/command-name`
- [ ] Agent appears in the agent selector (if applicable)
- [ ] MCP tools are listed and functional (if applicable)
- [ ] Code examples compile/run (no syntax errors, complete imports)
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] `.gitignore` excludes `node_modules/` and `dist/` (MCP plugins)

### Testing Skills

Open Claude Code with the plugin installed and try natural prompts:

```
"How do I use generics in TypeScript?"     → should activate TypeScript skill
"Help me write a Dockerfile"               → should activate Docker skill
"What's the best way to handle errors?"    → should activate relevant skill
```

### Testing Commands

```
/my-command                    → should work with no arguments
/my-command src/index.ts       → should work with arguments
/my-command --help             → should show usage (if documented)
```

### Testing MCP Plugins

```bash
# Build first
cd plugins/my-mcp-plugin && npm run build

# Verify tools list
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js

# Install and test in Claude Code
fourmis plugin install my-mcp-plugin
# Then use the tools in conversation
```

---

## Submitting a PR

### 1. Fork & Create Branch

```bash
git checkout -b feat/my-plugin
```

### 2. Add Your Plugin

Follow the directory structure above. Make sure your plugin is under `plugins/`.

### 3. Update the Marketplace Index

Add your plugin to `.claude-plugin/marketplace.json`:

```json
{
  "name": "my-plugin",
  "description": "Full description with features and component count.",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "source": "./plugins/my-plugin",
  "category": "development"
}
```

### Categories

| Category | Description |
|----------|-------------|
| `development` | Language patterns, frameworks, engineering practices |
| `devops` | CI/CD, containers, infrastructure, monitoring |
| `productivity` | Workflows, project management, business tools |
| `security` | Auth, auditing, vulnerability scanning |
| `marketing` | SEO, content strategy, social media |
| `social` | Social media integrations |
| `design` | UI/UX, design systems, styling |
| `content` | Writing, documentation, editing |
| `demo` | Example/template plugins |

### 4. Create the PR

```bash
git add plugins/my-plugin/ .claude-plugin/marketplace.json
git commit -m "feat: add my-plugin — description"
git push origin feat/my-plugin
```

Then open a PR with:
- **Title**: `feat: add my-plugin — short description`
- **Body**: What the plugin does, component list, any dependencies

---

## Style Guide

### Naming

- **Plugin names**: kebab-case (`my-plugin`, not `myPlugin`)
- **Command names**: kebab-case (`code-review`, not `codeReview`)
- **Agent names**: kebab-case (`ts-expert`, not `tsExpert`)
- **Skill directories**: kebab-case (`custom-hooks/`)
- **MCP tool names**: snake_case (`crm_create_contact`)

### Code Examples

- Always include types and imports
- Use real-world patterns, not toy examples
- Show both good and bad patterns (with explanation)
- Keep examples self-contained — runnable without context
- Use TypeScript by default, add Go/Python where relevant

### Markdown

- Use `##` for major sections, `###` for subsections
- Use tables for comparisons and decision guides
- Use code blocks with language tags (` ```typescript `, ` ```go `, etc.)
- Use bullet points for quick-reference lists
- Keep line length reasonable (wrap at ~100 chars in prose)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add my-plugin — short description
fix: correct TypeScript example in generics skill
docs: update README with new plugin
chore: update marketplace index
```

---

## Questions?

Open an issue or check existing plugins for examples. The `hello-world` plugin is a minimal reference, and `typescript-patterns` is a full-featured knowledge plugin to study.
