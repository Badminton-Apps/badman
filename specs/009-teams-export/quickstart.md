# Quickstart: Teams Export Endpoint

**Feature**: [spec.md](spec.md)
**Date**: 2026-05-06

Replace `{TOKEN}`, `{VALID_EVENT_ID}`, and `{UNKNOWN_UUID}` with real values.

---

## Happy Path — XLSX download

```bash
curl -s -o teams.xlsx \
  -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:5010/api/export/teams?eventId={VALID_EVENT_ID}&format=xlsx"
# Expected: HTTP 200
```

Verify the file:
```bash
file teams.xlsx
# → Microsoft Excel Open XML Format Spreadsheet (xlsx)
```

---

## Happy Path — CSV download

```bash
curl -s -o teams.csv \
  -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:5010/api/export/teams?eventId={VALID_EVENT_ID}&format=csv"
# Expected: HTTP 200
```

Verify the file:
```bash
head -1 teams.csv
# → Club ID,Clubnaam,Ploegnaam,Voorkeur speelmoment (dag),Voorkeur speelmoment (tijdstip)
```

Check day name formatting:
```bash
grep -i "maandag\|dinsdag\|woensdag" teams.csv
# Should find Dutch day names, NOT raw "monday"/"tuesday" etc.
```

Check time formatting:
```bash
# Times should appear as HH:mm (e.g. "09:00"), not "09:00:00"
grep -E "[0-9]{2}:[0-9]{2}:[0-9]{2}" teams.csv
# Should return nothing — seconds must be stripped
```

---

## Default format (no format param → XLSX)

```bash
curl -sI \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:5010/api/export/teams?eventId={VALID_EVENT_ID}" \
  | grep -i content-type
# Expected: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

---

## Security

### 401 — No token
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:5010/api/export/teams?eventId={VALID_EVENT_ID}"
# Expected: 401
```

### 403 — Token without `edit:competition`
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer {LIMITED_TOKEN}" \
  "http://localhost:5010/api/export/teams?eventId={VALID_EVENT_ID}"
# Expected: 403
```

---

## Validation

### 400 — Missing eventId
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:5010/api/export/teams"
# Expected: 400
```

### 400 — Non-UUID eventId
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:5010/api/export/teams?eventId=not-a-uuid"
# Expected: 400
```

### 400 — Unknown format
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:5010/api/export/teams?eventId={VALID_EVENT_ID}&format=pdf"
# Expected: 400
```

### 404 — Valid UUID, no competition
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:5010/api/export/teams?eventId={UNKNOWN_UUID}"
# Expected: 404
```

---

## Response Headers

```bash
curl -sI \
  -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:5010/api/export/teams?eventId={VALID_EVENT_ID}&format=xlsx" \
  | grep -i "content-"
# Expected:
# content-type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
# content-disposition: attachment; filename=<competition-name>.xlsx
```
