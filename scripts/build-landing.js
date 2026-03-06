#!/usr/bin/env node

/**
 * build-landing.js
 *
 * Reads .claude-plugin/marketplace.json and scans plugins/ directories
 * to auto-generate the plugin catalog data in docs/index.html.
 *
 * Usage: node scripts/build-landing.js
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const MARKETPLACE_JSON = join(ROOT, '.claude-plugin', 'marketplace.json');
const PLUGINS_DIR = join(ROOT, 'plugins');
const INDEX_HTML = join(ROOT, 'docs', 'index.html');

// ─── Read marketplace.json ───────────────────────────────────
const marketplace = JSON.parse(readFileSync(MARKETPLACE_JSON, 'utf-8'));
const pluginEntries = marketplace.plugins;

// ─── Scan plugin directories ─────────────────────────────────
function countEntries(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(f => !f.startsWith('.')).length;
}

function buildPluginData(entry) {
  const pluginDir = join(ROOT, entry.source.replace('./', ''));
  const skills = countEntries(join(pluginDir, 'skills'));
  const cmds = countEntries(join(pluginDir, 'commands'));
  const agents = countEntries(join(pluginDir, 'agents'));
  const hasMcp = existsSync(join(pluginDir, '.mcp.json'));

  // Clean description: remove trailing component counts and meta info
  let desc = entry.description;
  // Strip trailing sentences that are purely about component counts
  // e.g. "6 skills, 3 commands, 1 agent. No dependencies."
  desc = desc.replace(/\s*\d+\s+(skills?|commands?|agents?|editor agents?)[^.]*\.\s*(No dependencies\.?|No paid API keys\.?|Zero cloud dependencies[^.]*\.?|No MCP server[^.]*\.?|MCP server\.?)?$/gi, '');
  // Strip "with N MCP tools..." or "N MCP tools..." trailing phrases
  desc = desc.replace(/\s+with\s+\d+\s+MCP\s+tools?[^.]*\.?\s*(Zero cloud[^.]*\.?|No\s+\w+[^.]*\.?)?$/gi, '');
  desc = desc.replace(/\s*\d+\s+MCP\s+tools?[^.]*\.?\s*(Zero cloud[^.]*\.?|No\s+\w+[^.]*\.?)?$/gi, '');
  // Strip "Authenticated via OAuth2 with N tools..." trailing phrases
  desc = desc.replace(/\s+(Authenticated|with)\s+\w+\s+\w+\s+with\s+\d+\s+tools?[^.]*\.?$/gi, '');
  // Strip "with N tools covering..." at end
  desc = desc.replace(/\s+with\s+\d+\s+tools?\s+covering[^.]*\.?$/gi, '');
  // Clean dangling prepositions and punctuation at end
  desc = desc.replace(/\s+(with|via|using|from|for|and|or)\s*[.,;—-]*\s*$/gi, '');
  desc = desc.replace(/[\s,.;—-]+$/, '') + '.';

  return {
    name: entry.name,
    desc,
    cat: entry.category,
    skills,
    cmds,
    agents,
    ...(hasMcp ? { mcp: true } : {}),
  };
}

const plugins = pluginEntries.map(buildPluginData);

// ─── Compute stats ───────────────────────────────────────────
const totalPlugins = plugins.length;
const totalSkills = plugins.reduce((s, p) => s + p.skills, 0);
const totalCmds = plugins.reduce((s, p) => s + p.cmds, 0);
const totalAgents = plugins.reduce((s, p) => s + p.agents, 0);
const totalMcp = plugins.filter(p => p.mcp).length;

console.log(`📦 ${totalPlugins} plugins | ${totalSkills} skills | ${totalCmds} commands | ${totalAgents} agents | ${totalMcp} MCP servers`);

// ─── Generate JS array ───────────────────────────────────────
function pluginToJS(p) {
  const parts = [
    `name: ${JSON.stringify(p.name)}`,
    `desc: ${JSON.stringify(p.desc)}`,
    `cat: ${JSON.stringify(p.cat)}`,
    `skills: ${p.skills}`,
    `cmds: ${p.cmds}`,
    `agents: ${p.agents}`,
  ];
  if (p.mcp) parts.push('mcp: true');
  return `  { ${parts.join(', ')} }`;
}

const pluginsJS = `const plugins = [\n${plugins.map(pluginToJS).join(',\n')}\n];`;

// ─── Categories for filter bar ───────────────────────────────
const catCounts = {};
plugins.forEach(p => { catCounts[p.cat] = (catCounts[p.cat] || 0) + 1; });

// ─── Read and patch index.html ───────────────────────────────
let html = readFileSync(INDEX_HTML, 'utf-8');

// 1. Replace plugins array
html = html.replace(
  /const plugins = \[[\s\S]*?\];/,
  pluginsJS
);

// 2. Replace stats numbers
html = html.replace(
  /(<div class="stats-grid">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/,
  `$1
      <div>
        <div class="stat-num">${totalPlugins}</div>
        <div class="stat-label">Plugins</div>
      </div>
      <div>
        <div class="stat-num">${totalSkills}</div>
        <div class="stat-label">Skills</div>
      </div>
      <div>
        <div class="stat-num">${totalCmds}</div>
        <div class="stat-label">Commands</div>
      </div>
      <div>
        <div class="stat-num">${totalAgents}</div>
        <div class="stat-label">Agents</div>
      </div>
    $2`
);

// 3. Replace hero badge count
html = html.replace(
  /\d+ plugins &middot; Open Source/,
  `${totalPlugins} plugins &middot; Open Source`
);

// 4. Replace catalog subtitle count
html = html.replace(
  /Browse all \d+ plugins across \d+ categories/,
  `Browse all ${totalPlugins} plugins across ${Object.keys(catCounts).length} categories`
);

// 5. Replace "All (N)" filter button
html = html.replace(
  /All \(\d+\)/,
  `All (${totalPlugins})`
);

// 6. Replace meta description
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  `<meta name="description" content="${totalPlugins} open-source plugins for Claude Code. Skills, commands, agents, and MCP servers to supercharge your AI-assisted development workflow.">`
);

// 7. Replace og:description
html = html.replace(
  /<meta property="og:description" content="[^"]*">/,
  `<meta property="og:description" content="${totalPlugins} open-source plugins for Claude Code. ${totalSkills} skills, ${totalCmds} commands, ${totalAgents} agents.">`
);

// ─── Write output ────────────────────────────────────────────
writeFileSync(INDEX_HTML, html, 'utf-8');
console.log(`✅ docs/index.html updated — ${totalPlugins} plugins, ${totalSkills} skills, ${totalCmds} commands, ${totalAgents} agents`);
