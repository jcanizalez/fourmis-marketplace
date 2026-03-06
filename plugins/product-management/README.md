# 📋 product-management

> Product management toolkit — PRD writing (templates, RICE scoring), sprint planning (capacity, velocity, ceremonies), user stories (INVEST, story mapping, splitting), estimation (Fibonacci, t-shirt sizing, PERT), roadmap planning (Now/Next/Later, OKR alignment, milestones), and retrospectives (Start/Stop/Continue, 4Ls, Sailboat, action tracking).

**Category:** Productivity | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/product-management
```

## Overview

Product management toolkit — PRD writing (templates, RICE scoring), sprint planning (capacity, velocity, ceremonies), user stories (INVEST, story mapping, splitting), estimation (Fibonacci, t-shirt sizing, PERT), roadmap planning (Now/Next/Later, OKR alignment, milestones), and retrospectives (Start/Stop/Continue, 4Ls, Sailboat, action tracking). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `estimation` | When the user asks about effort estimation |
| `prd-writing` | When the user asks about writing a PRD |
| `retrospectives` | When the user asks about sprint retrospectives |
| `roadmap-planning` | When the user asks about product roadmaps |
| `sprint-planning` | When the user asks about sprint planning |
| `user-stories` | When the user asks about writing user stories |

## Commands

| Command | Description |
|---------|-------------|
| `/estimate` | Estimate engineering effort for a feature or set of stories — uses Fibonacci story points, t-shirt sizing, or PERT three-point estimation with timeline projection |
| `/prd` | Generate a comprehensive Product Requirements Document for a feature — includes problem statement, user stories, requirements, success metrics, technical approach, and timeline |
| `/sprint` | Plan a sprint — calculate capacity, pull stories from backlog, set a sprint goal, and generate a sprint plan with assignments and timeline |

## Agents

### product-manager
Autonomous product management agent — writes PRDs, plans sprints, breaks features into user stories, estimates effort, builds roadmaps, and facilitates retrospectives

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
