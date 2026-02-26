---
name: incident
description: Start an incident response flow — assess severity, triage, suggest mitigations, and generate a postmortem template
---

# /incident

Start a structured incident response flow for a production issue.

## Instructions

1. Ask the user to describe the incident:
   - What's happening? (symptoms, error messages)
   - When did it start?
   - What changed recently? (deploys, config, infrastructure)
   - How many users are affected?
2. Apply the incident-response skill to:
   - Classify severity (SEV1-SEV4)
   - Walk through the diagnostic decision tree
   - Suggest specific triage commands to run
   - Recommend mitigation strategies (rollback, scale, feature flag, etc.)
3. As the user provides more information, narrow down the root cause
4. Once resolved, offer to generate a postmortem document using the template

## Arguments

If arguments are provided, interpret them as the incident description:
- `/incident API returning 500 errors` → Start triage for API errors
- `/incident deployment broke login` → Start triage for deploy-related login failure
- `/incident postmortem` → Generate a postmortem template for a past incident

$ARGUMENTS
