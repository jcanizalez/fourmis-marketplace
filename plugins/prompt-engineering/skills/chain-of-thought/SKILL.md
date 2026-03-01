---
description: When the user asks about chain-of-thought prompting, reasoning traces, step-by-step thinking, extended thinking, scratchpad technique, tree of thought, or improving LLM reasoning accuracy
---

# Chain-of-Thought Reasoning

Chain-of-thought (CoT) prompting makes LLMs show their reasoning process, dramatically improving accuracy on tasks that require logic, math, analysis, or multi-step decisions.

## Basic CoT Techniques

### Technique 1: "Think Step by Step"

The simplest and most effective CoT trigger:

```
A store has 15 apples. They sell 8 in the morning and receive
a shipment of 12 in the afternoon. Then they sell 6 more.
How many apples are left?

Think step by step before giving your answer.
```

**Without CoT:** "13 apples" (often wrong)
**With CoT:** "Starting with 15. Sold 8 → 15-8 = 7. Received 12 → 7+12 = 19. Sold 6 → 19-6 = 13." (correct with trace)

### Technique 2: Structured Reasoning

Force specific reasoning steps:

```
Evaluate whether this SQL query could cause performance issues.

Before answering, analyze:
1. What tables are being joined and how?
2. Are there appropriate indexes for the WHERE clause?
3. What is the expected result set size?
4. Are there any subqueries or functions that prevent index usage?
5. What is the execution plan likely to look like?

Then give your assessment with specific recommendations.
```

### Technique 3: Reasoning + Answer Separation

Separate thinking from the final answer:

```
Determine the time complexity of this function.

<reasoning>
[Show your analysis here — trace through loops, recursion, data structures]
</reasoning>

<answer>
O(n log n) — The outer loop runs n times and the inner binary search is log n.
</answer>
```

This lets you extract just the answer programmatically while keeping the reasoning for debugging.

## Extended Thinking (Claude)

Claude's extended thinking feature for complex reasoning:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16000,
  thinking: {
    type: 'enabled',
    budget_tokens: 10000,  // Tokens allocated for reasoning
  },
  messages: [{
    role: 'user',
    content: `Review this database schema migration for potential issues:

    ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20);
    ALTER TABLE users DROP COLUMN is_premium;
    UPDATE users SET subscription_tier = CASE
      WHEN is_premium = true THEN 'premium'
      ELSE 'free'
    END;

    What problems do you see?`,
  }],
});

// Response includes both thinking and final answer
for (const block of response.content) {
  if (block.type === 'thinking') {
    console.log('Reasoning:', block.thinking);
  } else if (block.type === 'text') {
    console.log('Answer:', block.text);
  }
}
```

## Few-Shot CoT

Demonstrate the reasoning pattern with examples:

```
Determine if the code change is a breaking change.

Example 1:
Change: Rename function `getUser()` to `fetchUser()`
Reasoning: This is a public API function. Any code calling `getUser()` will
break after this change. The function signature is the same, only the name
changed. This is a breaking change because external consumers must update.
Answer: BREAKING

Example 2:
Change: Add optional parameter `options?: { cache: boolean }` to `getUser()`
Reasoning: The parameter is optional with no default behavior change. Existing
callers pass no options and still work. New callers can use the option. This
maintains backward compatibility.
Answer: NOT BREAKING

Example 3:
Change: Add new field `avatarUrl` to the User response object
Reasoning: Adding a new field to a response object is backward compatible.
Existing consumers that don't use the field are unaffected. Only consumers
with strict schema validation might see issues, but that's their responsibility.
Answer: NOT BREAKING

Your task:
Change: Change `getUsers()` return type from `User[]` to `{ users: User[], total: number }`
Reasoning:
Answer:
```

## Self-Consistency (Multiple Reasoning Paths)

Run the same prompt multiple times and take the majority answer:

```typescript
async function selfConsistentAnswer(prompt: string, n: number = 5): Promise<string> {
  // Generate multiple reasoning paths
  const responses = await Promise.all(
    Array.from({ length: n }, () =>
      callLLM(`${prompt}\n\nThink step by step, then provide your final answer on the last line prefixed with "ANSWER: "`, {
        temperature: 0.7,  // Higher temperature for diverse reasoning
      })
    )
  );

  // Extract answers
  const answers = responses.map(r => {
    const match = r.match(/ANSWER:\s*(.+)/i);
    return match?.[1]?.trim() ?? 'unknown';
  });

  // Majority vote
  const counts = answers.reduce((acc, ans) => {
    acc[ans] = (acc[ans] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)[0][0];
}

// Usage
const answer = await selfConsistentAnswer(
  'Is this function thread-safe? [code here]'
);
// Runs 5 times with different reasoning paths, takes majority vote
```

## Tree of Thought

For complex problems, explore multiple solution paths:

```
Solve this system design problem using Tree of Thought.

Problem: Design a URL shortener that handles 100M URLs.

## Step 1: Generate 3 approaches
Approach A: [Simple hash-based with collision handling]
Approach B: [Counter-based with base62 encoding]
Approach C: [Distributed ID generation with Snowflake-like IDs]

## Step 2: Evaluate each approach
For each approach, rate (1-5):
- Simplicity of implementation
- Scalability to 100M URLs
- Collision resistance
- Latency of URL creation
- Latency of URL redirect

## Step 3: Select best approach
Based on the evaluation, select the best approach and explain why.

## Step 4: Detail the chosen design
Provide architecture, data model, and API design for the selected approach.
```

## ReAct Pattern (Reasoning + Acting)

Interleave reasoning with tool use:

```
You have access to these tools:
- search(query) — Search the codebase
- read(path) — Read a file
- run(command) — Run a shell command

Task: Find and fix the memory leak in the user service.

Use this format:
Thought: [What you're thinking]
Action: [Tool call]
Observation: [Result of the tool call]
... repeat ...
Thought: [Final conclusion]
Answer: [Fix with explanation]

Begin:
Thought: I should first find the user service files to understand the architecture.
Action: search("user service")
Observation: Found files: src/services/user.ts, src/services/user.test.ts
Thought: Let me read the main service file to look for common leak patterns.
Action: read("src/services/user.ts")
...
```

## When to Use CoT

| Task | CoT Needed? | Why |
|------|-------------|-----|
| Simple classification | ❌ No | Model knows the answer directly |
| Math / logic problems | ✅ Yes | Prevents arithmetic and logic errors |
| Multi-step analysis | ✅ Yes | Keeps track of intermediate results |
| Code review | ✅ Yes | Must trace through code paths |
| Ambiguous questions | ✅ Yes | Reasoning reveals assumptions |
| Simple extraction | ❌ No | Input→output mapping is straightforward |
| Creative writing | ⚠️ Optional | Can help with plot planning |
| Debugging | ✅ Yes | Must trace execution step by step |

## CoT Prompt Templates

### For Code Analysis

```
Analyze this function for correctness.

Step 1: What is the function supposed to do? (read the name, params, return type)
Step 2: Trace through with a normal input
Step 3: Trace through with edge cases (empty, null, max, min)
Step 4: Identify any bugs or issues
Step 5: Provide your assessment
```

### For Decision Making

```
Should we use [Option A] or [Option B] for [task]?

Evaluate each option:
1. List the pros (3-5)
2. List the cons (3-5)
3. Consider the specific constraints: [constraint 1], [constraint 2]
4. Which option best fits our constraints?
5. What's the risk of each choice?
6. Final recommendation with reasoning
```

## Checklist

- [ ] CoT used for reasoning-heavy tasks (math, logic, code analysis)
- [ ] "Think step by step" or structured reasoning steps included
- [ ] Reasoning separated from final answer (extractable)
- [ ] Few-shot CoT examples demonstrate the reasoning pattern
- [ ] Self-consistency used for high-stakes decisions (multiple paths, majority vote)
- [ ] Extended thinking enabled for complex Claude tasks
- [ ] Simple tasks NOT using CoT (wastes tokens, adds latency)
- [ ] Reasoning traces logged for debugging and improvement
