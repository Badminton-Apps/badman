# Contract: `worker-twizzit-shadow` bootstrap

**Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

NestJS app at `apps/worker/twizzit-shadow`.

---

## Module imports

- `@badman/backend-config` (or existing worker config pattern)
- `@badman/backend-database` (`DatabaseModule`)
- `@badman/backend-twizzit-shadow` (`TwizzitShadowModule`)

**MUST NOT import**: `@badman/backend-twizzit` (legacy XML), `@badman/backend-graphql`, Bull queue modules.

---

## `TwizzitClient` wiring

```typescript
{
  provide: FEDERATION_GATEWAY,
  useFactory: (config: ConfigService, logger: Logger) =>
    new TwizzitClient({
      credentials: {
        username: config.getOrThrow("TWIZZIT_USERNAME"),
        password: config.getOrThrow("TWIZZIT_PASSWORD"),
      },
      baseUrl: config.get("TWIZZIT_API"),
      organizationId: config.get("TWIZZIT_ORGANIZATION_ID")
        ? Number(config.get("TWIZZIT_ORGANIZATION_ID"))
        : undefined,
      logger: nestLoggerAdapter(logger),
    }),
  inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
}
```

Token `FEDERATION_GATEWAY` is a string constant in `backend-twizzit-shadow` for test doubles.

---

## Boot sequence (`onApplicationBootstrap`)

```text
IF config.get("TWIZZIT_SHADOW_RUN_ON_BOOT") !== "1":
  → listen on WORKER_TWIZZIT_SHADOW_PORT (health only); idle

ELSE:
  → ingestService.runFullBackfill()
  → log SyncRunResult
  → process.exit(result.status === "completed" ? 0 : 1)
```

Health-only mode supports Render service definition with run-on-boot disabled until operator toggles env for backfill.

---

## Render service (operator contract)

| Setting | Value |
|---------|-------|
| Type | Background worker |
| Build | Same as other workers (`nx build worker-twizzit-shadow`) |
| Start command | `node dist/apps/worker/twizzit-shadow/main.js` |
| Env | `TWIZZIT_SHADOW_RUN_ON_BOOT=1` only when executing backfill |
| Scale | Manual — suspend service when idle |

Add `system.Service` row: `name = 'twizzit-shadow'`, `renderId = <Render service id>`.

**Not** wired to `OrchestratorSync` / Bull resume in v1.
