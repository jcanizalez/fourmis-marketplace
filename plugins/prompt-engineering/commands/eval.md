---
name: eval
description: Evaluate LLM output quality — run test cases against prompts, score with LLM-as-judge, compare prompt versions, and generate evaluation reports
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /eval — LLM Evaluation Runner

Evaluate and compare prompt quality with automated testing.

## Usage

```
/eval                                   # Evaluate prompts in the project
/eval benchmark                         # Run full benchmark suite
/eval compare                           # Compare two prompt versions (A/B)
/eval judge "output text"               # Quick LLM-as-judge scoring
```

## Workflow

### Benchmark Mode (default)

1. **Find prompts**: Scan project for prompt files, system prompts, LLM calls
2. **Find test data**: Look for eval datasets (JSON, JSONL, CSV)
3. **Run evaluation**: Execute prompts against test cases
4. **Score outputs**: Exact match, similarity, LLM-as-judge
5. **Generate report**: Metrics, per-category breakdown, failed cases
6. **Output**: Markdown evaluation report

### Compare Mode

1. **Load versions**: Read prompt version A and version B
2. **Run both**: Execute each against the same test cases
3. **Pairwise compare**: LLM-as-judge picks the better output
4. **Statistical summary**: Win rate, category breakdown
5. **Recommendation**: Which version to deploy

### Quick Judge Mode

1. **Read output**: Take the provided text
2. **Multi-criteria score**: Accuracy, relevance, completeness, clarity
3. **Output**: Scores with reasoning

## Output

```markdown
## Evaluation Report

### Prompt: [name] v[version]
### Test Cases: [N] | Passed: [N] | Failed: [N]

### Metrics
| Metric | Score | Threshold | Status |
|--------|-------|-----------|--------|
| Accuracy | 87% | ≥85% | ✅ |
| Format compliance | 95% | ≥90% | ✅ |
| Judge score (avg) | 4.2/5 | ≥4.0 | ✅ |

### Per-Category
| Category | Count | Score | Δ vs Previous |
|----------|-------|-------|---------------|

### Failed Cases
| ID | Input | Expected | Got | Issue |
|----|-------|----------|-----|-------|

### Recommendation
[Deploy / Fix / Investigate]
```

## Important

- Evaluation datasets should have 50+ diverse test cases
- LLM-as-judge results should be validated against human judgments periodically
- Always compare against a baseline (previous version or simple prompt)
- Cost-aware: evaluation runs consume API tokens — track spend
