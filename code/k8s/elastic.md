# Installing Elastic
```
kubectl apply -f .\elastic.yaml
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
kubectl delete secret apm -n badvla
kubectl create secret generic apm -n badvla --from-literal=token=<password> 

kubectl create secret generic apm -n badvla --from-literal=token=<password> 
```


## Research
`kubectl apply -f -n elastic https://raw.githubusercontent.com/elastic/cloud-on-k8s/1.7/config/recipes/beats/metricbeat_hosts.yaml`



