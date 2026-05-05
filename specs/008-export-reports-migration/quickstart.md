# Quickstart: Verifying Export Foundation

## Prerequisites

- API running locally: `nx run-many --target=serve --projects=api,worker-sync --parallel`
- Docker services up: `npm run docker:up`
- A test competition ID available (get one from pgAdmin or `npm run seed:test-data`)
- A test user with `edit:competition` permission (and one without, for negative tests)

---

## 1. Verify security hardening

### Expect 401 (no auth)
```bash
curl -i "http://localhost:5010/excel/enrollment?eventId=<valid-uuid>"
# → HTTP/1.1 401 Unauthorized
```

### Expect 403 (authenticated, wrong permission)
```bash
TOKEN=$(# obtain JWT for user WITHOUT edit:competition)
curl -i -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5010/excel/enrollment?eventId=<valid-uuid>"
# → HTTP/1.1 403 Forbidden
```

### Expect 200 (authenticated, correct permission)
```bash
TOKEN=$(# obtain JWT for user WITH edit:competition)
curl -i -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5010/excel/enrollment?eventId=<valid-uuid>" \
  --output enrollment.xlsx
# → HTTP/1.1 200 OK
# → Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
# → enrollment.xlsx downloaded
```

---

## 2. Verify input validation

```bash
TOKEN=$(# JWT with edit:competition)

# Missing eventId → 400
curl -i -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5010/excel/enrollment"

# Non-UUID eventId → 400
curl -i -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5010/excel/enrollment?eventId=not-a-uuid"

# Valid UUID, no matching competition → 404
curl -i -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5010/excel/enrollment?eventId=00000000-0000-0000-0000-000000000000"
```

---

## 3. Verify enrollment XLSX regression (refactor parity)

Before and after the shared-utility refactor, open the downloaded XLSX in a
spreadsheet tool and confirm:

- Sheet name is `Enrollment`
- 12 columns in the exact order listed in `data-model.md`
- Same row count for the same competition
- Header row has an active autofilter dropdown
- Column widths are auto-sized (no truncated content)

---

## 4. Verify shared utility unit tests pass

```bash
npx jest --config libs/backend/utils/jest.config.ts
# All tests should pass, including the new export.util tests
```

---

## 5. Verify no regression on existing behavior

```bash
nx test backend-enrollment
# All pre-existing tests should still pass
```
