---
description: When the user asks about Kubernetes networking, Ingress, NetworkPolicies, DNS, load balancing, service mesh, or traffic routing in K8s
---

# Kubernetes Networking

Production networking patterns for traffic routing, ingress, policies, and service discovery.

## Service Types Comparison

| Type | Access | Use Case |
|------|--------|----------|
| `ClusterIP` | Internal only | Default, service-to-service |
| `NodePort` | External via node IP:port | Dev/testing, range 30000-32767 |
| `LoadBalancer` | External via cloud LB | Production external services |
| `ExternalName` | DNS CNAME | External service aliasing |
| `Headless` (clusterIP: None) | Direct Pod IPs | StatefulSets, custom discovery |

## Ingress

### NGINX Ingress Controller

```bash
# Install via Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.replicaCount=2
```

### Basic Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-api
                port:
                  number: 8080
```

### Advanced Ingress Annotations (NGINX)

```yaml
metadata:
  annotations:
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-connections: "5"

    # Timeouts
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"

    # Body size
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"

    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"

    # Sticky sessions (for WebSocket)
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"

    # WebSocket support
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/use-regex: "true"

    # Auth
    nginx.ingress.kubernetes.io/auth-url: "https://auth.example.com/verify"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.example.com/login"

    # Custom headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
```

### TLS with cert-manager

```bash
# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true
```

```yaml
# ClusterIssuer for Let's Encrypt
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
---
# Ingress with auto TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls  # Auto-created by cert-manager
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

## NetworkPolicies

By default, all Pods can communicate freely. NetworkPolicies restrict traffic.

### Default Deny All

```yaml
# Deny all ingress traffic in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}   # Applies to all pods
  policyTypes:
    - Ingress
---
# Deny all egress traffic in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

### Allow Specific Traffic

```yaml
# Allow backend to talk to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 5432
---
# Allow frontend to call backend API
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx  # Allow ingress controller
      ports:
        - protocol: TCP
          port: 8080
```

### Allow DNS Egress (Required with deny-all egress)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## DNS and Service Discovery

### Internal DNS Format

```
<service-name>.<namespace>.svc.cluster.local

# Examples:
postgres.production.svc.cluster.local      # Full FQDN
postgres.production                        # Short form (cross-namespace)
postgres                                    # Same namespace only
```

### Headless Service DNS (StatefulSet)

```
# Individual pod DNS:
<pod-name>.<service-name>.<namespace>.svc.cluster.local

# Example with StatefulSet "postgres" and headless service "postgres-headless":
postgres-0.postgres-headless.production.svc.cluster.local
postgres-1.postgres-headless.production.svc.cluster.local
```

### ExternalName (DNS Alias)

```yaml
# Point a K8s service name to an external DNS
apiVersion: v1
kind: Service
metadata:
  name: external-db
  namespace: production
spec:
  type: ExternalName
  externalName: mydb.us-east-1.rds.amazonaws.com
```

### Custom DNS Config

```yaml
spec:
  dnsPolicy: "None"
  dnsConfig:
    nameservers:
      - 8.8.8.8
    searches:
      - production.svc.cluster.local
      - svc.cluster.local
    options:
      - name: ndots
        value: "2"
```

## Gateway API (Modern Alternative to Ingress)

```yaml
# GatewayClass (cluster-wide, like IngressClass)
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: my-gateway-class
spec:
  controllerName: example.com/gateway-controller
---
# Gateway (the actual listener)
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: production
spec:
  gatewayClassName: my-gateway-class
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: app-tls
      allowedRoutes:
        namespaces:
          from: Same
---
# HTTPRoute (routes traffic to services)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-route
  namespace: production
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - "app.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: backend-api
          port: 8080
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: frontend
          port: 80
```

## Traffic Splitting (Canary Deployments)

### With Gateway API

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-route
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - "app.example.com"
  rules:
    - backendRefs:
        - name: my-app-stable
          port: 80
          weight: 90
        - name: my-app-canary
          port: 80
          weight: 10
```

### With NGINX Ingress Canary

```yaml
# Stable ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-stable
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-stable
                port:
                  number: 80
---
# Canary ingress (10% traffic)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-canary
                port:
                  number: 80
```
