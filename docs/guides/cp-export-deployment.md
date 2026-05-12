# CP Export: Deployment Guide

Step-by-step guide for deploying the CP file export feature end-to-end.

---

## 1. GitHub Setup

### Create a Personal Access Token (PAT)
- [ ] Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
- [ ] Click "Generate new token"
- [ ] **Name:** `badman-cp-export`
- [ ] **Expiration:** Set to 1 year (add a calendar reminder to rotate!)
- [ ] **Repository access:** Select "Only select repositories" → choose `Badminton-Apps/badman`
- [ ] **Permissions:**
  - Actions: Read and write (triggers workflows, fetches artifacts)
- [ ] Copy the token value -- you'll need it for Render

### Add Repository Secrets
- [ ] Go to the repo → Settings → Secrets and variables → Actions
- [ ] Add secret: `CP_PASS` = the Access database password (ask the team / check existing env config for the value)
- [ ] Add secret: `CP_WEBHOOK_SECRET` = generate a random string (e.g., `openssl rand -hex 32`)

### Verify Workflow
- [ ] Push the `feat/cp-export-cross-platform` branch to the repo
- [ ] Go to Actions tab → confirm "Generate CP File" workflow appears in the left sidebar
- [ ] Click on it → verify it shows `workflow_dispatch` trigger with the 3 inputs

---

## 2. Render Backend Setup

### Add Environment Variables
- [ ] Go to Render dashboard → your API service → Environment
- [ ] Add the following environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `GITHUB_TOKEN_CP` | The PAT created above | Fine-grained token with actions:read+write |
| `CP_WEBHOOK_SECRET` | Same value as the GitHub repo secret | Must match exactly! |
| `CP_CALLBACK_URL` | `https://<your-api-domain>/api/cp/webhook` | Must be publicly accessible |
| `GITHUB_REPO_OWNER` | `Badminton-Apps` | Optional -- defaults to this value |
| `GITHUB_REPO_NAME` | `badman` | Optional -- defaults to this value |

### Verify Callback URL
- [ ] Ensure `CP_CALLBACK_URL` is reachable from the public internet (not behind VPN/firewall)
- [ ] Test with: `curl -s -o /dev/null -w "%{http_code}" https://<your-api-domain>/api/cp/webhook` (should return 401, not timeout or 404)

---

## 3. Email Setup

- [ ] Verify `MAIL_ENABLED` is `true` on Render env vars
- [ ] Verify `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS` are configured
- [ ] **Note:** The current implementation logs email content but doesn't use the `MailingService` template system yet. To fully enable email:
  - [ ] Create a Pug template for CP notifications (e.g., `cpExportReady.pug`)
  - [ ] Add a `sendCpExportReadyMail` method to `MailingService`
  - [ ] Update `CpController._sendCompletionEmail` to use the MailingService instead of logging

---

## 4. Test Run

### Manual Test via GitHub UI
- [ ] Go to Actions → "Generate CP File" → "Run workflow"
- [ ] For `payload`, paste a base64-encoded test payload:
  ```bash
  echo '{"event":{"name":"Test","season":2025},"subEvents":[],"clubs":[],"locations":[],"teams":[],"players":[],"teamPlayers":[],"entries":[],"memos":[],"settings":{"tournamentName":"Test"}}' | base64
  ```
- [ ] For `callback_url`, use your staging API URL + `/api/cp/webhook`
- [ ] For `requesting_user_id`, use your own player ID from the database
- [ ] Click "Run workflow"
- [ ] Verify:
  - [ ] Workflow completes successfully (green check)
  - [ ] Artifact "cp-file" appears in the run's artifacts section
  - [ ] Backend logs show webhook received

### End-to-End Test via API
- [ ] Use curl or Postman to call the generate endpoint:
  ```bash
  curl -X POST https://<api-domain>/api/cp/generate \
    -H "Authorization: Bearer <your-jwt>" \
    -H "Content-Type: application/json" \
    -d '{"eventId": "<real-event-id>"}'
  ```
- [ ] Verify:
  - [ ] Response: `{ "message": "CP generation started...", "trackingId": "..." }`
  - [ ] GitHub Actions workflow starts
  - [ ] Webhook callback reaches the backend
  - [ ] Email/log notification is sent
  - [ ] Download endpoint returns the zip file

### Security Tests
- [ ] Test unauthenticated request → 401:
  ```bash
  curl -X POST https://<api-domain>/api/cp/generate \
    -H "Content-Type: application/json" \
    -d '{"eventId": "test"}'
  ```
- [ ] Test user without permission → 403 (use a regular user JWT, not admin)
- [ ] Test duplicate generation → 409 (call generate twice quickly)

### CP File Validation
- [ ] Download the artifact zip from GitHub Actions
- [ ] Extract the `.cp` file
- [ ] Open it in Competition Planner
- [ ] Verify: events, teams, players, clubs, locations are all present and correct

---

## 5. Production Deployment

- [ ] Merge the `feat/cp-export-cross-platform` branch to `develop`
- [ ] Deploy to staging and run the end-to-end test above
- [ ] If staging passes, merge to `main` via the normal release process
- [ ] After production deploy:
  - [ ] Run one final end-to-end test with a real competition event
  - [ ] Confirm the old `GET /cp` endpoint still works (deprecated but available)

---

## Pitfalls & Troubleshooting

### PAT Expiration
The GitHub PAT expires after the duration you set. When it expires:
- CP generation will fail with a 502 error
- **Fix:** Create a new PAT and update `GITHUB_TOKEN_CP` on Render
- **Prevention:** Set a calendar reminder for 2 weeks before expiry

### Webhook Secret Mismatch
If `CP_WEBHOOK_SECRET` doesn't match between GitHub secrets and Render env vars:
- The webhook callback will be rejected (401)
- The generation will complete but the user won't get an email
- The download endpoint won't have a record for the run_id
- **Fix:** Ensure both values are identical

### Callback URL Not Reachable
If the Render API is behind a VPN or the URL is wrong:
- GitHub Actions will complete but the curl callback will fail
- The user won't get an email
- **Fix:** Ensure the URL is publicly accessible

### Private Repo Artifact Downloads
If the repo is private:
- The PAT must have `actions:read` permission to download artifacts
- This is already included in the recommended permissions above

### Windows Runner Changes
Microsoft occasionally updates the `windows-latest` runner image. If a runner update removes Jet OLEDB:
- The file writer will fail with an ADODB error
- **Fix:** Pin the runner to a specific version: `runs-on: windows-2022`
- **Monitor:** Check the [GitHub Actions runner images changelog](https://github.com/actions/runner-images)

### The `empty.cp` Template
The template file at `libs/backend/generator/assets/empty.cp` must be present in the repo:
- The GitHub Actions checkout includes it automatically
- If it's gitignored or deleted, generation will fail
- **Verify:** `git ls-files libs/backend/generator/assets/empty.cp` should return the path

### In-Memory Generation Records
Generation records are stored in-memory on the backend. If the backend restarts between triggering and the webhook callback:
- The webhook will still succeed (it creates a new record)
- But the `pendingByEvent` guard will be lost (allowing duplicate triggers)
- This is acceptable for a once-a-year operation
