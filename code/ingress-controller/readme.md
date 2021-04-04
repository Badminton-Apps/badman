# Tutorial
https://www.linode.com/docs/guides/how-to-configure-load-balancing-with-tls-encryption-on-a-kubernetes-cluster/#create-an-example-application

https://docs.microsoft.com/en-gb/azure/aks/ingress-static-ip


# Secret
`kubectl create secret generic server-postgresql --from-literal=postgresql-password=<password>`


# tutorial attempt 2
```
helm install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.2.0 \
  --create-namespace \
  --set installCRDs=true
  ```