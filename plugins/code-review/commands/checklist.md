---
name: checklist
description: Generate a review checklist tailored to the type of code being changed
---

# /checklist — Review Checklist

Generate a targeted review checklist based on the type of changes.

## Usage

```
/checklist <type>               # Generate checklist for a code type
/checklist <file>               # Auto-detect type and generate checklist
/checklist --diff               # Generate checklist for current changes
```

## Types

```
/checklist api                  # API endpoint checklist
/checklist component            # React/UI component checklist
/checklist migration            # Database migration checklist
/checklist auth                 # Authentication/authorization checklist
/checklist error-handling       # Error handling checklist
/checklist performance          # Performance checklist
/checklist config               # Configuration/environment checklist
```

## Examples

```
/checklist api
/checklist src/components/UserProfile.tsx
/checklist migration
/checklist --diff
```

## Process

1. **Type argument**: Generate the matching checklist from the review-checklist skill
2. **File argument**: Detect the file type and pick the matching checklist
   - `.tsx`/`.jsx` → React component checklist
   - Route handler files → API checklist
   - Migration files → Migration checklist
   - Auth-related files → Auth checklist
3. **--diff**: Look at `git diff`, identify changed file types, combine checklists
4. **Present as interactive checklist** that the user can work through

## Notes

- Checklists are comprehensive but filterable — skip items that don't apply
- Combine multiple checklists for files that touch several areas
- Use before submitting a PR to self-review
