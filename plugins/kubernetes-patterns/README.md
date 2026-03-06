# 🚀 kubernetes-patterns

> Production Kubernetes patterns — core resources (Pods, Deployments, StatefulSets, DaemonSets, Jobs, ConfigMaps, Secrets, Namespaces, resource quotas, labels), networking (Services, Ingress with NGINX and cert-manager TLS, NetworkPolicies with default deny, DNS service discovery, Gateway API, canary traffic splitting), storage (StorageClasses, PVCs, StatefulSets with volumeClaimTemplates, access modes, volume snapshots, Velero backups), scaling (HPA with CPU/memory/custom metrics, VPA right-sizing, KEDA event-driven scale-to-zero, PodDisruptionBudgets, Cluster Autoscaler, Karpenter), Helm charts (chart structure, values per environment, Go templates, hooks for migrations, dependencies, OCI registries, testing), and troubleshooting (CrashLoopBackOff, OOMKilled, ImagePullBackOff, pending pods, network debugging, RBAC, exit codes, kubectl debug).

**Category:** DevOps | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/kubernetes-patterns
```

## Overview

Production Kubernetes patterns — core resources (Pods, Deployments, StatefulSets, DaemonSets, Jobs, ConfigMaps, Secrets, Namespaces, resource quotas, labels), networking (Services, Ingress with NGINX and cert-manager TLS, NetworkPolicies with default deny, DNS service discovery, Gateway API, canary traffic splitting), storage (StorageClasses, PVCs, StatefulSets with volumeClaimTemplates, access modes, volume snapshots, Velero backups), scaling (HPA with CPU/memory/custom metrics, VPA right-sizing, KEDA event-driven scale-to-zero, PodDisruptionBudgets, Cluster Autoscaler, Karpenter), Helm charts (chart structure, values per environment, Go templates, hooks for migrations, dependencies, OCI registries, testing), and troubleshooting (CrashLoopBackOff, OOMKilled, ImagePullBackOff, pending pods, network debugging, RBAC, exit codes, kubectl debug). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `core-resources` | When the user asks about Kubernetes resources |
| `helm-charts` | When the user asks about Helm charts |
| `networking` | When the user asks about Kubernetes networking |
| `scaling` | When the user asks about Kubernetes scaling |
| `storage` | When the user asks about Kubernetes storage |
| `troubleshooting` | When the user asks about Kubernetes debugging |

## Commands

| Command | Description |
|---------|-------------|
| `/k8s-audit` | Audit Kubernetes manifests for production readiness, security, and best practices |
| `/k8s-debug` | Diagnose and fix Kubernetes issues — CrashLoopBackOff, OOMKilled, pending pods, networking problems |
| `/k8s-manifest` | Generate production-ready Kubernetes manifests for an application |

## Agents

### k8s-expert
Kubernetes expert that helps design, deploy, debug, and scale applications on Kubernetes clusters

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
