# backend-cache

This library was generated with [Nx](https://nx.dev).

Nest cache-manager module. When `DB_CACHE=true`, uses Redis; otherwise uses in-memory store.

## Production

For production, set `DB_CACHE=true` and ensure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` are set. This moves Nest cache-manager storage off the Node heap and into Redis, reducing memory pressure.

## Building

Run `nx build backend-cache` to build the library.

## Running unit tests

Run `nx test backend-cache` to execute the unit tests via [Jest](https://jestjs.io).
