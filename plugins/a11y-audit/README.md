# 🔧 a11y-audit

> Accessibility audit toolkit — WCAG 2.

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/a11y-audit
```

## Overview

Accessibility audit toolkit — WCAG 2.2 compliance checking, ARIA patterns, color contrast analysis, keyboard navigation, screen reader optimization, and accessible component recipes. 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `accessible-components` | When the user asks to build accessible components |
| `aria-patterns` | When the user asks about ARIA roles or attributes |
| `color-contrast` | When the user asks about color contrast ratios |
| `keyboard-nav` | When the user asks about keyboard navigation |
| `screen-reader` | When the user asks about screen reader support |
| `wcag-compliance` | When the user asks about WCAG compliance |

## Commands

| Command | Description |
|---------|-------------|
| `/a11y` | Audit a file, component, or page for accessibility issues — checks WCAG compliance, ARIA usage, keyboard support, and screen reader compatibility |
| `/audit-page` | Run a live accessibility audit on a webpage using Chrome DevTools — checks rendered DOM, contrast, landmarks, and ARIA in the browser |
| `/contrast` | Check color contrast ratios in your CSS/Tailwind — finds text and UI elements that fail WCAG AA or AAA requirements |

## Agents

### a11y-engineer
Autonomous accessibility engineer agent — audits pages and components for WCAG compliance, fixes accessibility issues, and implements accessible patterns from scratch

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
