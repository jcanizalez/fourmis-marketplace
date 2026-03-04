---
description: When the user asks about Kubernetes storage, PersistentVolumes, PVCs, StorageClasses, StatefulSets, CSI drivers, volume mounts, or persistent data in K8s
---

# Kubernetes Storage

Production patterns for persistent storage, StatefulSets, and volume management.

## Storage Architecture

```
StorageClass → PersistentVolume (PV) → PersistentVolumeClaim (PVC) → Pod
                 (the disk)              (the request)                (the user)
```

- **StorageClass**: Defines *how* to provision storage (AWS EBS, GCE PD, NFS, etc.)
- **PersistentVolume (PV)**: The actual storage resource (can be pre-provisioned or dynamic)
- **PersistentVolumeClaim (PVC)**: A request for storage by a Pod
- **Dynamic Provisioning**: StorageClass auto-creates PVs when PVCs are created

## StorageClasses

### AWS EBS

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
reclaimPolicy: Retain     # Retain data after PVC deleted (vs Delete)
volumeBindingMode: WaitForFirstConsumer  # Bind when Pod scheduled
allowVolumeExpansion: true  # Allow PVC resize
```

### GCE Persistent Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd  # For HA
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### Local Storage (for databases on bare metal)

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
```

## PersistentVolumeClaims

### Standard PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce      # RWO: single node read/write
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 20Gi
```

### Access Modes

| Mode | Short | Description |
|------|-------|-------------|
| `ReadWriteOnce` | RWO | Single node read/write (most common) |
| `ReadOnlyMany` | ROX | Many nodes read-only |
| `ReadWriteMany` | RWX | Many nodes read/write (needs NFS/EFS) |
| `ReadWriteOncePod` | RWOP | Single pod read/write (K8s 1.27+) |

### Mount PVC in Pod

```yaml
spec:
  containers:
    - name: app
      volumeMounts:
        - name: data
          mountPath: /var/data
        - name: data
          mountPath: /var/data/logs
          subPath: logs  # Mount subdirectory only
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: app-data
```

### Expand PVC

```bash
# Edit the PVC to increase size (storageClass must allow expansion)
kubectl patch pvc app-data -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Check status
kubectl get pvc app-data -o jsonpath='{.status.conditions}'
```

## StatefulSets

For stateful applications (databases, message queues) that need:
- Stable network identities (pod-0, pod-1, pod-2)
- Stable persistent storage (each pod gets its own PVC)
- Ordered deployment and scaling

### PostgreSQL StatefulSet

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: production
spec:
  type: ClusterIP
  clusterIP: None  # Headless for stable DNS
  selector:
    app: postgres
  ports:
    - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-headless  # Must match headless service
  replicas: 3
  podManagementPolicy: OrderedReady  # Sequential startup

  selector:
    matchLabels:
      app: postgres

  template:
    metadata:
      labels:
        app: postgres
    spec:
      securityContext:
        runAsUser: 999
        runAsGroup: 999
        fsGroup: 999

      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: "myapp"
            - name: PGDATA
              value: "/var/lib/postgresql/data/pgdata"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secrets
                  key: password

          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 4Gi

          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data

          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 30
            periodSeconds: 10

          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 5
            periodSeconds: 5

  # VolumeClaimTemplates — each pod gets its own PVC
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

### StatefulSet DNS

```
# Each pod gets a stable DNS name:
postgres-0.postgres-headless.production.svc.cluster.local
postgres-1.postgres-headless.production.svc.cluster.local
postgres-2.postgres-headless.production.svc.cluster.local
```

### StatefulSet Operations

```bash
# Scale (adds pods sequentially)
kubectl scale statefulset postgres --replicas=5 -n production

# Rolling update (reverse order: 2, 1, 0)
kubectl rollout status statefulset/postgres -n production

# Delete individual pod (it will be recreated with same name and PVC)
kubectl delete pod postgres-1 -n production

# Delete StatefulSet but keep PVCs
kubectl delete statefulset postgres --cascade=orphan -n production
```

## Volume Types (Non-Persistent)

### emptyDir (Temporary)

```yaml
# Scratch space, shared between containers, deleted when pod dies
volumes:
  - name: temp
    emptyDir: {}

  # RAM-backed emptyDir (faster, counts against memory limit)
  - name: cache
    emptyDir:
      medium: Memory
      sizeLimit: 256Mi
```

### hostPath (Node Filesystem)

```yaml
# Mount host filesystem — use ONLY for system-level tools (DaemonSets)
volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
      type: Socket

  - name: host-logs
    hostPath:
      path: /var/log
      type: Directory
```

### Projected Volumes (Combine Sources)

```yaml
volumes:
  - name: all-config
    projected:
      sources:
        - configMap:
            name: app-config
        - secret:
            name: app-secrets
        - serviceAccountToken:
            path: token
            expirationSeconds: 3600
            audience: vault
```

## Backup and Restore

### Velero (Cluster Backup)

```bash
# Install Velero with AWS provider
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket my-backup-bucket \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1

# Create backup
velero backup create production-backup \
  --include-namespaces production \
  --include-resources deployments,services,configmaps,secrets,pvc

# Schedule daily backups
velero schedule create daily-production \
  --schedule="0 2 * * *" \
  --include-namespaces production \
  --ttl 168h  # Keep for 7 days

# Restore
velero restore create --from-backup production-backup
```

### Volume Snapshots (CSI)

```yaml
# Create snapshot
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot
  namespace: production
spec:
  volumeSnapshotClassName: csi-aws-snapclass
  source:
    persistentVolumeClaimName: data-postgres-0
---
# Restore from snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-postgres-restored
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: postgres-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Storage Best Practices

1. **Always use `WaitForFirstConsumer`** binding mode — avoids zone mismatch issues
2. **Set `reclaimPolicy: Retain`** for production databases — never auto-delete data
3. **Use `ReadWriteOncePod`** (RWOP) when only one Pod should access the volume
4. **Enable volume expansion** on StorageClasses — avoids recreating PVCs
5. **Use emptyDir for temp files** — don't waste persistent storage on caches
6. **Back up StatefulSet PVCs** regularly with Velero or volume snapshots
7. **Monitor PVC usage** — set alerts before hitting capacity
8. **Use subPath** to share a PVC across multiple mount points
