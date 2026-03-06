#!/usr/bin/env node

/**
 * gen-readmes.js
 *
 * Auto-generates a README.md for each plugin directory from:
 * - .claude-plugin/marketplace.json (name, description, category)
 * - Plugin directory scan (skills, commands, agents, .mcp.json)
 * - YAML frontmatter from each component
 *
 * Usage: node scripts/gen-readmes.js
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const MARKETPLACE_JSON = join(ROOT, '.claude-plugin', 'marketplace.json');
const PLUGINS_DIR = join(ROOT, 'plugins');

const marketplace = JSON.parse(readFileSync(MARKETPLACE_JSON, 'utf-8'));

// ─── Helpers ─────────────────────────────────────────────────

/** Parse YAML frontmatter from a markdown file (simple key: value) */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  let currentKey = null;
  for (const line of match[1].split('\n')) {
    // Skip array items (arguments list items)
    if (line.trim().startsWith('- ')) continue;
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      let val = kv[2].trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      fm[key] = val;
      currentKey = key;
    }
  }
  return fm;
}

/** List entries in a directory (non-hidden) */
function listEntries(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => !f.startsWith('.'));
}

/** Category emoji map */
const catEmoji = {
  development: '🔧',
  devops: '🚀',
  productivity: '📋',
  security: '🔒',
  marketing: '📢',
  content: '✏️',
  social: '🌐',
  design: '🎨',
  demo: '👋',
  database: '🗄️',
  monitoring: '📊',
  go: '🐹',
};

/** Category label */
const catLabel = {
  development: 'Development',
  devops: 'DevOps',
  productivity: 'Productivity',
  security: 'Security',
  marketing: 'Marketing',
  content: 'Content',
  social: 'Social',
  design: 'Design',
  demo: 'Demo',
};

// ─── Generate README for each plugin ─────────────────────────

let generated = 0;

for (const entry of marketplace.plugins) {
  const pluginDir = join(ROOT, entry.source.replace('./', ''));
  const name = entry.name;
  const desc = entry.description;
  const cat = entry.category;

  // Scan components
  const skillDirs = listEntries(join(pluginDir, 'skills'));
  const cmdFiles = listEntries(join(pluginDir, 'commands'));
  const agentFiles = listEntries(join(pluginDir, 'agents'));
  const hasMcp = existsSync(join(pluginDir, '.mcp.json'));

  // Parse skill frontmatter
  const skills = skillDirs.map(s => {
    const skillFile = join(pluginDir, 'skills', s, 'SKILL.md');
    if (!existsSync(skillFile)) return { name: s, description: '' };
    const fm = parseFrontmatter(readFileSync(skillFile, 'utf-8'));
    // Extract a short trigger description (first ~80 chars at a natural break)
    let skillDesc = fm.description || '';
    if (skillDesc.length > 80) {
      // Try to cut at a comma or "or" after 30+ chars
      const cut = skillDesc.match(/^(.{30,80}?)[,;]/) || skillDesc.match(/^(.{30,80}?)\s+or\s/);
      skillDesc = cut ? cut[1] : skillDesc.slice(0, 80) + '...';
    }
    return { name: s, description: skillDesc };
  });

  // Parse command frontmatter
  const commands = cmdFiles.map(f => {
    const cmdFile = join(pluginDir, 'commands', f);
    const isDir = statSync(cmdFile).isDirectory();
    const filePath = isDir ? join(cmdFile, 'command.md') : cmdFile;
    if (!existsSync(filePath)) return { name: f.replace('.md', ''), description: '' };
    const fm = parseFrontmatter(readFileSync(filePath, 'utf-8'));
    return { name: fm.name || f.replace('.md', ''), description: fm.description || '' };
  });

  // Parse agent frontmatter
  const agents = agentFiles.map(f => {
    const agentFile = join(pluginDir, 'agents', f);
    const isDir = statSync(agentFile).isDirectory();
    const filePath = isDir ? join(agentFile, 'agent.md') : agentFile;
    if (!existsSync(filePath)) return { name: f.replace('.md', ''), description: '' };
    const fm = parseFrontmatter(readFileSync(filePath, 'utf-8'));
    return { name: fm.name || f.replace('.md', ''), description: fm.description || '' };
  });

  // Build README
  const emoji = catEmoji[cat] || '📦';
  const label = catLabel[cat] || cat;
  const lines = [];

  // Title
  lines.push(`# ${emoji} ${name}`);
  lines.push('');
  lines.push(`> ${desc.split('.')[0]}.`);
  lines.push('');

  // Badges
  const badges = [];
  badges.push(`**Category:** ${label}`);
  if (skills.length) badges.push(`**${skills.length} skill${skills.length > 1 ? 's' : ''}**`);
  if (commands.length) badges.push(`**${commands.length} command${commands.length > 1 ? 's' : ''}**`);
  if (agents.length) badges.push(`**${agents.length} agent${agents.length > 1 ? 's' : ''}**`);
  if (hasMcp) badges.push(`**MCP server**`);
  lines.push(badges.join(' | '));
  lines.push('');

  // Install
  lines.push('## Install');
  lines.push('');
  lines.push('```bash');
  lines.push(`claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/${name}`);
  lines.push('```');
  lines.push('');

  // Description
  lines.push('## Overview');
  lines.push('');
  lines.push(desc);
  lines.push('');

  // Skills
  if (skills.length) {
    lines.push('## Skills');
    lines.push('');
    lines.push('| Skill | Activates when... |');
    lines.push('|-------|-------------------|');
    for (const s of skills) {
      const desc = s.description || '—';
      lines.push(`| \`${s.name}\` | ${desc} |`);
    }
    lines.push('');
  }

  // Commands
  if (commands.length) {
    lines.push('## Commands');
    lines.push('');
    lines.push('| Command | Description |');
    lines.push('|---------|-------------|');
    for (const c of commands) {
      lines.push(`| \`/${c.name}\` | ${c.description || '—'} |`);
    }
    lines.push('');
  }

  // Agents
  if (agents.length) {
    lines.push('## Agents');
    lines.push('');
    for (const a of agents) {
      lines.push(`### ${a.name}`);
      if (a.description) lines.push(`${a.description}`);
      lines.push('');
    }
  }

  // MCP
  if (hasMcp) {
    lines.push('## MCP Server');
    lines.push('');
    lines.push('This plugin includes an MCP (Model Context Protocol) server that provides additional tools. The server starts automatically when the plugin is loaded.');
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.`);
  lines.push('');

  const readme = lines.join('\n');
  writeFileSync(join(pluginDir, 'README.md'), readme, 'utf-8');
  generated++;
}

console.log(`📝 Generated ${generated} README.md files`);
