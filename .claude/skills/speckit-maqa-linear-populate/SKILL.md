---
name: speckit-maqa-linear-populate
description: Populate Linear team from specs/*/tasks.md. Creates one issue per feature
  with a markdown task list in the description. Skips features already in the team.
  Safe to re-run.
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: maqa-linear:commands/speckit.maqa-linear.populate.md
---

You are populating a Linear team from spec-kit specs. Safe to re-run — existing issues are never duplicated.

## Step 1 — Read config

```bash
source <(python3 -c "
import re
with open('maqa-linear/linear-config.yml') as f:
    for line in f:
        m = re.match(r'^(\w+):\s*\"?([^\"#\n]+)\"?', line.strip())
        if m and m.group(2).strip():
            print(f'{m.group(1).upper()}={m.group(2).strip()}')
")
```

## Step 2 — Get existing issue titles from team

```bash
EXISTING=$(curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ team(id: \\\"$TEAM_ID\\\") { issues { nodes { title } } } }\"}" | \
  python3 -c "
import json,sys
data = json.load(sys.stdin)
for i in data['data']['team']['issues']['nodes']:
    print(i['title'].lower().strip())
")
```

## Step 3 — Discover local specs

```bash
python3 - <<'EOF'
import os, glob
for path in sorted(glob.glob('specs/*/tasks.md')):
    name = os.path.basename(os.path.dirname(path))
    has_plan = os.path.exists(f'specs/{name}/plan.md')
    print(f"{name}|{path}|{'ready' if has_plan else 'no-plan'}")
EOF
```

Skip specs with `no-plan` status.

## Step 4 — For each ready spec not already in Linear

### Parse tasks from tasks.md

```bash
python3 - <<'EOF'
import re
content = open("specs/$SPEC_NAME/tasks.md").read()
title_match = re.search(r'^#\s+(.+)$', content, re.M)
title = title_match.group(1).strip() if title_match else "$SPEC_NAME"
tasks = []
for line in content.split('\n'):
    m = re.match(r'^\s*-\s*\[[ x]\]\s*(.+)', line) or re.match(r'^\s*(?:\*\*)?\d+\.(?:\*\*)?\s+(.+)', line)
    if m:
        text = re.sub(r'\*\*', '', m.group(1)).strip()
        if len(text) > 5:
            tasks.append(text)
print("TITLE=" + title)
for t in tasks[:20]:
    print("TASK=" + t)
EOF
```

### Build description with markdown task list

```
## Tasks

- [ ] Task one
- [ ] Task two
...

Deps: <from spec.md or "none">
```

### Create the issue in Todo state

```bash
DESCRIPTION="<built above>"
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"mutation\":\"mutation { issueCreate(input: { teamId: \\\"$TEAM_ID\\\", title: \\\"$TITLE\\\", description: \\\"$DESCRIPTION\\\", stateId: \\\"$TODO_STATE_ID\\\" }) { issue { id identifier } } }\"}" | \
  python3 -c "import json,sys; i=json.load(sys.stdin)['data']['issueCreate']['issue']; print(i['identifier'], i['id'])"
```

## Step 5 — Report

```
populated[N]{name,issue_id,tasks}:
  ...
skipped[M]{name,reason}:
  ...
```