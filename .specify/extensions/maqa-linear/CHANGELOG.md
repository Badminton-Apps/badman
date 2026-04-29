# MAQA Linear Changelog

## 0.1.0 — 2026-03-26

Initial release.

- Setup command: reads Linear teams and workflow states via GraphQL API, generates linear-config.yml
- Populate command: creates Linear issues from specs/*/tasks.md with task list in description; skips existing; safe to re-run
- Coordinator integration: auto-detected when linear-config.yml + LINEAR_API_KEY present
