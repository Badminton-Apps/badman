# Tutorial
https://docs.microsoft.com/en-gb/azure/aks/ingress-static-ip

## Install ingress controller
`kubectl create namespace badvla`

`helm install nginx-ingress ingress-nginx/ingress-nginx \
    --namespace badvla \
    --set controller.replicaCount=2 \
    --set controller.nodeSelector."beta\.kubernetes\.io/os"=linux \
    --set defaultBackend.nodeSelector."beta\.kubernetes\.io/os"=linux \
    --set controller.service.loadBalancerIP="212.71.232.59"`

`kubectl patch svc ingress-nginx -p '{"spec": {"loadBalancerIP": "212.71.232.59"}}'`

## Install the CustomResourceDefinition resources separately
`kubectl apply --validate=false -f https://raw.githubusercontent.com/jetstack/cert-manager/release-0.13/deploy/manifests/00-crds.yaml`

## Label the cert-manager namespace to disable resource validation
`kubectl label namespace badvla cert-manager.io/disable-validation=true`

## Add the Jetstack Helm repository
`helm repo add jetstack https://charts.jetstack.io`

## Update your local Helm chart repository cache
`helm repo update`

## Install the cert-manager Helm chart
`helm install cert-manager --namespace badvla --version v0.13.1  jetstack/cert-manager`


## Create cluster-issuer
See documentation
## Apply
`kubectl apply -f cluster-issuer.yaml --namespace badvla`


## create ingress,yan
See documentation

## apply
`kubectl apply -f ranking-ingress.yaml --namespace badvla`


## Create certificates
https://gist.githubusercontent.com/PowerKiKi/02a90c765d7b79e7f64d/raw/353b5450944434baf2977d7ce3e1286f8494f22d/generate-wildcard-certificate.sh

`bash generate-wildcard-certificate.sh badvlasim.westeurope.cloudapp.azure.com`


`kubectl create secret tls tls-secret --key badvlasim.westeurope.cloudapp.azure.com.key --cert  badvlasim.westeurope.cloudapp.azure.com.crt`


## Certificat.yaml
See Documentation

## apply
`kubectl apply -f certificates.yaml --namespace badvla`



kubectl patch svc ingress-nginx --type='json' -p='[{"op": "replace", "path": "/spec/externalIPS", "value":["51.105.126.80"]}]'  --namespace=ingress-nginx