# Quickstart: Twizzit Duplicate Detection

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-05-15

## Prerequisites

1. Spec 016 (`016-twizzit-shadow-sync`) must have been run and `twizzit.shadow_contact` must be populated.
2. Node.js 20+ and the repo's existing `pg` + `dotenv` packages available.

## Usage

```bash
# Dry-run against local DB (default)
node scripts/detect-duplicate-players.js --dry-run

# Run against staging
node scripts/detect-duplicate-players.js --env staging

# Run against production (staging must be validated first)
node scripts/detect-duplicate-players.js --env prod
```

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--env <staging\|prod>` | local (`.env`) | Target database environment |
| `--dry-run` | false | No-op for this script (read-only); CSV is still written |

## Output

The script writes `scripts/duplicate-report-<env>-<YYYY-MM-DD>.csv` and prints a summary:

```
=== detect-duplicate-players ===
  env:     staging
  dry-run: false
  DB:      <host>/<db>

Connected to database.
Shadow contacts: 162,450

── Pass 1: memberId matches ──────────────
  Found 3 duplicate groups (8 affected players)

── Pass 2: natural-key matches (fallback) ─
  Found 1 duplicate group (2 affected players)
  Players flagged with missing memberId: 1

── Summary ──────────────────────────────
  Total duplicate groups: 4
  Total affected players: 10
  Players missing memberId (suggested): 1
  CSV written to: scripts/duplicate-report-staging-2026-05-15.csv

Done.
```

## CSV columns

| Column | Description |
|--------|-------------|
| `groupId` | `MB-N` (memberId match) or `NK-N` (natural-key match) |
| `matchReason` | `member-id-match` or `natural-key-match` |
| `twizzitId` | Twizzit contact ID that confirmed the duplicate |
| `memberId` | The Badman Player's current memberId |
| `badmanPlayerId` | UUID of the Badman Player row |
| `firstName` | Player first name |
| `lastName` | Player last name |
| `dateOfBirth` | ISO date or empty |
| `gender` | M / F or empty |
| `email` | Player email |
| `missingMemberId` | `true` when Player has no memberId but Twizzit does |
| `suggestedMemberId` | The Twizzit memberId to assign (populated when `missingMemberId = true`) |

## Workflow

1. Run against **staging** first — validate counts look reasonable
2. Review the CSV — identify which Player pairs/groups are genuine duplicates
3. Manually merge or deactivate duplicate Badman Players (out of scope for this script)
4. Optionally update `memberId` on Players flagged with `missingMemberId = true`
5. Run against **production** once staging is validated
