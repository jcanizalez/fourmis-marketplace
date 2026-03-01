---
description: When the user asks about few-shot prompting, providing examples to LLMs, in-context learning, one-shot examples, zero-shot vs few-shot, example selection, or teaching an LLM by example
---

# Few-Shot Examples

Few-shot prompting teaches the model desired behavior through examples. Instead of describing what you want, you show it. This is the single most effective technique for improving LLM output quality.

## Zero-Shot vs Few-Shot vs Many-Shot

| Approach | Examples | Use When |
|----------|----------|----------|
| **Zero-shot** | 0 | Task is simple and well-understood by the model |
| **One-shot** | 1 | Show the format/style, model knows the domain |
| **Few-shot** | 2-5 | Task requires specific patterns or judgment |
| **Many-shot** | 5-20+ | Complex classification, nuanced decisions |

## Few-Shot Template

```
[Task description]

## Examples

### Example 1
Input: [example input 1]
Output: [example output 1]

### Example 2
Input: [example input 2]
Output: [example output 2]

### Example 3
Input: [example input 3]
Output: [example output 3]

## Your Task
Input: [actual input]
Output:
```

## Example: Code Review Classification

### Zero-Shot (Less Reliable)

```
Classify this code review comment as: bug, style, performance, security, or suggestion.

Comment: "This SQL query is vulnerable to injection — use parameterized queries instead."
```

### Few-Shot (More Reliable)

```
Classify each code review comment into one category: bug, style, performance, security, or suggestion.

Comment: "The variable name 'x' is unclear — rename to 'userCount'."
Category: style

Comment: "This loop runs in O(n²) — consider using a hash map for O(n) lookup."
Category: performance

Comment: "The null check is missing — this will throw a TypeError when user is undefined."
Category: bug

Comment: "This SQL query is vulnerable to injection — use parameterized queries instead."
Category:
```

## Example: Structured Extraction

```
Extract meeting details from natural language into structured JSON.

Input: "Let's meet tomorrow at 3pm in the Maple room to discuss Q2 planning"
Output: {"date": "tomorrow", "time": "15:00", "location": "Maple room", "topic": "Q2 planning", "attendees": []}

Input: "Quick sync with Alice and Bob on Friday morning about the auth migration"
Output: {"date": "Friday", "time": "morning", "location": null, "topic": "auth migration", "attendees": ["Alice", "Bob"]}

Input: "Standup at 9:30 every day in #team-sync channel"
Output: {"date": "recurring daily", "time": "09:30", "location": "#team-sync channel", "topic": "standup", "attendees": []}

Input: "Can we chat about the API redesign next Tuesday? I'll book a room."
Output:
```

## Example: Tone Transformation

```
Rewrite the message to be professional and empathetic for customer support.

Original: "Your payment failed again. Fix your card info."
Rewritten: "It looks like there was an issue processing your payment. Could you verify your card details are up to date? I'm happy to help if you run into any trouble."

Original: "That feature doesn't exist."
Rewritten: "That feature isn't available yet, but I appreciate the suggestion! I've noted it for our product team. Is there anything else I can help you with?"

Original: "You're using the API wrong. Read the docs."
Rewritten:
```

## Example Selection Strategies

### 1. Cover the Edge Cases

Pick examples that demonstrate boundary behavior:

```
Classify sentiment: positive, negative, neutral, mixed.

"I love this product!" → positive
"Terrible quality, never buying again." → negative
"It's okay, nothing special." → neutral
"Great features but awful customer service." → mixed    ← edge case!
"" → neutral                                              ← empty input!
"The product arrived on Tuesday." → neutral               ← factual, no sentiment!
```

### 2. Cover the Distribution

Examples should represent the real-world distribution of inputs:

```
If 70% of inputs are positive, 20% negative, 10% neutral:
- Include 3 positive, 1-2 negative, 1 neutral
- Don't show 5 positive and 0 negative (biases the model)
```

### 3. Show Difficulty Gradient

Start with easy examples, end with harder ones:

```
Easy:   "This is the best product ever!" → positive
Medium: "Good product but overpriced" → mixed
Hard:   "I suppose it works as advertised" → neutral (not positive!)
```

### 4. Contrastive Examples

Show similar inputs with different outputs:

```
"Not bad at all" → positive    (double negative = positive)
"Not good at all" → negative   (clear negative)
"Not the worst" → neutral      (faint praise ≠ positive)
```

## Programmatic Example Selection

For dynamic systems, select examples at runtime:

```typescript
interface Example {
  input: string;
  output: string;
  category: string;
  embedding?: number[];
}

function selectExamples(
  query: string,
  pool: Example[],
  k: number = 3,
  strategy: 'diverse' | 'similar' | 'mixed' = 'mixed'
): Example[] {
  if (strategy === 'similar') {
    // Select examples most similar to the input (nearest neighbor)
    return pool
      .map(ex => ({ ...ex, similarity: cosineSimilarity(embed(query), ex.embedding!) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  if (strategy === 'diverse') {
    // Select examples that cover different categories
    const categories = [...new Set(pool.map(ex => ex.category))];
    return categories.slice(0, k).map(cat =>
      pool.find(ex => ex.category === cat)!
    );
  }

  // Mixed: some similar + some diverse
  const similar = selectExamples(query, pool, Math.ceil(k / 2), 'similar');
  const diverse = selectExamples(query, pool, Math.floor(k / 2), 'diverse')
    .filter(ex => !similar.includes(ex));
  return [...similar, ...diverse].slice(0, k);
}
```

## Multi-Turn Few-Shot (Conversation Examples)

For chat applications, show example conversations:

```typescript
const messages = [
  // Example conversation 1
  { role: 'user', content: 'How do I reset my password?' },
  { role: 'assistant', content: 'To reset your password:\n1. Go to Settings → Security\n2. Click "Change password"\n3. Enter your current password and new password\n4. Click Save\n\nNeed help with anything else?' },

  // Example conversation 2
  { role: 'user', content: 'The app keeps crashing' },
  { role: 'assistant', content: 'I\'m sorry to hear that! Let me help troubleshoot. Could you tell me:\n1. What device and OS are you using?\n2. When did the crashing start?\n3. Does it crash on a specific screen?\n\nThis will help me narrow down the issue.' },

  // Actual user message
  { role: 'user', content: actualUserMessage },
];
```

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Too many examples | Context window waste, slower | Use 3-5 well-chosen examples |
| All same category | Biases model toward that category | Cover all output categories |
| Perfect examples only | Model doesn't learn boundary behavior | Include edge cases |
| Examples contradict instructions | Model confused about rules | Ensure examples match instructions |
| Identical format examples | Model can't generalize | Vary input phrasing and structure |
| No separator between examples | Model can't distinguish them | Use clear delimiters (###, ---) |

## Checklist

- [ ] Examples demonstrate desired output format exactly
- [ ] Edge cases and boundary inputs included
- [ ] All output categories represented (don't bias toward one)
- [ ] Examples are consistent with the task instructions
- [ ] Difficulty gradient: easy → hard
- [ ] Contrastive pairs for ambiguous cases
- [ ] 3-5 examples (sweet spot for most tasks)
- [ ] Clear delimiters between examples
- [ ] Examples use realistic data, not "foo/bar/test123"
