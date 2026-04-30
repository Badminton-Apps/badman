# MAQA — Multi-Agent & Quality Assurance

> A [spec-kit](https://github.com/github/spec-kit) extension that adds a **coordinator → feature → QA** multi-agent workflow to any spec-kit project. Works with any language or framework.

## How it works

```
/speckit.maqa.coordinator   →   SPAWN[N] feature agents in parallel worktrees
                            →   SPAWN_QA[N] QA agent per completed feature
                            →   coordinator merged #N   →   re-assess, next batch
```

Each feature runs in an **isolated git worktree**. The QA agent runs static analysis after each feature completes. You review and merge. The coordinator re-assesses and picks the next unblocked batch automatically.

State is tracked locally in `.maqa/state.json`. With the optional [maqa-trello](https://github.com/GenieRobot/spec-kit-maqa-trello) companion, state lives on a Trello board instead.

## Requirements

- [spec-kit](https://github.com/github/spec-kit) `>=0.3.0`
- `git` with worktree support
- `python3` (for JSON parsing in coordinator scripts)

## Installation

```bash
specify ext add maqa
```

> Not in the catalog yet? Install directly:
> ```bash
> specify ext add https://github.com/GenieRobot/spec-kit-maqa-ext/archive/refs/tags/maqa-v0.1.0.zip
> ```

## Quick start

```bash
# 1. Install
specify ext add maqa

# 2. (Claude Code only) Deploy native subagents — run once per project
/speckit.maqa.setup

# 3. Configure your test runner (optional but recommended)
#    Edit maqa-config.yml in your project root

# 4. Run the coordinator
/speckit.maqa.coordinator
```

The coordinator reads your `specs/` directory (spec-kit's standard structure), finds features that are ready to implement, creates worktrees, and returns a SPAWN plan. On Claude Code, feature and QA agents run in parallel as true subagents. On all other tools, the workflow runs in-context.

## Trello integration (optional)

```bash
specify ext add maqa-trello
/speckit.maqa-trello.setup
```

The coordinator auto-detects Trello config and enables board integration. See [maqa-trello](https://github.com/GenieRobot/spec-kit-maqa-trello) for details.

## Configuration

`maqa-config.yml` is created in your project root by `/speckit.maqa.setup` (or copied manually from `.specify/extensions/maqa/config-template.yml`).

| Field | Default | Description |
|---|---|---|
| `test_command` | `""` | Full test suite — e.g. `npm test`, `pytest`, `bundle exec rspec` |
| `test_file_command` | `""` | Single file — e.g. `pytest {file}`, `npm test -- {file}` |
| `tdd` | `false` | Write tests first, then implement. Red is assumed (no pre-run). |
| `max_parallel` | `3` | Max concurrent feature agents |
| `worktree_base` | `".."` | Where worktrees are created (relative to repo root) |
| `qa.text` | `true` | Spelling, grammar, placeholder copy |
| `qa.links` | `true` | Link / route verification |
| `qa.security` | `true` | Unfiltered output, exposed params, missing auth |
| `qa.accessibility` | `false` | WCAG 2.1 AA — enable for web projects |
| `qa.responsive` | `false` | Mobile / responsive layout — enable for web projects |
| `qa.empty_states` | `false` | Empty / error states — enable for UI projects |

## Commands

| Command | Description |
|---|---|
| `/speckit.maqa.coordinator` | Assess board, create worktrees, return SPAWN plan |
| `/speckit.maqa.feature` | Implement one feature in one worktree |
| `/speckit.maqa.qa` | Static analysis quality gate |
| `/speckit.maqa.setup` | Claude Code: deploy native subagents to `.claude/agents/` |

## AI tool support

| Tool | Mode |
|---|---|
| **Claude Code** | Native subagents after `/speckit.maqa.setup` — true parallel execution |
| **Gemini CLI, Cursor, Copilot, and all others** | Slash commands — same workflow, in-context |

Claude Code is the recommended tool and the most tested. Other tools are supported but not yet extensively tested — feedback welcome.

## How features are tracked

Without Trello, the coordinator reads `specs/*/tasks.md` (spec-kit's standard output from `/speckit.tasks`) and tracks state in `.maqa/state.json`:

```
todo → in_progress → in_review → done
```

Dependencies are respected: a feature only starts when all its deps are `done`.

## License

MIT — free for all.
