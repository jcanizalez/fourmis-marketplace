---
description: When the user asks about Kubernetes debugging, kubectl troubleshooting, CrashLoopBackOff, OOMKilled, pending pods, pod errors, K8s events, or diagnosing cluster issues
---

# Kubernetes Troubleshooting

Systematic debugging patterns for common Kubernetes issues.

## Debugging Framework

```
1. Check pod status    → kubectl get pods
2. Describe the pod    → kubectl describe pod <name>
3. Read events         → kubectl get events --sort-by=.lastTimestamp
4. Read logs           → kubectl logs <pod> [--previous]
5. Exec into pod       → kubectl exec -it <pod> -- /bin/sh
6. Check networking    → kubectl run debug --image=busybox -it --rm -- /bin/sh
```

## Common Pod States

### CrashLoopBackOff

The container starts, crashes, K8s restarts it with exponential backoff (10s, 20s, 40s, ... 5min max).

```bash
# Check what's happening
kubectl describe pod <pod-name> -n <namespace>

# Check logs from the CURRENT crash
kubectl logs <pod-name> -n <namespace>

# Check logs from the PREVIOUS crash (most useful!)
kubectl logs <pod-name> -n <namespace> --previous

# Common causes:
# 1. Application error on startup (check logs)
# 2. Missing config/secret (check describe → Events)
# 3. Health check failing (check probe config)
# 4. Missing dependency (DB not reachable)
# 5. Permission error (check securityContext)
# 6. Wrong command/entrypoint
```

**Fix checklist:**
- [ ] Check `--previous` logs for the actual error
- [ ] Verify all referenced ConfigMaps and Secrets exist
- [ ] Verify environment variables are correct
- [ ] Check if the image exists and is pullable
- [ ] Try running the image locally with same env vars
- [ ] Check if startup probe needs longer `failureThreshold`

### OOMKilled (Exit Code 137)

The container exceeded its memory limit.

```bash
# Confirm OOMKill
kubectl describe pod <pod-name> | grep -A5 "Last State"
# Look for: Reason: OOMKilled, Exit Code: 137

# Check current memory usage
kubectl top pod <pod-name> -n <namespace>

# Check memory limit
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[0].resources.limits.memory}'
```

**Fix:**
```yaml
# Increase memory limit
resources:
  requests:
    memory: 256Mi
  limits:
    memory: 1Gi    # Increase this

# Or investigate the memory leak in your app:
# - Profile with pprof (Go), --inspect (Node.js)
# - Check for unbounded caches, growing arrays, leaked connections
```

### ImagePullBackOff

K8s cannot pull the container image.

```bash
kubectl describe pod <pod-name> | grep -A10 "Events"
# Look for: Failed to pull image, ImagePullBackOff

# Common causes:
# 1. Image doesn't exist (typo in name or tag)
# 2. Private registry — missing imagePullSecrets
# 3. Rate limited (Docker Hub: 100 pulls/6h for anonymous)
```

**Fix for private registries:**
```bash
# Create pull secret
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=myuser \
  --docker-password=mytoken \
  -n production

# Reference in pod spec
spec:
  imagePullSecrets:
    - name: regcred
```

### Pending Pods

Pod cannot be scheduled to any node.

```bash
kubectl describe pod <pod-name> | grep -A10 "Events"
# Look for: FailedScheduling

# Common causes and fixes:

# 1. Insufficient resources
kubectl describe nodes | grep -A5 "Allocated resources"
# Fix: add nodes, reduce requests, or right-size workloads

# 2. No matching nodes (nodeSelector, affinity, taints)
kubectl get nodes --show-labels
kubectl describe node <node> | grep Taints
# Fix: update nodeSelector/tolerations or add matching nodes

# 3. PVC binding failure
kubectl get pvc -n <namespace>
# Fix: check StorageClass exists, zone matches, capacity available

# 4. Too many pods on node
kubectl describe node <node> | grep "Pods:"
# Fix: increase maxPods in kubelet config
```

### CreateContainerConfigError

```bash
kubectl describe pod <pod-name>
# Look for: Error: configmap "X" not found
# Or:       Error: secret "X" not found

# Fix: create the missing ConfigMap or Secret
kubectl get configmaps -n <namespace>
kubectl get secrets -n <namespace>
```

## kubectl Debugging Commands

### Logs

```bash
# Current container logs
kubectl logs <pod> -n <namespace>

# Previous container logs (after crash)
kubectl logs <pod> --previous -n <namespace>

# Follow logs (tail -f)
kubectl logs <pod> -f -n <namespace>

# Specific container in multi-container pod
kubectl logs <pod> -c <container> -n <namespace>

# Last N lines
kubectl logs <pod> --tail=100 -n <namespace>

# Logs since time
kubectl logs <pod> --since=1h -n <namespace>

# All pods with label
kubectl logs -l app=my-app -n <namespace> --all-containers
```

### Exec Into Pod

```bash
# Interactive shell
kubectl exec -it <pod> -n <namespace> -- /bin/sh

# Run a command
kubectl exec <pod> -n <namespace> -- env
kubectl exec <pod> -n <namespace> -- cat /etc/resolv.conf
kubectl exec <pod> -n <namespace> -- wget -qO- http://localhost:8080/healthz

# Specific container
kubectl exec -it <pod> -c <container> -n <namespace> -- /bin/sh
```

### Debug Containers (Ephemeral)

For distroless or minimal images that don't have shells:

```bash
# Attach a debug container with tools
kubectl debug -it <pod> -n <namespace> \
  --image=busybox \
  --target=app

# Debug with network tools
kubectl debug -it <pod> -n <namespace> \
  --image=nicolaka/netshoot \
  --target=app

# Create a copy of the pod for debugging
kubectl debug <pod> -n <namespace> \
  --copy-to=debug-pod \
  --container=debug \
  --image=busybox \
  -it
```

### Events

```bash
# All events in namespace (sorted by time)
kubectl get events -n <namespace> --sort-by=.lastTimestamp

# Watch events live
kubectl get events -n <namespace> --watch

# Filter warning events only
kubectl get events -n <namespace> --field-selector type=Warning

# Events for specific pod
kubectl get events -n <namespace> --field-selector involvedObject.name=<pod-name>
```

### Resource Usage

```bash
# Pod CPU and memory usage (requires metrics-server)
kubectl top pods -n <namespace>

# Sort by memory
kubectl top pods -n <namespace> --sort-by=memory

# Node resources
kubectl top nodes

# Detailed node allocation
kubectl describe node <node> | grep -A20 "Allocated resources"
```

## Network Debugging

### DNS Resolution

```bash
# Test DNS from inside cluster
kubectl run dns-test --image=busybox -it --rm -- nslookup my-service.production.svc.cluster.local

# Check CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns
```

### Connectivity Testing

```bash
# Test service connectivity from a debug pod
kubectl run netshoot --image=nicolaka/netshoot -it --rm -- /bin/bash

# Inside the pod:
curl -v http://my-service.production:80/healthz
nslookup my-service.production
ping my-service.production
traceroute my-service.production
nc -zv my-service.production 80  # TCP port check
```

### Check Service Endpoints

```bash
# Are pods registered as endpoints?
kubectl get endpoints my-service -n production

# If empty, check:
# 1. Service selector matches pod labels
# 2. Pods are in Ready state
# 3. Correct port numbers
kubectl get pods -n production -l app=my-app --show-labels
kubectl describe service my-service -n production
```

### NetworkPolicy Debugging

```bash
# List network policies affecting a pod
kubectl get networkpolicy -n production

# Describe policies
kubectl describe networkpolicy -n production

# Test: if policy blocks traffic, try temporarily deleting it
# (in staging only!)
kubectl delete networkpolicy <name> -n staging
```

## Node Troubleshooting

```bash
# Node status
kubectl get nodes
kubectl describe node <node>

# Check node conditions
kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[-1].type,REASON:.status.conditions[-1].reason

# Common node issues:
# NotReady — kubelet not running, network issues, disk pressure
# MemoryPressure — node running out of RAM
# DiskPressure — node running out of disk space
# PIDPressure — too many processes

# Cordon node (prevent new pods)
kubectl cordon <node>

# Drain node (evict pods safely)
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data

# Uncordon node (allow pods again)
kubectl uncordon <node>
```

## RBAC Debugging

```bash
# Check if a user/SA can perform an action
kubectl auth can-i create deployments -n production --as=system:serviceaccount:production:my-app-sa

# List all permissions for a service account
kubectl auth can-i --list --as=system:serviceaccount:production:my-app-sa -n production

# Check role bindings
kubectl get rolebindings,clusterrolebindings -n production | grep my-app

# Common RBAC errors:
# Error: forbidden: User "system:serviceaccount:default:default" cannot...
# Fix: Create a ServiceAccount + RoleBinding with needed permissions
```

### ServiceAccount + RBAC Example

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-app-role
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: my-app-sa
    namespace: production
roleRef:
  kind: Role
  name: my-app-role
  apiGroup: rbac.authorization.k8s.io
```

## Quick Reference: Exit Codes

| Code | Signal | Meaning |
|------|--------|---------|
| 0 | — | Success |
| 1 | — | General application error |
| 126 | — | Command invoked cannot execute (permission) |
| 127 | — | Command not found |
| 137 | SIGKILL | OOMKilled or `kubectl delete pod` |
| 139 | SIGSEGV | Segmentation fault |
| 143 | SIGTERM | Graceful termination |

## Troubleshooting Checklist

```
□ Pod Status
  □ kubectl get pods — is it Running? How many restarts?
  □ kubectl describe pod — check Events section
  □ kubectl logs --previous — check crash logs

□ Resources
  □ kubectl top pod — actual usage vs limits
  □ kubectl describe node — is the node under pressure?

□ Networking
  □ kubectl get endpoints — are pods registered?
  □ kubectl get svc — is the service configured correctly?
  □ DNS resolution working?
  □ NetworkPolicies blocking traffic?

□ Config
  □ ConfigMaps and Secrets exist?
  □ Environment variables correct?
  □ Volume mounts correct?

□ Permissions
  □ ServiceAccount has correct RBAC?
  □ SecurityContext allows what the app needs?
  □ PodSecurityPolicy/Admission not blocking?

□ Image
  □ Image exists and is pullable?
  □ imagePullSecrets configured for private registries?
  □ Image tag is correct (not :latest in production)?
```
