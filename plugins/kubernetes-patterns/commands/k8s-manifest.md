---
name: k8s-manifest
description: Generate production-ready Kubernetes manifests for an application
arguments:
  - name: type
    description: "What to generate: deployment, statefulset, cronjob, full-stack, helm-chart"
    required: true
  - name: name
    description: "Application name"
    required: true
---

# Generate Kubernetes Manifests

Generate production-ready Kubernetes manifests for the specified application.

## Instructions

Based on the type `$ARGUMENTS`, generate appropriate manifests.

### For `deployment` (stateless app)

Generate:
1. **Namespace** (if specified)
2. **Deployment** with:
   - Security context (runAsNonRoot, readOnlyRootFilesystem, drop ALL capabilities)
   - Resource requests and limits
   - Liveness, readiness, and startup probes
   - Rolling update strategy (maxUnavailable: 0)
   - Pod anti-affinity
   - Environment from ConfigMap and Secret references
3. **Service** (ClusterIP)
4. **HPA** (with sensible defaults: 2-10 replicas, 70% CPU target)
5. **PDB** (minAvailable: 1)
6. **ServiceAccount**
7. **ConfigMap** (with placeholder config)
8. **Secret** (with placeholder, commented note about not committing)

### For `statefulset` (database, queue)

Generate:
1. **Headless Service**
2. **StatefulSet** with:
   - volumeClaimTemplates for persistent storage
   - Ordered pod management
   - Security context
   - Resource requests and limits
   - Appropriate probes (exec-based for databases)
3. **PDB**
4. **ServiceAccount**
5. **Secret** for credentials

### For `cronjob`

Generate:
1. **CronJob** with:
   - concurrencyPolicy: Forbid
   - activeDeadlineSeconds
   - backoffLimit
   - Job history limits
   - Proper restartPolicy (Never or OnFailure)

### For `full-stack` (complete app)

Generate all of the above plus:
1. **Ingress** with TLS (cert-manager annotations)
2. **NetworkPolicy** (default deny + allow specific)
3. **ResourceQuota** for the namespace
4. **LimitRange** for defaults

### For `helm-chart`

Scaffold a complete Helm chart:
1. `Chart.yaml` with metadata
2. `values.yaml` with sensible defaults
3. `templates/_helpers.tpl` with standard helpers
4. `templates/deployment.yaml` with all best practices
5. `templates/service.yaml`
6. `templates/ingress.yaml` (conditional)
7. `templates/hpa.yaml` (conditional)
8. `templates/pdb.yaml`
9. `templates/serviceaccount.yaml`
10. `templates/NOTES.txt`

### Adapt to Project

Before generating:
1. Check if the project already has K8s manifests — follow existing patterns
2. Check for Helm or Kustomize usage
3. Match existing naming conventions and namespace structure
4. Use appropriate container image reference
5. Set realistic resource requests based on the application type

### Output

Create all files and provide a summary:
- Files created with descriptions
- Commands to apply (`kubectl apply` or `helm install`)
- What to customize before deploying (secrets, domain names, resource sizing)
