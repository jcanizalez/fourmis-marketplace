---
name: prompt
description: Design, optimize, and test a prompt — generates structured prompts with role, context, format, constraints, and few-shot examples for any LLM task
allowed-tools: Read, Write, Glob, Grep
---

# /prompt — Prompt Designer

Design and optimize prompts for LLM-powered features.

## Usage

```
/prompt                                 # Interactive prompt design
/prompt "classify customer feedback"    # Design a prompt for a task
/prompt optimize                        # Improve an existing prompt
/prompt test                            # Test a prompt against examples
```

## Workflow

### Design Mode (default)

1. **Understand the task**: What is the LLM supposed to do?
2. **Choose pattern**: Classification, extraction, generation, analysis, or routing
3. **Design prompt structure**: Role + Context + Task + Format + Constraints
4. **Add few-shot examples**: 3-5 examples covering edge cases
5. **Add output format**: JSON schema, markdown structure, or plain text
6. **Output**: Complete prompt ready for integration

### Optimize Mode

1. **Read existing prompt**: Analyze the current prompt
2. **Identify issues**: Vague instructions, missing constraints, format problems
3. **Apply patterns**: Add role, tighten constraints, add examples
4. **Suggest improvements**: Specific, actionable changes
5. **Output**: Improved prompt with changelog

### Test Mode

1. **Load prompt**: Read the prompt from file or input
2. **Run test cases**: Apply prompt to example inputs
3. **Evaluate outputs**: Check format compliance, accuracy, edge cases
4. **Report**: Pass/fail summary with failure analysis

## Output

```markdown
## Prompt: [Task Name]

### System Prompt
[Complete system prompt with role, context, rules]

### User Prompt Template
[Template with {variables} for dynamic input]

### Few-Shot Examples
[3-5 examples showing input → output]

### Test Cases
| Input | Expected | Notes |
|-------|----------|-------|
| [test 1] | [expected 1] | Happy path |
| [test 2] | [expected 2] | Edge case |

### Integration Notes
- Model recommendation: [model]
- Temperature: [value]
- Max tokens: [value]
- Estimated cost per call: [value]
```

## Important

- Prompts are designed with specific output formats for machine parsing
- Few-shot examples are selected to cover edge cases, not just happy paths
- Test cases validate format compliance and accuracy
- Model and parameter recommendations included for production deployment
