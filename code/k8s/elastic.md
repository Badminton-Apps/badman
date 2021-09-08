# Installing Elastic

# Search
```
cat <<EOF | kubectl apply -f -
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elastic-search
  namespace: elastic

spec:
  version: 7.14.1
  volumeClaimDeletePolicy: DeleteOnScaledownOnly
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data # Do not change this name unless you set up a volume mount for the data path.
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 5Gi
        storageClassName: standard 
  http:
    tls:
      selfSignedCertificate:
        disabled: true
EOF
```

# Kibana
```
cat <<EOF | kubectl apply -f -
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: elastic-kibana
  namespace: elastic
spec:
  version: 7.14.1
  count: 1
  elasticsearchRef:
    name: elastic-search
  config:
    server:
      publicBaseUrl: "https://kibana.badman.app"
  http:
    tls:
      selfSignedCertificate:
        disabled: true        
EOF
```

# APM
```
cat <<EOF | kubectl apply -f -
apiVersion: apm.k8s.elastic.co/v1
kind: ApmServer
metadata:
  name: elastic-apm
  namespace: elastic
spec:
  version: 7.14.1
  count: 1
  elasticsearchRef:
    name: elastic-search
  kibanaRef:
    name: elastic-kibana
  http:
    tls:
      selfSignedCertificate:
        disabled: true
  config:
    apm-server:
    rum:
      enabled: true
EOF
```

## Beats

### metricbeat
```
cat <<EOF | kubectl apply -f -
apiVersion: beat.k8s.elastic.co/v1beta1
kind: Beat
metadata:
  name: elastic-beat
  namespace: elastic
spec:
  type: metricbeat
  version: 7.14.1
  elasticsearchRef:
    name: elastic-search
  kibanaRef:
    name: elastic-kibana   
  config:
    heartbeat.monitors:
    - type: tcp
      schedule: '@every 5s'
      hosts: ["elastic-search-es-http:9200"]
  deployment:
    podTemplate:
      spec:
        dnsPolicy: ClusterFirstWithHostNet
        securityContext:
          runAsUser: 0
EOF
```


### filebeat
```
cat <<EOF | kubectl apply -f -
apiVersion: beat.k8s.elastic.co/v1beta1
kind: Beat
metadata:
  name: elastic-filebeat
  namespace: elastic
spec:
  type: filebeat
  version: 7.14.1
  elasticsearchRef:
    name: elastic-search
  kibanaRef:
    name: elastic-kibana   
  config:
    filebeat.autodiscover:
      providers:
        - type: kubernetes
          node: ${NODE_NAME}
          hints.enabled: true
          hints.default_config:
            type: container
            paths:
              - /var/log/containers/*${data.kubernetes.container.id}.log
  daemonSet:
    podTemplate:
      spec:
        dnsPolicy: ClusterFirstWithHostNet
        hostNetwork: true
        securityContext:
          runAsUser: 0
        containers:
        - name: filebeat
          volumeMounts:
          - name: varlogcontainers
            mountPath: /var/log/containers
          - name: varlogpods
            mountPath: /var/log/pods
          - name: varlibdockercontainers
            mountPath: /var/lib/docker/containers
        volumes:
        - name: varlogcontainers
          hostPath:
            path: /var/log/containers
        - name: varlogpods
          hostPath:
            path: /var/log/pods
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
EOF
```


## elastic user
```
kubectl get secret -n elastic elastic-search-es-elastic-user -o=jsonpath='{.data.elastic}' | base64 --decode; echo
```

## APM token

APM token is stored in elastic namespace,
So you need to copy it to badvla namespace

```
kubectl get secret elastic-apm-apm-token -n elastic -o go-template='{{index .data "secret-token" | base64decode}}'
kubectl create secret generic apm --from-literal=token=<password> -n badvla
```


## Research
`kubectl apply -f -n elastic https://raw.githubusercontent.com/elastic/cloud-on-k8s/1.7/config/recipes/beats/metricbeat_hosts.yaml`



