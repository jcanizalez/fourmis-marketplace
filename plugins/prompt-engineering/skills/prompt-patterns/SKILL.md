---
description: When the user asks about prompt design, prompt templates, system prompts, writing better prompts, prompt structure, role prompting, prompt optimization, or how to get better results from LLMs
---

# Prompt Design Patterns

Proven patterns for writing effective prompts that produce consistent, high-quality LLM outputs. Covers structure, role assignment, constraints, and optimization.

## Prompt Anatomy

Every effective prompt has these layers:

```
┌─────────────────────────────────┐
│  ROLE         Who the model is  │
│  CONTEXT      Background info   │
│  TASK         What to do        │
│  FORMAT       Output structure   │
│  CONSTRAINTS  Rules and limits   │
│  EXAMPLES     Show, don't tell  │
└─────────────────────────────────┘
```

### Template

```
You are a [ROLE] with expertise in [DOMAIN].

## Context
[Background information the model needs to understand the task]

## Task
[Clear, specific instruction about what to produce]

## Format
[Exact output structure — JSON, markdown, specific sections]

## Constraints
- [Rule 1]
- [Rule 2]
- [Rule 3]

## Examples
[Input → Output examples showing desired behavior]
```

## Pattern 1: Role Assignment

Define who the model is to activate domain-specific knowledge:

```
You are a senior backend engineer with 10 years of experience in
distributed systems. You prioritize reliability and observability.
When reviewing code, you focus on error handling, race conditions,
and operational concerns before style or optimization.
```

**When to use**: Any task that benefits from domain expertise.

**Levels of specificity:**
| Level | Example | Use When |
|-------|---------|----------|
| Generic | "You are a helpful assistant" | Never (too vague) |
| Domain | "You are a security expert" | General domain knowledge |
| Persona | "You are a senior Rails developer at a fintech startup" | Specific context matters |
| Named | "You are Dan Abramov reviewing React code" | Want a specific style/philosophy |

## Pattern 2: Step-by-Step Instructions

Break complex tasks into numbered steps:

```
Analyze the provided API endpoint for security vulnerabilities.

Follow these steps:
1. Identify the authentication mechanism (JWT, API key, session, none)
2. Check input validation — are all parameters validated and sanitized?
3. Check authorization — does the endpoint verify the user has permission?
4. Check for injection risks — SQL, NoSQL, command injection
5. Check error handling — does it leak internal details?
6. Rate your findings: Critical, High, Medium, Low
7. Output a markdown table with: vulnerability, severity, location, fix
```

**When to use**: Multi-step analysis, review tasks, systematic processes.

## Pattern 3: Output Constraints

Constrain the output to prevent drift:

```
## Constraints
- Respond ONLY with valid JSON — no markdown, no explanation
- Maximum 3 suggestions — pick the most impactful ones
- Each suggestion must be actionable (include specific file and line)
- Do NOT suggest changes that would break existing tests
- If you're unsure about something, say "UNCERTAIN:" and explain why
```

### Common Constraints

| Constraint | Purpose |
|-----------|---------|
| "Respond in JSON only" | Machine-parseable output |
| "Maximum N items" | Prevents verbose/exhaustive lists |
| "If unsure, say so" | Reduces hallucination |
| "Do not explain, just output" | Concise results |
| "Use only information provided" | Grounds in given context |
| "Think step by step before answering" | Improves reasoning |

## Pattern 4: Positive vs Negative Instructions

Tell the model what to do AND what not to do:

```
## Do
- Write TypeScript with strict types
- Handle all error cases explicitly
- Use descriptive variable names (not single letters)

## Don't
- Don't use `any` type
- Don't catch errors silently
- Don't use abbreviations in function names
```

**Why both?** Models sometimes interpret "don't do X" as "do X" due to attention on the concept. Pair every negative with its positive alternative.

## Pattern 5: Persona + Audience

Define both who's writing and who's reading:

```
You are a technical writer at Stripe.
Your audience is developers integrating the Stripe API for the first time.
They know JavaScript but have never worked with payment APIs.

Write documentation that:
- Uses simple, direct language (no jargon without explanation)
- Includes runnable code examples in every section
- Anticipates common mistakes and addresses them proactively
```

## Pattern 6: Multi-Pass Refinement

Use multiple prompts in sequence:

```
Pass 1 (Generate):
"Write a function that parses CSV files into typed objects"

Pass 2 (Critique):
"Review this function for edge cases, error handling, and type safety.
List every issue you find."

Pass 3 (Refine):
"Fix all issues identified in the review. Keep the same API."

Pass 4 (Test):
"Write comprehensive tests for this function including edge cases."
```

**When to use**: Complex generation tasks where a single prompt produces mediocre results.

## Pattern 7: Structured Thinking

Force the model to reason before answering:

```
Before answering, think through:
1. What is the user actually asking for? (restate the core question)
2. What are the key constraints? (list them)
3. What are 2-3 possible approaches?
4. Which approach best fits the constraints and why?

Then provide your answer.
```

## System Prompt Best Practices

### For API Integration

```typescript
const systemPrompt = `You are a code review assistant for a TypeScript monorepo.

## Your Role
Review pull requests for bugs, security issues, and code quality.

## Context
- Stack: TypeScript, React, Node.js, PostgreSQL
- Style: Functional components, Zod validation, Drizzle ORM
- Testing: Vitest for unit tests, Playwright for E2E

## Response Format
For each issue found, respond with:
{
  "file": "path/to/file.ts",
  "line": 42,
  "severity": "critical" | "warning" | "info",
  "issue": "Brief description",
  "suggestion": "Code fix or approach"
}

## Rules
- Only flag real issues, not style preferences
- Maximum 10 issues per review
- Always include a fix suggestion, not just the problem
- If the code looks good, say so — don't invent problems`;
```

### For Chat Applications

```typescript
const systemPrompt = `You are a customer support assistant for Acme SaaS.

## Personality
- Friendly but professional
- Concise — answer in 2-3 sentences when possible
- Empathetic — acknowledge frustration before solving

## Knowledge
- Product docs are in the provided context
- Pricing: Free ($0), Pro ($29/mo), Enterprise (custom)
- Support hours: 9 AM - 6 PM EST, Mon-Fri

## Rules
- Never make up features that don't exist
- For billing issues, always ask for the account email
- For bugs, collect: browser, OS, steps to reproduce
- If you can't help, offer to create a support ticket
- Never share internal processes or competitor comparisons`;
```

## Prompt Testing Checklist

| Test | What to Check |
|------|--------------|
| **Happy path** | Does the prompt produce the expected output for typical input? |
| **Edge cases** | Empty input, very long input, ambiguous input |
| **Adversarial** | User tries to bypass constraints or inject instructions |
| **Consistency** | Same input produces similar quality output across runs |
| **Format compliance** | Output matches the specified format every time |
| **Hallucination** | Model makes up facts when it should say "I don't know" |

## Checklist

- [ ] Role is specific (not "helpful assistant")
- [ ] Task is explicit and unambiguous
- [ ] Output format is defined (JSON, markdown, specific structure)
- [ ] Constraints prevent common failure modes
- [ ] Examples demonstrate desired behavior (few-shot)
- [ ] Positive AND negative instructions included
- [ ] Prompt tested with edge cases and adversarial inputs
- [ ] Prompt is as short as possible while being complete
