# Tutorial

https://www.linode.com/docs/guides/how-to-configure-load-balancing-with-tls-encryption-on-a-kubernetes-cluster/#create-an-example-application

https://docs.microsoft.com/en-gb/azure/aks/ingress-static-ip



## Database
We run HA in a PG pool, this is allows us to scale up if needed.
For this we need some secrets to upgrade / change when needed.


Default we run on a 3 node cluster

### Create secrest

`kubectl create secret generic server-postgresql-ha-postgresql --from-literal=postgresql-badvla-password=<password> --from-literal=repmgr-password=badvla-repmgr-password=<password> --namespace badvla`

`kubectl create secret generic server-postgresql-ha-pgpool --from-literal=admin-password=<password> --namespace badvla`

### create DB

`helm install postgresql --namespace badvla bitnami/postgresql-ha --version=8.3.1 --set postgresql.existingSecret=server-postgresql-ha-postgresql --set pgpool.existingSecret=server-postgresql-ha-pgpool --set postgresql.replicaCount=3`

upgrade replica count:
`helm upgrade --install postgresql --namespace badvla bitnami/postgresql-ha --version=8.3.1 --set postgresql.existingSecret=server-postgresql-ha-postgresql --set pgpool.existingSecret=server-postgresql-ha-pgpool --set postgresql.replicaCount=3`


# Allow locally connect to postgresql

If you need to connect to your k8s postgresql DB server, without allowing it publicly.
You can temporary open the port to your local machine via:
`kubectl port-forward --namespace badvla svc/postgresql-postgresql-ha-pgpool <internal>:5432`

Now your PROD db is running on `127.0.0.1:<internal>`

# tutorial attempt 2

```
helm install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.2.0 \
  --create-namespace \
  --set installCRDs=true
```
