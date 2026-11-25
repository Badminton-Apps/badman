# backend-cache

Internal package in the [Badman](../../README.md) Turborepo monorepo. Import as `@badman/backend-cache`.

Nest cache-manager module. When `DB_CACHE=true`, uses Redis; otherwise uses in-memory store.

## Production

For production, set `DB_CACHE=true` and ensure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` are set. This moves Nest cache-manager storage off the Node heap and into Redis, reducing memory pressure.

## Building

```bash
pnpm turbo run build --filter=@badman/backend-cache
```

## Running unit tests

Unit tests run on [Jest](https://jestjs.io):

```bash
pnpm turbo run test --filter=@badman/backend-cache
```
