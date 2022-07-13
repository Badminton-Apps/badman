

## Database
We run HA in a PG pool, this is allows us to scale up if needed.
For this we need some secrets to upgrade / change when needed.


### Add repo
`helm repo add bitnami https://charts.bitnami.com/bitnami`
`helm repo update`

Default we run on a 3 node cluster

### Create secrest

`kubectl create secret generic server-postgresql-ha-postgresql --from-literal=postgresql-password="<super-pass>" --from-literal=repmgr-password=badvla-repmgr-password="<super-pass>" --namespace badman`

`kubectl create secret generic server-postgresql-ha-pgpool --from-literal=admin-password="<super-pass>" --namespace badman`

### create DB

`helm install postgresql --namespace badman bitnami/postgresql-ha --version=8.3.1 -f psql.yaml`

upgrade replica count:
`helm upgrade --install postgresql --namespace badman bitnami/postgresql-ha --version=8.3.1 -f psql.yaml`


`helm upgrade --install postgresql --namespace badman bitnami/postgresql-ha --version=8.3.1 --set postgresql.existingSecret=server-postgresql-ha-postgresql --set pgpool.existingSecret=server-postgresql-ha-pgpool --set postgresql.replicaCount=3`
