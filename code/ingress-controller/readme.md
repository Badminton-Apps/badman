# Tutorial
https://www.linode.com/docs/guides/how-to-configure-load-balancing-with-tls-encryption-on-a-kubernetes-cluster/#create-an-example-application

https://docs.microsoft.com/en-gb/azure/aks/ingress-static-ip

## Create certificates
https://gist.githubusercontent.com/PowerKiKi/02a90c765d7b79e7f64d/raw/353b5450944434baf2977d7ce3e1286f8494f22d/generate-wildcard-certificate.sh

`bash generate-wildcard-certificate.sh beta.latomme.org`


`kubectl create secret tls tls-secret --key beta.latomme.org.key --cert  beta.latomme.org.crt`

## apply
`kubectl apply -f certificates.yaml --namespace badvla`

