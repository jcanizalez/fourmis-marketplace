# Fourmis Marketplace

A curated collection of plugins for Claude Code, built and maintained by the Fourmis community.

## Installation

Register this marketplace with Fourmis:

```bash
fourmis plugin marketplace add jcanizalez/fourmis-marketplace
```

Then install any plugin:

```bash
fourmis plugin install hello-world
```

## Structure

```
fourmis-marketplace/
├── plugins/              # First-party plugins (maintained by fourmis team)
│   └── hello-world/      # Example plugin
└── external_plugins/     # Third-party plugin references
```

## Available Plugins

| Plugin | Description | Components |
|--------|-------------|------------|
| `hello-world` | Demo plugin with a greeting command and skill | Commands, Skills |

## Contributing

Plugins must follow the [Claude Code plugin standard](https://docs.anthropic.com/en/docs/claude-code/plugins):

1. `.claude-plugin/plugin.json` manifest (required)
2. Standard component directories: `commands/`, `agents/`, `skills/`, `hooks/`
3. `.mcp.json` for MCP server integrations (optional)

## License

MIT
