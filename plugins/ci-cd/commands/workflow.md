---
name: workflow
description: Generate a GitHub Actions workflow for your project — CI, deploy, release, or custom
---

# /workflow — Generate GitHub Actions Workflow

Create a GitHub Actions workflow tailored to your project.

## Usage

```
/workflow                       # Auto-detect project type and generate CI
/workflow ci                    # Generate CI workflow (test, lint, build)
/workflow deploy                # Generate deployment workflow
/workflow release               # Generate release automation workflow
/workflow docker                # Generate Docker build and push workflow
/workflow <description>         # Generate custom workflow from description
```

## Examples

```
/workflow
/workflow ci
/workflow deploy to Vercel on push to main
/workflow release with npm publish
/workflow docker build and push to GHCR
/workflow "run tests on PR, deploy to staging on merge"
```

## Process

1. **Auto-detect project type**: Read package.json, requirements.txt, go.mod, etc.
2. **Determine workflow type**: CI, deploy, release, Docker, or custom
3. **Generate the workflow YAML** following best practices:
   - Proper caching for the detected package manager
   - Matrix builds for multiple versions when applicable
   - Concurrency groups to cancel redundant runs
   - Least-privilege permissions
   - Status badges
4. **Write to `.github/workflows/`** and confirm with the user
5. **Suggest additional workflows** if applicable (e.g., "Consider adding a release workflow")

## Notes

- Generates workflows following GitHub Actions best practices
- Uses latest stable action versions (checkout@v4, setup-node@v4, etc.)
- Includes proper caching configuration automatically
- Adds concurrency groups to prevent redundant runs
- For deployment workflows, suggest which secrets to configure
