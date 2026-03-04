---
description: When the user asks about Helm charts, Kubernetes packaging, Helm templates, values files, chart dependencies, Helm hooks, or deploying applications with Helm
---

# Helm Charts

Production patterns for Kubernetes application packaging, templating, and deployment with Helm.

## Chart Structure

```
my-chart/
├── Chart.yaml            # Chart metadata
├── Chart.lock            # Locked dependency versions
├── values.yaml           # Default values
├── values-staging.yaml   # Environment-specific overrides
├── values-production.yaml
├── .helmignore           # Files to exclude from package
├── templates/
│   ├── _helpers.tpl      # Template helpers and named templates
│   ├── NOTES.txt         # Post-install instructions
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── serviceaccount.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── tests/
│       └── test-connection.yaml
└── charts/               # Subcharts (dependencies)
```

### Chart.yaml

```yaml
apiVersion: v2
name: my-app
description: A production application chart
type: application           # or "library" for shared templates
version: 1.0.0             # Chart version (semver)
appVersion: "2.3.1"        # App version (what you're deploying)

maintainers:
  - name: Javier
    email: javier@example.com

dependencies:
  - name: postgresql
    version: "~13.2"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "~18.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

## values.yaml (Defaults)

```yaml
# Application
replicaCount: 2
image:
  repository: my-app
  tag: ""                  # Defaults to chart appVersion
  pullPolicy: IfNotPresent

# Service
service:
  type: ClusterIP
  port: 80
  targetPort: 8080

# Ingress
ingress:
  enabled: false
  className: nginx
  annotations: {}
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls: []

# Resources
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    memory: 512Mi

# Autoscaling
autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

# Pod Disruption Budget
pdb:
  enabled: true
  minAvailable: 1

# Health checks
healthCheck:
  liveness:
    path: /healthz
    initialDelaySeconds: 15
  readiness:
    path: /readyz
    initialDelaySeconds: 5

# Environment
env: {}
envFrom: []

# Config
config: {}

# Secrets (reference existing secrets)
existingSecrets: []

# Service Account
serviceAccount:
  create: true
  name: ""
  annotations: {}

# Node scheduling
nodeSelector: {}
tolerations: []
affinity: {}

# Dependencies
postgresql:
  enabled: false
redis:
  enabled: false
```

## Templates

### _helpers.tpl

```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "my-app.labels" -}}
helm.sh/chart: {{ include "my-app.chart" . }}
{{ include "my-app.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Chart name and version
*/}}
{{- define "my-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Image with tag
*/}}
{{- define "my-app.image" -}}
{{- printf "%s:%s" .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) }}
{{- end }}
```

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "my-app.labels" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "my-app.fullname" . }}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: {{ .Chart.Name }}
          image: {{ include "my-app.image" . }}
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          livenessProbe:
            httpGet:
              path: {{ .Values.healthCheck.liveness.path }}
              port: http
            initialDelaySeconds: {{ .Values.healthCheck.liveness.initialDelaySeconds }}
          readinessProbe:
            httpGet:
              path: {{ .Values.healthCheck.readiness.path }}
              port: http
            initialDelaySeconds: {{ .Values.healthCheck.readiness.initialDelaySeconds }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if or .Values.env .Values.envFrom }}
          {{- if .Values.env }}
          env:
            {{- range $key, $value := .Values.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
          {{- end }}
          {{- if .Values.envFrom }}
          envFrom:
            {{- toYaml .Values.envFrom | nindent 12 }}
          {{- end }}
          {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### ingress.yaml

```yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "my-app.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

### hpa.yaml

```yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "my-app.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
{{- end }}
```

## Helm Hooks

Execute actions at specific points in the release lifecycle.

```yaml
# Pre-install / pre-upgrade: run DB migrations
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-app.fullname" . }}-migrate
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"          # Lower runs first
    "helm.sh/hook-delete-policy": hook-succeeded  # Clean up on success
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: {{ include "my-app.image" . }}
          command: ["npm", "run", "migrate"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "my-app.fullname" . }}-secrets
                  key: database-url
---
# Post-install: send Slack notification
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-app.fullname" . }}-notify
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "10"
    "helm.sh/hook-delete-policy": hook-succeeded,hook-failed
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - curl
            - -X
            - POST
            - -d
            - '{"text":"Deployed {{ .Chart.Name }} {{ .Chart.AppVersion }}"}'
            - $(SLACK_WEBHOOK_URL)
```

### Hook Types

| Hook | When |
|------|------|
| `pre-install` | Before any resources are created |
| `post-install` | After all resources are created |
| `pre-upgrade` | Before upgrade begins |
| `post-upgrade` | After upgrade completes |
| `pre-delete` | Before deletion begins |
| `post-delete` | After deletion completes |
| `pre-rollback` | Before rollback begins |
| `post-rollback` | After rollback completes |

## Helm Commands

```bash
# Create a new chart
helm create my-app

# Lint chart
helm lint my-chart/

# Template locally (see generated YAML)
helm template my-release my-chart/ -f values-production.yaml

# Diff before upgrade (requires helm-diff plugin)
helm diff upgrade my-release my-chart/ -f values-production.yaml

# Install
helm install my-release my-chart/ \
  -f values-production.yaml \
  --namespace production \
  --create-namespace

# Upgrade
helm upgrade my-release my-chart/ \
  -f values-production.yaml \
  --namespace production \
  --atomic             # Rollback on failure
  --timeout 10m

# Rollback
helm rollback my-release 1 -n production

# History
helm history my-release -n production

# Uninstall
helm uninstall my-release -n production

# Package chart
helm package my-chart/

# Push to OCI registry
helm push my-chart-1.0.0.tgz oci://ghcr.io/myorg/charts
```

## Environment-Specific Values

### values-production.yaml

```yaml
replicaCount: 3

image:
  tag: "1.2.3"

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

pdb:
  enabled: true
  minAvailable: 2

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: app-tls
      hosts:
        - app.example.com

env:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
```

### values-staging.yaml

```yaml
replicaCount: 1

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    memory: 256Mi

autoscaling:
  enabled: false

pdb:
  enabled: false

env:
  NODE_ENV: "staging"
  LOG_LEVEL: "debug"
```

## Chart Dependencies

```bash
# Add dependencies in Chart.yaml, then:
helm dependency update my-chart/
helm dependency build my-chart/

# List dependencies
helm dependency list my-chart/
```

### Override Subchart Values

```yaml
# In parent chart's values.yaml
postgresql:
  enabled: true
  auth:
    database: myapp
    username: myapp
    existingSecret: postgres-credentials
  primary:
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
    persistence:
      size: 20Gi
```

## Chart Testing

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "my-app.fullname" . }}-test"
  annotations:
    "helm.sh/hook": test
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  restartPolicy: Never
  containers:
    - name: test
      image: busybox
      command: ['wget']
      args: ['{{ include "my-app.fullname" . }}:{{ .Values.service.port }}/healthz']
```

```bash
# Run tests
helm test my-release -n production
```

## Best Practices

1. **Always use `_helpers.tpl`** — DRY your labels, names, and selectors
2. **Use `checksum/config` annotation** — triggers pod restart when ConfigMap changes
3. **Use `--atomic` for upgrades** — auto-rollback on failure
4. **Version pin dependencies** — use `~13.2` not `*`
5. **Separate values per environment** — `values-staging.yaml`, `values-production.yaml`
6. **Lint before deploying** — `helm lint` + `helm template` to catch errors
7. **Use Helm hooks for migrations** — never skip pre-upgrade database migrations
8. **Package charts in CI** — push to OCI registry (GHCR, ECR, Harbor)
