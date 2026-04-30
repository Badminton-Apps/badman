# MAQA Changelog

## 0.1.3 — 2026-03-27

- Coordinator: multi-board auto-detection — detects maqa-trello, maqa-linear, maqa-github-projects, maqa-jira, maqa-azure-devops in priority order
- Coordinator: CI gate integration — checks maqa-ci pipeline status before handing off to QA
- Config: added `board: auto` field to config-template.yml

## 0.1.2 — 2026-03-26

- Coordinator: auto-populate prompt triggers whenever any local spec is missing from the board (not only when board is empty)

## 0.1.1 — 2026-03-26

- Coordinator: auto-populate prompt when Trello board is empty but local specs exist

## 0.1.0 — 2026-03-26

Initial release.

- Coordinator command: assess ready features, create git worktrees, return SPAWN plan
- Feature command: implement one feature per worktree, optional TDD cycle, optional tests
- QA command: static analysis quality gate with configurable checks
- Setup command: deploy native Claude Code subagents to .claude/agents/
- Optional Trello integration via companion extension maqa-trello
- Language-agnostic: works with any stack; configure test runner in maqa-config.yml
