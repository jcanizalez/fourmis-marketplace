# 🔧 test-gen

> Test generation and analysis toolkit — unit tests (Jest, Vitest, pytest, Go table-driven), integration tests (Supertest, httpx, httptest, database setup/teardown), E2E tests (Playwright, Cypress, Page Object pattern), TDD workflow (Red-Green-Refactor), mocking patterns (jest.

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/test-gen
```

## Overview

Test generation and analysis toolkit — unit tests (Jest, Vitest, pytest, Go table-driven), integration tests (Supertest, httpx, httptest, database setup/teardown), E2E tests (Playwright, Cypress, Page Object pattern), TDD workflow (Red-Green-Refactor), mocking patterns (jest.fn, vi.fn, unittest.mock, testify/mock, fixtures), and coverage analysis (gap detection, risk-based prioritization, flaky test detection). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `e2e-testing` | When the user asks to write end-to-end tests |
| `integration-testing` | When the user asks to write integration tests |
| `mocking-patterns` | When the user asks to mock a dependency |
| `tdd-workflow` | When the user asks about test-driven development |
| `test-analysis` | When the user asks to analyze test coverage |
| `unit-testing` | When the user asks to write unit tests |

## Commands

| Command | Description |
|---------|-------------|
| `/coverage` | Analyze test coverage, find untested code, and prioritize what to test next |
| `/tdd` | Start a TDD session — write tests first, implement to pass, then refactor |
| `/test` | Generate tests for a file, function, or module — auto-detects framework and language |

## Agents

### test-engineer
Autonomous test generation and analysis agent — writes unit tests, integration tests, and E2E tests, analyzes coverage gaps, guides TDD workflow, sets up mocking patterns, and assesses test suite quality across Jest, Vitest, pytest, Go testing, Playwright, and Cypress

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
