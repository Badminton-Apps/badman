# Tutorial
https://www.linode.com/docs/guides/how-to-configure-load-balancing-with-tls-encryption-on-a-kubernetes-cluster/#create-an-example-application

https://docs.microsoft.com/en-gb/azure/aks/ingress-static-ip


# Secret
`kubectl create secret generic server-postgresql --from-literal=postgresql-password=<password>`

# Allow locally connect to postgresql
If you need to connect to your k8s postgresql DB server, without allowing it publicly.
You can temporary open the port to your local machine via:
`kubectl port-forward server-postgresql-0 5600:5432`

Now your PROD db is running on `127.0.0.1:5600`

# tutorial attempt 2
```
helm install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.2.0 \
  --create-namespace \
  --set installCRDs=true
  ```

