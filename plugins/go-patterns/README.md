# 🔧 go-patterns

> Idiomatic Go patterns — concurrency (goroutines, channels, select, sync.

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/go-patterns
```

## Overview

Idiomatic Go patterns — concurrency (goroutines, channels, select, sync.Mutex/RWMutex/WaitGroup/Once/Pool, errgroup, fan-out/fan-in, worker pools, rate limiting), error handling (fmt.Errorf %w wrapping, custom error types, errors.Is/As, sentinel errors, multi-error, goroutine errors), interfaces (implicit satisfaction, composition, type assertions/switches, common interfaces, dependency injection, mocking), HTTP (net/http, Go 1.22+ routing, middleware chains, JSON helpers, graceful shutdown, structured responses), testing (table-driven, subtests, testify, httptest, benchmarks, fuzzing, golden files, build tags), and project structure (cmd/internal layout, packages, modules, Makefile, golangci-lint). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `concurrency-patterns` | When the user asks about Go concurrency |
| `error-handling` | When the user asks about Go error handling |
| `http-patterns` | When the user asks about Go HTTP servers |
| `interface-patterns` | When the user asks about Go interfaces |
| `project-structure` | When the user asks about Go project structure |
| `testing-patterns` | When the user asks about Go testing |

## Commands

| Command | Description |
|---------|-------------|
| `/go-bench` | Set up Go benchmarks for a function — generate benchmark code, run it, and analyze results |
| `/go-errors` | Audit error handling in Go code — find unchecked errors, missing context, broken wrapping chains, and error anti-patterns |
| `/go-review` | Review Go code for idiomatic patterns, error handling, concurrency issues, and best practices |

## Agents

### go-expert
Autonomous Go expert that writes idiomatic Go code, designs concurrent systems, builds HTTP services, and reviews code for best practices

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
