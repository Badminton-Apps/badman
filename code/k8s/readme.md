

# Databases

## prereq
### Add repo
`helm repo add bitnami https://charts.bitnami.com/bitnami`

### Update
`helm repo update`

## Postgres
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

upgrade replica count (in psql.yaml) and appy:
`helm upgrade --install postgresql --namespace badman bitnami/postgresql-ha --version=8.3.1 -f psql.yaml`


## reddis

### create secret
`kubectl create secret generic server-redis --from-literal=redis-password="<super-pass>" --namespace badman`

### create DB

`helm install redis --namespace badman bitnami/redis-cluster -f redis.yaml`

upgrade replica count (in redis.yaml) and appy:
`helm upgrade --install redis --namespace badman bitnami/redis-cluster -f redis.yaml`