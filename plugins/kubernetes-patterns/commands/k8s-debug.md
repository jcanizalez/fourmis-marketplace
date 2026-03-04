---
name: k8s-debug
description: Diagnose and fix Kubernetes issues — CrashLoopBackOff, OOMKilled, pending pods, networking problems
arguments:
  - name: issue
    description: "Describe the issue: crashloop, oom, pending, networking, slow, error message, or general"
    required: false
---

# Kubernetes Debug Session

Systematically diagnose and fix Kubernetes issues using a structured debugging approach.

## Instructions

If the user describes a specific issue, jump to the relevant section. Otherwise, start with the general debugging framework.

### General Framework

Run these commands in order and analyze the output:

```bash
# 1. Pod status overview
kubectl get pods -n <namespace> -o wide

# 2. Events (most recent first)
kubectl get events -n <namespace> --sort-by=.lastTimestamp | tail -20

# 3. Describe the problematic pod
kubectl describe pod <pod-name> -n <namespace>

# 4. Container logs
kubectl logs <pod-name> -n <namespace> --tail=100
kubectl logs <pod-name> -n <namespace> --previous  # After crashes

# 5. Resource usage
kubectl top pods -n <namespace>
kubectl top nodes
```

### CrashLoopBackOff Diagnosis

```bash
# Step 1: Check the crash reason
kubectl describe pod <pod> -n <ns> | grep -A10 "State:\|Last State:"

# Step 2: Get logs from the crashed container
kubectl logs <pod> -n <ns> --previous

# Step 3: Check if it's a config issue
kubectl describe pod <pod> -n <ns> | grep -A5 "Environment\|Mounts\|Volumes"

# Step 4: Verify ConfigMaps and Secrets exist
kubectl get configmaps -n <ns>
kubectl get secrets -n <ns>

# Step 5: Test the image locally or with debug container
kubectl debug -it <pod> -n <ns> --image=busybox --target=<container>
```

**Common fixes:**
- Missing env var → create ConfigMap/Secret
- Wrong command → fix Dockerfile CMD or pod command override
- Dependency unavailable → check service DNS, endpoints
- Startup too slow → increase startupProbe failureThreshold

### OOMKilled Diagnosis

```bash
# Step 1: Confirm OOM
kubectl describe pod <pod> -n <ns> | grep -B2 -A5 "OOMKilled"

# Step 2: Check current memory usage
kubectl top pod <pod> -n <ns>

# Step 3: Check memory limits
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].resources}'

# Step 4: Check node memory pressure
kubectl describe node <node> | grep -A5 "Conditions"
```

**Fixes:**
- Increase memory limit if genuinely needed
- Profile the application for memory leaks
- Add JVM `-Xmx` flags for Java apps
- Check for unbounded caches or buffers

### Pending Pod Diagnosis

```bash
# Step 1: Check scheduler events
kubectl describe pod <pod> -n <ns> | grep -A10 "Events"

# Step 2: Check node resources
kubectl describe nodes | grep -A10 "Allocated resources"

# Step 3: Check if it's a PVC issue
kubectl get pvc -n <ns>

# Step 4: Check node taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Step 5: Check node selectors vs labels
kubectl get nodes --show-labels
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.nodeSelector}'
```

**Fixes:**
- Insufficient CPU/memory → scale cluster or reduce requests
- PVC pending → check StorageClass, zone constraints
- Taint mismatch → add tolerations
- nodeSelector mismatch → update labels or selector

### Network Debugging

```bash
# Step 1: Check service and endpoints
kubectl get svc <service> -n <ns>
kubectl get endpoints <service> -n <ns>

# Step 2: DNS check
kubectl run dns-debug --image=busybox -it --rm -- nslookup <service>.<ns>.svc.cluster.local

# Step 3: Connectivity check
kubectl run net-debug --image=nicolaka/netshoot -it --rm -- curl -v http://<service>.<ns>:port/healthz

# Step 4: Check NetworkPolicies
kubectl get networkpolicy -n <ns>
kubectl describe networkpolicy -n <ns>

# Step 5: Check Ingress
kubectl get ingress -n <ns>
kubectl describe ingress <ingress-name> -n <ns>
```

**Common networking issues:**
- Empty endpoints → selector doesn't match pod labels
- DNS not resolving → CoreDNS issue
- Connection refused → wrong port or pod not ready
- Timeout → NetworkPolicy blocking traffic or pod not running

### Slow Performance Diagnosis

```bash
# Step 1: Check resource utilization
kubectl top pods -n <ns> --sort-by=cpu
kubectl top pods -n <ns> --sort-by=memory

# Step 2: Check if CPU is being throttled
kubectl describe pod <pod> -n <ns> | grep -A5 "resources"
# If CPU usage is near the limit, pods are being throttled

# Step 3: Check HPA status
kubectl get hpa -n <ns>
kubectl describe hpa <hpa-name> -n <ns>

# Step 4: Check node health
kubectl top nodes
kubectl describe node <node> | grep -A5 "Conditions"

# Step 5: Check for noisy neighbors
kubectl top pods --all-namespaces --sort-by=cpu | head -20
```

### After Diagnosis

1. Explain the root cause clearly
2. Suggest the specific fix (YAML change, command, or config)
3. Provide the kubectl commands to apply the fix
4. Suggest monitoring to prevent recurrence
5. If the issue is complex, suggest a temporary workaround while investigating
