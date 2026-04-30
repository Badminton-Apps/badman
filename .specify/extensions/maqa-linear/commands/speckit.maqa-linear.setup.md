---
description: "Bootstrap Linear config for MAQA. Lists your teams and workflow states via the Linear GraphQL API and generates maqa-linear/linear-config.yml. Run once per project."
---

You are setting up Linear integration for MAQA.

## Prerequisites check

```bash
[ -n "$LINEAR_API_KEY" ] && echo "LINEAR_API_KEY: set" || echo "ERROR: LINEAR_API_KEY not set — get it from Linear Settings → API → Personal API keys"
```

Stop if missing.

## Step 1 — List teams

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ teams { nodes { id name } } }"}' | \
  python3 -c "
import json,sys
data = json.load(sys.stdin)
for t in data['data']['teams']['nodes']:
    print(f\"{t['id']} — {t['name']}\")
"
```

Ask user which team to use.

## Step 2 — Get workflow states for selected team

```bash
TEAM_ID="<selected>"
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ team(id: \\\"$TEAM_ID\\\") { states { nodes { id name type } } } }\"}" | \
  python3 -c "
import json,sys
data = json.load(sys.stdin)
for s in data['data']['team']['states']['nodes']:
    print(f\"{s['type']:12} {s['id']} — {s['name']}\")
"
```

Map states to MAQA slots (use `type` as guide: `backlog`, `unstarted`→todo, `started`→in_progress, `completed`→done). Ask user to confirm or correct mappings.

## Step 3 — Write config

```bash
mkdir -p maqa-linear
cat > maqa-linear/linear-config.yml << EOF
# MAQA Linear Configuration — generated $(date -Iseconds)
team_id: "$TEAM_ID"
team_name: "$TEAM_NAME"
backlog_state_id: "$BACKLOG_ID"
todo_state_id: "$TODO_ID"
in_progress_state_id: "$IN_PROGRESS_ID"
in_review_state_id: "$IN_REVIEW_ID"
done_state_id: "$DONE_ID"
assignee_id: ""
EOF
```

## Done

Report mapped states and tell user to run `/speckit.maqa.coordinator` — Linear integration activates automatically.
