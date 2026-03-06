# 🔧 prompt-engineering

> Prompt engineering toolkit — prompt design patterns (role, constraints, multi-pass), structured output (tool use, Zod schemas, JSON/XML parsing), few-shot example design (selection strategies, contrastive pairs), chain-of-thought reasoning (CoT, extended thinking, self-consistency, tree of thought), RAG patterns (chunking, vector search, hybrid search, grounding), and LLM evaluation (datasets, LLM-as-judge, regression testing, CI pipelines).

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/prompt-engineering
```

## Overview

Prompt engineering toolkit — prompt design patterns (role, constraints, multi-pass), structured output (tool use, Zod schemas, JSON/XML parsing), few-shot example design (selection strategies, contrastive pairs), chain-of-thought reasoning (CoT, extended thinking, self-consistency, tree of thought), RAG patterns (chunking, vector search, hybrid search, grounding), and LLM evaluation (datasets, LLM-as-judge, regression testing, CI pipelines). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `chain-of-thought` | When the user asks about chain-of-thought prompting |
| `few-shot-examples` | When the user asks about few-shot prompting |
| `llm-evaluation` | When the user asks about evaluating LLM output |
| `prompt-patterns` | When the user asks about prompt design |
| `rag-patterns` | When the user asks about RAG, retrieval-augmented generation |
| `structured-output` | When the user asks about structured output from LLMs |

## Commands

| Command | Description |
|---------|-------------|
| `/eval` | Evaluate LLM output quality — run test cases against prompts, score with LLM-as-judge, compare prompt versions, and generate evaluation reports |
| `/prompt` | Design, optimize, and test a prompt — generates structured prompts with role, context, format, constraints, and few-shot examples for any LLM task |
| `/rag` | Set up a RAG pipeline — document chunking, embedding, vector search, and context-augmented generation with proper grounding and citation |

## Agents

### prompt-engineer
Autonomous prompt engineering agent — designs prompts, structures LLM output, builds few-shot examples, implements chain-of-thought reasoning, sets up RAG pipelines, and creates evaluation suites

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
