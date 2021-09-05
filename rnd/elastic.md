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
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
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
EOF
```

## Beats
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

`kubectl apply -f -n elastic https://raw.githubusercontent.com/elastic/cloud-on-k8s/1.7/config/recipes/beats/metricbeat_hosts.yaml`



```
kubectl get secret -n elastic elastic-search-es-elastic-user -o=jsonpath='{.data.elastic}' | base64 --decode; echo
```