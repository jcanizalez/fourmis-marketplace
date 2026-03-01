---
description: When the user asks about evaluating LLM output, testing prompts, LLM benchmarks, prompt evaluation, A/B testing prompts, measuring LLM quality, regression testing for AI features, or building evaluation pipelines
---

# LLM Evaluation

Measure and improve LLM output quality systematically. Covers evaluation datasets, automated metrics, LLM-as-judge patterns, regression testing, and A/B testing for prompts.

## Evaluation Framework

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Test Cases  │ ──→ │  Run Prompt  │ ──→ │  Evaluate   │
│  (dataset)   │     │  (generate)  │     │  (score)    │
└─────────────┘     └──────────────┘     └─────────────┘
                                                ↓
                                         ┌─────────────┐
                                         │  Report     │
                                         │  (metrics)  │
                                         └─────────────┘
```

## Building Evaluation Datasets

### Test Case Structure

```typescript
interface TestCase {
  id: string;
  input: string;             // User input / prompt variables
  expectedOutput?: string;   // Gold standard answer (if available)
  context?: string;          // Additional context (for RAG tests)
  metadata: {
    category: string;        // For per-category analysis
    difficulty: 'easy' | 'medium' | 'hard';
    source: string;          // Where this test case came from
  };
}

// Example dataset
const evaluationDataset: TestCase[] = [
  {
    id: 'classify-001',
    input: 'The product arrived broken and customer service was unhelpful',
    expectedOutput: 'negative',
    metadata: { category: 'clear-negative', difficulty: 'easy', source: 'manual' },
  },
  {
    id: 'classify-002',
    input: 'Works as expected, nothing special',
    expectedOutput: 'neutral',
    metadata: { category: 'ambiguous', difficulty: 'medium', source: 'manual' },
  },
  {
    id: 'classify-003',
    input: 'Not bad, but I expected more for the price',
    expectedOutput: 'mixed',
    metadata: { category: 'mixed-signal', difficulty: 'hard', source: 'production' },
  },
];
```

### Dataset Best Practices

| Practice | Why |
|----------|-----|
| Minimum 50 test cases | Statistical significance |
| Cover all output categories | Don't bias toward common cases |
| Include edge cases | Boundary behavior matters |
| Use real production data | Synthetic data misses real patterns |
| Version the dataset | Track changes alongside prompt changes |
| Include hard examples | Easy examples don't differentiate prompt quality |

## Automated Evaluation Metrics

### Exact Match & Classification

```typescript
function evaluateClassification(results: { predicted: string; expected: string }[]) {
  const total = results.length;
  const correct = results.filter(r => r.predicted === r.expected).length;
  const accuracy = correct / total;

  // Per-category precision/recall
  const categories = [...new Set(results.map(r => r.expected))];
  const perCategory = categories.map(cat => {
    const predicted = results.filter(r => r.predicted === cat);
    const actual = results.filter(r => r.expected === cat);
    const truePositives = predicted.filter(r => r.expected === cat).length;

    return {
      category: cat,
      precision: predicted.length > 0 ? truePositives / predicted.length : 0,
      recall: actual.length > 0 ? truePositives / actual.length : 0,
      count: actual.length,
    };
  });

  return { accuracy, total, correct, perCategory };
}
```

### Similarity-Based (for open-ended output)

```typescript
// Embedding similarity between expected and actual output
async function semanticSimilarity(expected: string, actual: string): Promise<number> {
  const [expEmbed, actEmbed] = await embedTexts([expected, actual]);
  return cosineSimilarity(expEmbed, actEmbed);
}

// Run across test set
async function evaluateSimilarity(results: { expected: string; actual: string }[]) {
  const scores = await Promise.all(
    results.map(r => semanticSimilarity(r.expected, r.actual))
  );

  return {
    meanSimilarity: scores.reduce((a, b) => a + b, 0) / scores.length,
    minSimilarity: Math.min(...scores),
    medianSimilarity: scores.sort()[Math.floor(scores.length / 2)],
    belowThreshold: scores.filter(s => s < 0.8).length,
  };
}
```

## LLM-as-Judge

Use an LLM to evaluate another LLM's output:

### Pointwise Evaluation (Score Each Output)

```typescript
async function llmJudge(
  input: string,
  output: string,
  criteria: string
): Promise<{ score: number; reasoning: string }> {
  const response = await callLLM(`You are an expert evaluator. Rate the following
AI output on a scale of 1-5 based on the given criteria.

## Criteria
${criteria}

## Input
${input}

## Output to Evaluate
${output}

## Scoring Guide
1 - Completely fails the criteria
2 - Mostly fails, minor aspects correct
3 - Partially meets criteria, significant issues
4 - Mostly meets criteria, minor issues
5 - Fully meets criteria, high quality

Respond in JSON: { "score": N, "reasoning": "Brief explanation" }
`);

  return JSON.parse(response);
}

// Usage
const result = await llmJudge(
  'Explain what a REST API is to a junior developer',
  llmOutput,
  'Accuracy, clarity, appropriate level of detail for a junior developer, includes a practical example'
);
```

### Pairwise Comparison (A vs B)

```typescript
async function pairwiseCompare(
  input: string,
  outputA: string,
  outputB: string,
  criteria: string
): Promise<'A' | 'B' | 'tie'> {
  const response = await callLLM(`Compare these two AI outputs and decide which is better.

## Criteria
${criteria}

## Input
${input}

## Output A
${outputA}

## Output B
${outputB}

Which output better meets the criteria? Respond with ONLY "A", "B", or "TIE".
Important: Your evaluation should not be affected by the order of presentation.
`);

  const choice = response.trim().toUpperCase();
  if (choice === 'A') return 'A';
  if (choice === 'B') return 'B';
  return 'tie';
}
```

### Multi-Criteria Evaluation

```typescript
const EVALUATION_CRITERIA = {
  accuracy: 'Is the information factually correct? Are there any hallucinations or errors?',
  relevance: 'Does the response directly address the user\'s question?',
  completeness: 'Does the response cover all important aspects of the question?',
  clarity: 'Is the response well-organized, easy to understand, and concise?',
  safety: 'Is the response appropriate and free of harmful content?',
};

async function multiCriteriaEval(input: string, output: string) {
  const scores = await Promise.all(
    Object.entries(EVALUATION_CRITERIA).map(async ([criterion, description]) => {
      const result = await llmJudge(input, output, description);
      return { criterion, ...result };
    })
  );

  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  return { scores, averageScore: avgScore };
}
```

## Regression Testing Pipeline

```typescript
interface EvalResult {
  testId: string;
  promptVersion: string;
  input: string;
  output: string;
  scores: Record<string, number>;
  passed: boolean;
  timestamp: Date;
}

async function runEvalSuite(
  promptVersion: string,
  prompt: string,
  testCases: TestCase[],
  thresholds: Record<string, number> = { accuracy: 0.85, similarity: 0.80 }
): Promise<{ results: EvalResult[]; summary: Record<string, number>; passed: boolean }> {
  const results: EvalResult[] = [];

  for (const testCase of testCases) {
    const output = await callLLM(prompt.replace('{input}', testCase.input));

    const scores: Record<string, number> = {};

    // Exact match (if expected output exists)
    if (testCase.expectedOutput) {
      scores.exactMatch = output.trim().toLowerCase() === testCase.expectedOutput.toLowerCase() ? 1 : 0;
    }

    // LLM judge
    const judgeResult = await llmJudge(testCase.input, output, 'accuracy, relevance, completeness');
    scores.judgeScore = judgeResult.score / 5; // Normalize to 0-1

    results.push({
      testId: testCase.id,
      promptVersion,
      input: testCase.input,
      output,
      scores,
      passed: Object.entries(thresholds).every(([metric, threshold]) =>
        (scores[metric] ?? 1) >= threshold
      ),
      timestamp: new Date(),
    });
  }

  // Summary metrics
  const summary: Record<string, number> = {};
  const metricKeys = [...new Set(results.flatMap(r => Object.keys(r.scores)))];
  for (const metric of metricKeys) {
    const values = results.map(r => r.scores[metric]).filter(v => v !== undefined);
    summary[metric] = values.reduce((a, b) => a + b, 0) / values.length;
  }

  const passed = Object.entries(thresholds).every(([metric, threshold]) =>
    (summary[metric] ?? 0) >= threshold
  );

  return { results, summary, passed };
}
```

### CI Integration

```yaml
# .github/workflows/eval.yml
name: Prompt Evaluation
on:
  push:
    paths:
      - 'prompts/**'
      - 'eval/**'

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run eval
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - name: Check thresholds
        run: |
          node -e "
            const results = require('./eval-results.json');
            if (!results.passed) {
              console.error('Eval failed:', results.summary);
              process.exit(1);
            }
            console.log('Eval passed:', results.summary);
          "
```

## Evaluation Report Template

```markdown
## Prompt Evaluation Report

### Prompt: product-review-classifier v2.3
### Date: 2026-03-01
### Test Cases: 100

### Overall Metrics
| Metric | v2.2 | v2.3 | Δ | Threshold | Status |
|--------|------|------|---|-----------|--------|
| Accuracy | 82% | 87% | +5% | ≥85% | ✅ Pass |
| Judge Score | 3.8 | 4.2 | +0.4 | ≥4.0 | ✅ Pass |
| Latency (p50) | 1.2s | 1.1s | -0.1s | <2s | ✅ Pass |

### Per-Category Breakdown
| Category | Precision | Recall | Count | Change |
|----------|-----------|--------|-------|--------|
| Positive | 92% | 88% | 40 | +3% |
| Negative | 85% | 90% | 30 | +5% |
| Neutral | 78% | 80% | 20 | +8% |
| Mixed | 72% | 75% | 10 | +2% |

### Failed Cases (3)
| ID | Input | Expected | Got | Notes |
|----|-------|----------|-----|-------|
| 047 | "Not terrible" | neutral | positive | Double negative confusion |
| 063 | "5/10 would try again" | mixed | positive | Numeric rating misread |
| 089 | "" | neutral | error | Empty input not handled |

### Recommendation
v2.3 passes all thresholds. Deploy to production.
Add test cases for double negatives and numeric ratings.
```

## Checklist

- [ ] Evaluation dataset has 50+ test cases covering all categories
- [ ] Edge cases and hard examples included in dataset
- [ ] Automated metrics run on every prompt change
- [ ] LLM-as-judge used for open-ended evaluation
- [ ] Pairwise comparison used when comparing prompt versions
- [ ] Regression thresholds defined and enforced in CI
- [ ] Per-category breakdown identifies weak spots
- [ ] Failed cases reviewed and used to improve the prompt
- [ ] Evaluation dataset versioned alongside prompts
- [ ] Results logged for trend tracking across versions
