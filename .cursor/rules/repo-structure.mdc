---
description: Repository structure and boundaries for the Badman monorepo
alwaysApply: true
---

# Repository Structure

This repo is the **backend monorepo** only. The frontend lives in a **separate repository** and is not present here.

- Do NOT search for frontend components, pages, or UI code in this repo.
- Translation/i18n files for the backend live in `libs/backend/translate/assets/i18n/`.
- When translation keys are missing or broken in the UI, the fix is in those i18n JSON files.
- **Any** i18n change in `libs/backend/translate/assets/i18n/**`—including **restructuring** (merge, flatten, rename parents), not only new strings—must go through the **`translation-manager` agent**. Do not use ad-hoc scripts or bulk JSON rewrites. See `AGENTS.md` → Translation / i18n → `translation-manager` — non-negotiable.
