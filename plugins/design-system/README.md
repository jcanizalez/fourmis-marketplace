# 🎨 design-system

> Design system toolkit — design tokens (3-tier architecture), Tailwind CSS theming (v3/v4), responsive design patterns (container queries, fluid typography), CSS animations (entrance, loading, scroll-driven), typography systems (scales, font loading, prose), and component styling (CVA variants, compound components).

**Category:** Design | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/design-system
```

## Overview

Design system toolkit — design tokens (3-tier architecture), Tailwind CSS theming (v3/v4), responsive design patterns (container queries, fluid typography), CSS animations (entrance, loading, scroll-driven), typography systems (scales, font loading, prose), and component styling (CVA variants, compound components). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `animation-utilities` | When the user asks about CSS animations |
| `component-styling` | When the user asks about component styling architecture |
| `design-tokens` | When the user asks about design tokens |
| `responsive-patterns` | When the user asks about responsive design |
| `tailwind-theming` | When the user asks about Tailwind CSS theming |
| `typography-systems` | When the user asks about typography |

## Commands

| Command | Description |
|---------|-------------|
| `/responsive` | Audit and fix responsive design issues — checks breakpoints, fluid sizing, touch targets, container queries, and mobile-first patterns in your components |
| `/theme` | Generate or audit a complete design theme — colors, spacing, typography, shadows, and dark mode. Outputs CSS custom properties and Tailwind v4 @theme config |
| `/tokens` | Extract, document, and validate design tokens from your codebase — finds CSS variables, Tailwind config values, and token inconsistencies |

## Agents

### design-engineer
Autonomous design system engineer — builds and maintains design token architectures, Tailwind themes, responsive layouts, animation systems, typography scales, and component styling patterns

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
