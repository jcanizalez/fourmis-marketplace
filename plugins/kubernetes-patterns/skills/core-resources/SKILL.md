---
description: When the user asks about Kubernetes resources, Pods, Deployments, Services, ConfigMaps, Secrets, Namespaces, DaemonSets, Jobs, CronJobs, or basic K8s manifest patterns
---

# Kubernetes Core Resources

Production-ready patterns for the fundamental Kubernetes resource types.

## Pods

The smallest deployable unit. Never create bare Pods in production — use a controller (Deployment, StatefulSet, Job).

### Pod Spec Best Practices

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
  labels:
    app: my-app
    version: v1
    environment: production
spec:
  # Security
  serviceAccountName: my-app-sa
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: app
      image: my-app:1.2.3  # Always use specific tags, never :latest
      imagePullPolicy: IfNotPresent

      # Resource management
      resources:
        requests:
          cpu: 100m        # 0.1 CPU core
          memory: 128Mi
        limits:
          cpu: 500m        # 0.5 CPU core
          memory: 512Mi
          # Note: some teams omit CPU limits to avoid throttling

      # Health checks
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 15
        periodSeconds: 10
        timeoutSeconds: 3
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /readyz
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
        timeoutSeconds: 3
        failureThreshold: 3
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        failureThreshold: 30
        periodSeconds: 10

      # Security
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]

      # Ports
      ports:
        - name: http
          containerPort: 8080
          protocol: TCP

      # Environment
      env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db-host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db-password
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name

      # Volume mounts
      volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: config
          mountPath: /etc/app/config
          readOnly: true

  volumes:
    - name: tmp
      emptyDir: {}
    - name: config
      configMap:
        name: app-config

  # Scheduling
  terminationGracePeriodSeconds: 30
  restartPolicy: Always
```

## Deployments

The standard way to run stateless applications.

### Production Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
  labels:
    app: my-app
    team: backend
spec:
  replicas: 3
  revisionHistoryLimit: 5  # Keep 5 old ReplicaSets for rollback

  # Rolling update strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1           # 1 extra pod during update
      maxUnavailable: 0     # Zero downtime

  selector:
    matchLabels:
      app: my-app

  template:
    metadata:
      labels:
        app: my-app
        version: v1.2.3
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      affinity:
        # Spread pods across nodes
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: my-app
                topologyKey: kubernetes.io/hostname

      # Topology spread for even distribution
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: my-app

      containers:
        - name: app
          image: my-app:1.2.3
          # ... (pod spec from above)
```

### Rollback Commands

```bash
# Check rollout status
kubectl rollout status deployment/my-app -n production

# View rollout history
kubectl rollout history deployment/my-app -n production

# Rollback to previous version
kubectl rollout undo deployment/my-app -n production

# Rollback to specific revision
kubectl rollout undo deployment/my-app --to-revision=3 -n production

# Pause/resume rollout
kubectl rollout pause deployment/my-app -n production
kubectl rollout resume deployment/my-app -n production
```

## Services

### ClusterIP (Internal)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
spec:
  type: ClusterIP  # Default, internal only
  selector:
    app: my-app
  ports:
    - name: http
      port: 80           # Service port
      targetPort: 8080   # Container port
      protocol: TCP
```

### NodePort (Development/Testing)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-nodeport
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080     # Range: 30000-32767
```

### LoadBalancer (Cloud)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-lb
  annotations:
    # AWS-specific
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 443
      targetPort: 8080
```

### Headless Service (StatefulSets)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-db
spec:
  type: ClusterIP
  clusterIP: None  # Headless — DNS returns Pod IPs directly
  selector:
    app: my-db
  ports:
    - port: 5432
```

## ConfigMaps

### From YAML

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # Simple key-value pairs
  db-host: "postgres.production.svc.cluster.local"
  log-level: "info"
  max-connections: "100"

  # Multi-line config file
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://localhost:8080;
      }
    }
```

### Mount as Environment or Files

```yaml
# As environment variables (all keys)
envFrom:
  - configMapRef:
      name: app-config

# As individual env vars
env:
  - name: LOG_LEVEL
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: log-level

# As files
volumeMounts:
  - name: config
    mountPath: /etc/nginx/conf.d
volumes:
  - name: config
    configMap:
      name: app-config
      items:
        - key: nginx.conf
          path: default.conf
```

## Secrets

### Create Secrets

```bash
# From literal values
kubectl create secret generic app-secrets \
  --from-literal=db-password=mysecretpass \
  --from-literal=api-key=abc123

# From file
kubectl create secret generic tls-cert \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem

# From .env file
kubectl create secret generic app-env \
  --from-env-file=.env.production
```

### Secret YAML (base64 encoded)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
data:
  db-password: bXlzZWNyZXRwYXNz    # echo -n "mysecretpass" | base64
  api-key: YWJjMTIz                 # echo -n "abc123" | base64
---
# Or use stringData (plain text, K8s encodes it)
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets-plain
type: Opaque
stringData:
  db-password: "mysecretpass"
  api-key: "abc123"
```

### Secret Best Practices

- **Never commit Secrets to git** — use Sealed Secrets, SOPS, or External Secrets Operator
- Use RBAC to restrict Secret access
- Enable encryption at rest in etcd
- Rotate secrets regularly
- Use `stringData` in development, `data` (base64) is NOT encryption

## Namespaces

### Organization Pattern

```yaml
# Environment-based
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    team: platform
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
---
# Team-based
apiVersion: v1
kind: Namespace
metadata:
  name: team-backend
  labels:
    team: backend
```

### Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
```

### Limit Ranges (Pod Defaults)

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "2"
        memory: 2Gi
      min:
        cpu: 50m
        memory: 64Mi
```

## Jobs and CronJobs

### One-Time Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  backoffLimit: 3          # Retry up to 3 times
  activeDeadlineSeconds: 300  # Timeout after 5 min
  ttlSecondsAfterFinished: 86400  # Clean up after 24h
  template:
    spec:
      restartPolicy: Never  # or OnFailure
      containers:
        - name: migrate
          image: my-app:1.2.3
          command: ["npm", "run", "migrate"]
```

### CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-backup
spec:
  schedule: "0 2 * * *"      # 2 AM daily
  concurrencyPolicy: Forbid   # Don't overlap
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  startingDeadlineSeconds: 600
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: backup-tool:latest
              command: ["./backup.sh"]
```

## DaemonSets

Run exactly one Pod on every (or selected) node:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule  # Run on control plane too
      containers:
        - name: fluentbit
          image: fluent/fluent-bit:latest
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

## Labels and Selectors

### Recommended Labels (K8s standard)

```yaml
metadata:
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/instance: my-app-production
    app.kubernetes.io/version: "1.2.3"
    app.kubernetes.io/component: api
    app.kubernetes.io/part-of: my-platform
    app.kubernetes.io/managed-by: helm
```

### Useful kubectl Label Operations

```bash
# Filter by label
kubectl get pods -l app=my-app,environment=production

# Add/update label
kubectl label pods my-pod-abc version=v2 --overwrite

# Remove label
kubectl label pods my-pod-abc version-

# Show labels
kubectl get pods --show-labels
```
