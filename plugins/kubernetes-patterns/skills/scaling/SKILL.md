---
description: When the user asks about Kubernetes scaling, HPA, VPA, KEDA, resource requests and limits, cluster autoscaler, pod autoscaling, or right-sizing workloads
---

# Kubernetes Scaling

Production patterns for horizontal and vertical scaling, resource management, and autoscaling.

## Resource Requests and Limits

### CPU and Memory

```yaml
resources:
  requests:
    cpu: 100m        # 0.1 CPU core — used for scheduling
    memory: 128Mi    # used for scheduling
  limits:
    cpu: 500m        # 0.5 CPU core — throttled if exceeded
    memory: 512Mi    # OOMKilled if exceeded
```

### Resource Units

| Resource | Unit | Examples |
|----------|------|----------|
| CPU | millicores (m) | `100m` = 0.1 core, `1000m` = `1` = 1 core |
| Memory | bytes (Mi, Gi) | `128Mi` = 128 MiB, `1Gi` = 1 GiB |

### Guidelines

- **Always set requests** — without them, pods compete unfairly for resources
- **Always set memory limits** — prevents one pod from crashing the node (OOM)
- **CPU limits are debated** — they cause CPU throttling. Many teams omit CPU limits
- **Requests ≤ Limits** — requests are what the scheduler uses; limits are the ceiling
- **Start small, measure, adjust** — use metrics-server or Prometheus to right-size

### QoS Classes

Kubernetes assigns Quality of Service based on requests/limits:

| QoS | Condition | Eviction Priority |
|-----|-----------|-------------------|
| **Guaranteed** | requests = limits for all containers | Last to be evicted |
| **Burstable** | requests < limits (or limits not set) | Middle priority |
| **BestEffort** | No requests or limits set | First to be evicted |

```yaml
# Guaranteed QoS (best for production databases)
resources:
  requests:
    cpu: "1"
    memory: 2Gi
  limits:
    cpu: "1"
    memory: 2Gi

# Burstable QoS (good for most apps)
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    memory: 1Gi  # No CPU limit — avoids throttling
```

## Horizontal Pod Autoscaler (HPA)

Scales the number of pods based on metrics.

### CPU-Based HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 3
  maxReplicas: 20

  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale when avg CPU > 70%

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60    # Wait 1 min before scaling up
      policies:
        - type: Pods
          value: 4                      # Max 4 pods at a time
          periodSeconds: 60
        - type: Percent
          value: 100                    # Or double current count
          periodSeconds: 60
      selectPolicy: Max                 # Use whichever adds more

    scaleDown:
      stabilizationWindowSeconds: 300   # Wait 5 min before scaling down
      policies:
        - type: Pods
          value: 1                      # Remove 1 pod at a time
          periodSeconds: 300
```

### Memory-Based HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Custom Metrics HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 30
  metrics:
    # Scale based on requests per second (from Prometheus)
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: 100

    # Scale based on external metric (e.g., SQS queue length)
    - type: External
      external:
        metric:
          name: sqs_queue_length
          selector:
            matchLabels:
              queue: my-work-queue
        target:
          type: AverageValue
          averageValue: 5  # Target 5 messages per pod
```

### HPA Commands

```bash
# Check HPA status
kubectl get hpa -n production

# Detailed HPA info
kubectl describe hpa my-app-hpa -n production

# Watch scaling events
kubectl get events --field-selector reason=SuccessfulRescale -n production
```

## Vertical Pod Autoscaler (VPA)

Adjusts CPU and memory requests/limits based on actual usage. Useful for right-sizing.

```bash
# Install VPA
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vertical-pod-autoscaler.yaml
```

### VPA Modes

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app

  updatePolicy:
    updateMode: "Off"  # Options: Off, Initial, Recreate, Auto

  resourcePolicy:
    containerPolicies:
      - containerName: app
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: "4"
          memory: 8Gi
        controlledResources: ["cpu", "memory"]
```

| Mode | Behavior |
|------|----------|
| `Off` | Only provides recommendations (safest — start here) |
| `Initial` | Sets resources only on pod creation |
| `Recreate` | Evicts pods to apply new resources |
| `Auto` | Like Recreate (may use in-place resize in future) |

### Read VPA Recommendations

```bash
kubectl describe vpa my-app-vpa -n production

# Look for the "Recommendation" section:
# Target:     cpu: 250m, memory: 512Mi
# Lower Bound: cpu: 100m, memory: 256Mi
# Upper Bound: cpu: 1, memory: 1Gi
```

**Important**: Don't use HPA and VPA on the same metric (e.g., both scaling on CPU). They'll fight. Use VPA for right-sizing, HPA for scaling replicas.

## KEDA (Event-Driven Autoscaling)

KEDA scales to/from zero based on external event sources (queues, streams, cron, Prometheus, etc.).

```bash
# Install KEDA
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace
```

### Scale Based on SQS Queue

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker
  namespace: production
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 0      # Scale to zero when idle!
  maxReplicaCount: 50
  cooldownPeriod: 300      # Wait 5 min before scaling down
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/my-queue
        queueLength: "5"   # Target 5 messages per pod
        awsRegion: us-east-1
      authenticationRef:
        name: aws-credentials
```

### Scale Based on Prometheus Metric

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: api-server
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring:9090
        query: sum(rate(http_requests_total{service="api"}[2m]))
        threshold: "100"    # Scale at 100 req/s per pod
```

### Scale Based on Cron Schedule

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: business-hours-scaler
spec:
  scaleTargetRef:
    name: my-app
  minReplicaCount: 1
  triggers:
    - type: cron
      metadata:
        timezone: America/New_York
        start: 0 8 * * 1-5     # Weekdays 8 AM
        end: 0 18 * * 1-5      # Weekdays 6 PM
        desiredReplicas: "10"   # Scale up during business hours
```

### KEDA ScaledJob (for Job-based workers)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: email-sender
  namespace: production
spec:
  jobTargetRef:
    template:
      spec:
        containers:
          - name: sender
            image: email-sender:1.0
        restartPolicy: Never
  pollingInterval: 10
  maxReplicaCount: 20
  triggers:
    - type: redis-lists
      metadata:
        address: redis.production:6379
        listName: email-queue
        listLength: "1"
```

## Cluster Autoscaler

Scales the number of nodes in the cluster.

### AWS EKS

```bash
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=my-cluster \
  --set awsRegion=us-east-1 \
  --set extraArgs.balance-similar-node-groups=true \
  --set extraArgs.skip-nodes-with-system-pods=false \
  --set extraArgs.scale-down-delay-after-add=10m \
  --set extraArgs.scale-down-unneeded-time=10m
```

### Karpenter (Modern Node Autoscaler for AWS)

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"]
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: node.kubernetes.io/instance-type
          operator: In
          values: ["m5.large", "m5.xlarge", "m5.2xlarge", "c5.large", "c5.xlarge"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
  limits:
    cpu: "100"      # Max 100 CPU cores in this pool
    memory: 400Gi
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
```

## Pod Disruption Budgets

Protect against voluntary disruptions (node drains, upgrades):

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
  namespace: production
spec:
  # Choose ONE of these:
  minAvailable: 2            # At least 2 pods must be running
  # OR
  # maxUnavailable: 1        # At most 1 pod can be down

  selector:
    matchLabels:
      app: my-app
```

## Scaling Best Practices

1. **Set resource requests on all pods** — HPA needs metrics-server which needs requests
2. **Use HPA for stateless apps** — scales replicas horizontally
3. **Use VPA in "Off" mode first** — read recommendations before enabling auto
4. **Scale conservatively down** — use `stabilizationWindowSeconds` (300s+) for scale-down
5. **Use PDB with all production deployments** — protects during node drains
6. **KEDA for event-driven** — queues, cron-based scaling, scale-to-zero
7. **Monitor scaling events** — watch HPA decisions and cluster autoscaler logs
8. **Test autoscaling** — use load testing tools (k6, hey) to verify scaling behavior
