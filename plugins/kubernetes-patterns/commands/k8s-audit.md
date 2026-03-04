---
name: k8s-audit
description: Audit Kubernetes manifests for production readiness, security, and best practices
arguments:
  - name: focus
    description: "Focus area: security, resources, networking, all (default: all)"
    required: false
---

# Kubernetes Manifest Audit

Perform a comprehensive audit of Kubernetes manifests in this project for production readiness, security, and best practices.

## Audit Steps

### 1. Find All Manifests

```bash
# Find K8s YAML files
find . -name "*.yaml" -o -name "*.yml" | grep -v node_modules | grep -v .git | head -50

# Find Helm charts
find . -name "Chart.yaml" | grep -v node_modules

# Find Kustomize configs
find . -name "kustomization.yaml" -o -name "kustomization.yml" | grep -v node_modules
```

### 2. Security Audit

Check every manifest for:

- [ ] **No `privileged: true`** — containers should not run as privileged
- [ ] **`runAsNonRoot: true`** — pods should not run as root
- [ ] **`readOnlyRootFilesystem: true`** — prevent filesystem writes
- [ ] **`allowPrivilegeEscalation: false`** — prevent privilege escalation
- [ ] **`capabilities.drop: ["ALL"]`** — drop all Linux capabilities
- [ ] **No `hostNetwork`, `hostPID`, `hostIPC`** — don't share host namespaces
- [ ] **Secrets not hardcoded** — no plaintext passwords in manifests
- [ ] **`imagePullPolicy: IfNotPresent`** or specific tags — no `:latest`
- [ ] **ServiceAccount specified** — not using default service account
- [ ] **NetworkPolicies present** — restrict pod-to-pod traffic

### 3. Resource Management Audit

- [ ] **Resource requests set** on all containers
- [ ] **Memory limits set** on all containers
- [ ] **LimitRange in namespace** for defaults
- [ ] **ResourceQuota in namespace** for caps
- [ ] **Requests are realistic** — not too low (OOMKill) or too high (waste)

### 4. Availability Audit

- [ ] **replicas ≥ 2** for production workloads
- [ ] **PodDisruptionBudget** defined
- [ ] **Pod anti-affinity** to spread across nodes
- [ ] **topologySpreadConstraints** for zone distribution
- [ ] **Rolling update strategy** with `maxUnavailable: 0` for zero-downtime
- [ ] **Liveness, readiness, and startup probes** configured
- [ ] **terminationGracePeriodSeconds** set appropriately

### 5. Networking Audit

- [ ] **Service type appropriate** (ClusterIP for internal, LoadBalancer only when needed)
- [ ] **Ingress configured with TLS**
- [ ] **cert-manager or manual TLS** for HTTPS
- [ ] **Rate limiting annotations** on Ingress
- [ ] **Security headers** configured

### 6. Operational Audit

- [ ] **Consistent labels** (app.kubernetes.io/* standard)
- [ ] **Namespace specified** (not relying on default namespace)
- [ ] **revisionHistoryLimit** set on Deployments
- [ ] **ConfigMaps for configuration** (not hardcoded env vars)
- [ ] **Secrets for sensitive data** (not ConfigMaps)

### 7. Generate Report

```markdown
## K8s Manifest Audit Report

### Summary
- Overall Score: X/10
- Critical: N | Warning: N | Info: N

### Critical Issues
(security vulnerabilities, missing resource limits)

### Warnings
(missing probes, no PDB, single replica)

### Best Practice Suggestions
(labeling, annotations, documentation)

### Files Audited
1. file.yaml — N issues
2. file.yaml — N issues

### Action Items (Priority Order)
1. [CRITICAL] Fix security context in deployment.yaml
2. [WARNING] Add PDB for production deployment
```
