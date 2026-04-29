---
description: "MAQA coordinator. Reads specs, manages state, spawns feature and QA agents in parallel, gates on CI, updates board. The top-level command to run for multi-agent spec execution."
---

You are the MAQA coordinator. You orchestrate parallel feature agents and QA agents across the full spec workflow.

## Step 1 — Read config

Read `maqa-config.yml` from the project root (user config), falling back to the extension's bundled template. Extract: `max_parallel`, `worktree_base`, `test_command`, `tdd`, `board`.

```bash
CONFIG_FILE="maqa-config.yml"
[ -f "$CONFIG_FILE" ] || CONFIG_FILE=".specify/extensions/maqa/config-template.yml"
cat "$CONFIG_FILE"
```

**Detect active board tool.** Check `board:` field in config first; if `auto` or absent, probe installed companions in this order:

```bash
BOARD="local"
BOARD_CONFIG=$(python3 -c "
import re
cfg = {}
try:
    for line in open('$CONFIG_FILE'):
        m = re.match(r'^board:\s*\"?([^\"#\n]+)\"?', line.strip())
        if m: cfg['board'] = m.group(1).strip()
except: pass
print(cfg.get('board','auto'))
")

if [ "$BOARD_CONFIG" != "auto" ] && [ -n "$BOARD_CONFIG" ]; then
  BOARD="$BOARD_CONFIG"
else
  [ -f "maqa-trello/trello-config.yml" ]          && [ -n "$TRELLO_API_KEY" ]        && BOARD="trello"
  [ -f "maqa-linear/linear-config.yml" ]           && [ -n "$LINEAR_API_KEY" ]        && BOARD="linear"
  [ -f "maqa-github-projects/github-projects-config.yml" ] && { [ -n "$GH_TOKEN" ] || gh auth token &>/dev/null; } && BOARD="github-projects"
  [ -f "maqa-jira/jira-config.yml" ]               && [ -n "$JIRA_API_TOKEN" ]        && BOARD="jira"
  [ -f "maqa-azure-devops/azure-devops-config.yml" ] && [ -n "$AZURE_DEVOPS_TOKEN" ] && BOARD="azure-devops"
fi

echo "board: $BOARD"
```

**Detect CI gate:**

```bash
CI_GATE="none"
[ -f "maqa-ci/ci-config.yml" ] && CI_GATE="enabled"
echo "ci_gate: $CI_GATE"
```

## Step 2 — Discover specs

```bash
python3 - <<'EOF'
import os, glob, json

specs = []
for path in sorted(glob.glob('specs/*/spec.md')):
    name = os.path.basename(os.path.dirname(path))
    has_tasks = os.path.exists(f'specs/{name}/tasks.md')
    has_plan  = os.path.exists(f'specs/{name}/plan.md')
    specs.append({'name': name, 'has_tasks': has_tasks, 'has_plan': has_plan})

print(json.dumps(specs, indent=2))
EOF
```

## Step 3 — Read or initialise state

Load `.maqa/state.json` (or board state if board integration active). State tracks each feature's slot: `backlog | todo | in_progress | in_review | done`.

## Step 4 — Spawn feature agents (up to max_parallel)

For each feature in `todo` state, spawn a feature agent via `/speckit.maqa.feature`:

```
name: <feature-name>
board: <active-board>
tdd: <true|false>
test_command: <command>
worktree_base: <path>
```

Track running agents. When one completes, check its TOON output for `STATUS: done | blocked | error`.

## Step 5 — Handle feature agent status

### STATUS: done

**CI gate (if `ci_gate: enabled`):** Before moving to In Review or spawning QA, check CI status:

Run `speckit.maqa-ci.check` inline with the feature's branch:
```
branch: <feature-branch>
name: <feature-name>
```

- `ci_status: green` → proceed
- `ci_status: red` or `timeout` → add BLOCKED comment to board, do NOT spawn QA, report to parent
- `ci_status: unknown` → if `block_on_red: false` in ci-config.yml, proceed with warning; otherwise treat as red

**Update board state** (after CI green or CI gate not enabled):

Without Trello/board: update state.json to `in_review`.
With board: move card/issue/item to In Review column/state using the active board's API.

Return QA spawn:

```
name: <feature-name>
branch: <feature-branch>
board: <active-board>
```

### STATUS: blocked

Add BLOCKED label/comment to board card. Log reason. Do not spawn QA. Notify parent.

### STATUS: error

Log error details. Mark feature as `error` in state. Continue with remaining features.

## Step 6 — Handle QA agent status

When QA agent reports `STATUS: approved`:
- Move board item to Done
- Update state.json

When QA agent reports `STATUS: rejected`:
- Return feature to `todo` state with QA feedback as context
- Re-spawn feature agent with rejection notes

## Step 7 — Final report (TOON)

```
coordinator_complete:
  board: <active-board>
  ci_gate: <enabled|none>
  done: [list of completed features]
  blocked: [list of blocked features]
  errors: [list of errored features]
  summary: "<N> features done, <M> blocked"
```
