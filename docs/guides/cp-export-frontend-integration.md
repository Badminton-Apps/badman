# CP Export: Frontend Integration Guide

This guide walks through integrating the CP file export into the NextJS frontend.

## API Endpoints

### 1. Trigger Generation

```
POST /api/cp/generate
```

**Headers:**
- `Authorization: Bearer <JWT token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "eventId": "<uuid of the EventCompetition>"
}
```

**Success Response (200):**
```json
{
  "message": "CP generation started. You will receive an email when the file is ready for download.",
  "trackingId": "event-1-1712345678000"
}
```

**Error Responses:**

| Status | Meaning | When |
|--------|---------|------|
| 400 | Bad Request | `eventId` is missing |
| 401 | Unauthorized | No valid JWT token |
| 403 | Forbidden | User lacks `export-cp:competition` permission |
| 404 | Not Found | Event with given ID doesn't exist |
| 409 | Conflict | A generation is already in progress for this event |
| 413 | Payload Too Large | Competition data exceeds 65K character limit |
| 502 | Bad Gateway | GitHub Actions API failed |
| 503 | Service Unavailable | Backend not configured for CP export (missing env vars) |

### 2. Download File

```
GET /api/cp/download/:runId
```

**Headers:**
- `Authorization: Bearer <JWT token>`

**Success Response:** Binary file stream (`application/zip`) with `Content-Disposition: attachment` header.

**Error Responses:**

| Status | Meaning | When |
|--------|---------|------|
| 401 | Unauthorized | No valid JWT token |
| 403 | Forbidden | User lacks permission |
| 202 | Accepted | Generation still in progress |
| 404 | Not Found | Unknown runId |
| 410 | Gone | Generation failed, or artifact expired (>30 days) |
| 502 | Bad Gateway | GitHub API error |

---

## Tasks

### Permission Check
- [ ] Check if the user has the `export-cp:competition` permission before showing the export button
- [ ] Use the existing permission check pattern from your auth context/hook

### UI Components
- [ ] Add an "Export CP" button on the competition detail page (only visible to users with the right permission)
- [ ] On click, call `POST /api/cp/generate` with the `eventId`
- [ ] Show a success toast/message: "CP file generation started. You'll receive an email when it's ready."
- [ ] Handle error responses with appropriate user-friendly messages:
  - 409: "A generation is already in progress. Please wait."
  - 413: "Competition is too large for export. Contact support."
  - 503: "CP export is not configured. Contact an administrator."

### Download Page/Route
- [ ] Create a route like `/cp/download/:runId` that the email download link points to
- [ ] On this page, call `GET /api/cp/download/:runId`
- [ ] Trigger a browser download of the returned zip file
- [ ] Handle 202 (still processing): show a "still generating, please wait" message
- [ ] Handle 410 (expired/failed): show "file expired or generation failed" message

### Error Handling
- [ ] Wrap API calls in try/catch with proper error extraction
- [ ] Map HTTP status codes to user-friendly messages (see tables above)
- [ ] Consider adding a retry button for transient failures (502)

---

## Environment Variables

The frontend only needs the API base URL -- no secrets:

| Variable | Value | Notes |
|----------|-------|-------|
| `API_BASE_URL` | `https://api.badman.app` (prod) | Already configured |

---

## User Flow

```
1. User navigates to competition detail page
2. User sees "Export CP" button (only if they have permission)
3. User clicks button
4. Frontend calls POST /api/cp/generate
5. User sees "Generation started" message
6. User receives email with download link (2-5 minutes later)
7. User clicks download link → opens /cp/download/:runId
8. Frontend calls GET /api/cp/download/:runId
9. Browser downloads the .cp zip file
10. User extracts .cp file and opens in Competition Planner
```

---

## Pitfalls

- **Don't poll for status.** The flow is email-based. There is no polling endpoint.
- **Download link expires after 30 days.** The `.cp` file artifact is kept for 30 days on GitHub. After that, the user needs to regenerate.
- **Only one generation per event at a time.** If the user (or anyone else) already triggered a generation, subsequent attempts get a 409 until it completes or times out (15 min).
- **The download returns a zip file**, not a `.cp` file directly. GitHub Actions artifacts are always zipped. The zip contains the `.cp` file.
- **Base URL differs between staging and production.** Make sure the `API_BASE_URL` is environment-specific.
