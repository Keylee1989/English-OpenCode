# Phase 0 Report — Project Initialization & Architecture

Date: 2026-08-22 · Branch: `main` · Scope: PHASE 0 ONLY (stopped, awaiting human review)

## 1. Created

- Fresh repo `english360-gpt/` (independent; old `english360` untouched — the
  parent directory contained no other project).
- Git initialized (`main`, no commits made yet — commit on request).
- Full toolchain: Vite 7 + React 19 + TS 5 (project references), ESLint 9 flat
  config + Prettier, Vitest 4 + happy-dom + fake-indexeddb + Testing Library.
- PWA foundation: manifest (standalone/zh-CN/maskable icons), Workbox
  generateSW precache, iOS meta + safe-area CSS, generated PNG icon set
  (`scripts/generate-icons.ps1`, reproducible).
- Real data layer: Dexie schema v1 (settings / learningEvents / memoryStates /
  errors), settings merge semantics, transactional import/export with
  schemaVersion envelope validation.
- Contract layer: shared domain types (mastery ladder `seen→transferred`,
  ability scores with confidence, interaction kinds), interfaces for all
  learning/AI engines, AI availability state machine, sync seam.
- Honest status registry `ENGINE_REGISTRY` covering **all 29 spec modules**;
  the home screen renders real statuses only.
- Docs: `README.md`, `docs/architecture.md`, this report, `.env.example`.

## 2. Tech stack & why

React 19 + TypeScript + Vite 7 + vite-plugin-pwa + Dexie 4 + Vitest 4 — per
the master spec's preferred stack: typed, modular, mobile-first, local-first,
testable. No alternative was needed.

## 3. Verification results

| Command | Result |
| --- | --- |
| `npm install` | ✅ 486 packages (esbuild postinstall blocked by npm allow-scripts policy — harmless, build proves binary works) |
| `npm run typecheck` (tsc -b) | ✅ clean |
| `npm run lint` (eslint) | ✅ 0 errors / warnings |
| `npm test` | ✅ **23 passed / 23** in 5 files |
| `npm run build` | ✅ dist built; `manifest.webmanifest` + `sw.js` (17 entries precached, ~321 KiB) |

## 4. What is REAL vs NOT IMPLEMENTED

Real now: IndexedDB persistence, import/export round-trip, PWA installability
+ offline app shell, honest status dashboard, icon pipeline.

NOT implemented (interfaces/contracts only): all learning engines (curriculum,
student model, knowledge graph, memory/SRS, adaptive, planner, assessment,
skill engines…), AI providers/network calls, sync backends, course content.
The UI states this explicitly instead of faking it.

## 5. Known issues / risks

- iOS SpeechRecognition unreliability → pronunciation scoring contract returns
  `canAutoScore:false` rather than fake scores; degrade path designed.
- Safari IndexedDB eviction → export exists; sync adapter is future mitigation.
- npm allow-scripts policy blocks esbuild postinstall on this machine — no
  functional impact today; if a future dep truly needs scripts, use
  `npm approve-scripts`.
- eslint 9.x shows an upstream "version no longer supported" notice — cosmetic.

## 6. Recommended next phase (proposal — not started)

**Phase 1 — Student Model + Memory/SRS core on top of existing evidence
tables**: implement LearningEvent capture API, ability estimation v0,
stability×difficulty memory model, due-card queue, plus a minimal real
"review flashcards" loop end-to-end. This validates the data contracts with
the least content dependency before curriculum authoring begins.

Awaiting human instruction. Phase 1 will NOT start automatically.
