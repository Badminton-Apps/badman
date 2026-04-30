# MAQA Linear Integration

> Linear board integration for the [MAQA](https://github.com/GenieRobot/spec-kit-maqa-ext) spec-kit extension.

Replaces local `.maqa/state.json` tracking with a Linear board. Issues move through your workflow states as features progress.

## Requirements

- [maqa](https://github.com/GenieRobot/spec-kit-maqa-ext) extension installed
- Linear API key: Settings → API → Personal API keys → set as `LINEAR_API_KEY`

## Installation

```bash
specify ext add maqa
specify ext add maqa-linear
```

## Setup

```bash
/speckit.maqa-linear.setup
```

Lists your Linear teams, maps workflow states (Backlog / Todo / In Progress / In Review / Done), writes `maqa-linear/linear-config.yml`. The coordinator auto-activates when the config and `LINEAR_API_KEY` are present.

## Board structure

| Linear state | MAQA slot |
|---|---|
| Backlog | backlog |
| Todo | todo |
| In Progress | in_progress |
| In Review | in_review |
| Done | done |

## Notes

Linear does not have Trello-style checklists. Tasks are written as a markdown checklist in the issue description. The feature agent updates the description to tick items as they complete.

## License

MIT
