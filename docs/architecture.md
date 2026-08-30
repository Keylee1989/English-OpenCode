# English360 GPT — Architecture

> Status: Phase 0. This document describes the architecture as it now exists
> and the contracts later phases must honor.

## 1. Product frame

- Learner: adult native-Chinese speaker, **zero** prior English.
- Target: American English, **native-like functional proficiency**
  (comprehension, fluency, accuracy, pronunciation, naturalness, pragmatics,
  real-world transfer) in listening / speaking / reading / writing.
- 12 months is a sprint target (~4h/day suggested), never a graduation
  deadline. The system advances by measured ability, not by calendar.
- Platform: iPhone + iOS Safari, installable PWA (standalone), GitHub Pages
  (static hosting). Core learning must work offline; AI is an enhancement.

## 2. Layer map (29 modules from the master spec)

| # | Module | Location | Phase 0 state |
| --- | --- | --- | --- |
| 1 | Curriculum Engine | `src/engines/curriculum/` | interface only |
| 2 | Student Model | `src/engines/student/` | interface only |
| 3 | Knowledge Model | `src/engines/knowledge/` | interface only |
| 4 | Knowledge Graph | `src/engines/knowledge/` | interface only |
| 5 | Memory Engine | `src/engines/memory/` | interface only |
| 6 | SRS Engine | `src/engines/memory/` | interface only |
| 7 | Adaptive Learning Engine | `src/engines/adaptive/` | interface only |
| 8 | Assessment Engine | `src/engines/assessment/` | interface only |
| 9 | Daily Planner | `src/engines/planner/` | interface only |
| 10 | Vocabulary Engine | `src/engines/vocabulary/` | interface only |
| 11–17 | Skill engines (grammar/listening/speaking/reading/writing…) | `src/engines/skills/`, `src/engines/phonics/` | interfaces only |
| 18 | Real-world English Engine | `src/engines/tutor/ai-tutor-engine.ts` (Register types) | types only |
| 19 | AI Tutor Engine | `src/engines/tutor/` | interface only |
| 20 | AI Conversation Engine | `src/engines/tutor/` | interface only |
| 21 | Error Analysis Engine | `src/engines/errors/` | interface only |
| 22–24 | Progress / Gamification / Achievement | `src/engines/errors/error-analysis-engine.ts` | interfaces only |
| 25 | Local Persistence Layer | `src/data/db.ts` | **implemented (schema v1)** |
| 26 | Import/Export Layer | `src/data/export-import.ts` | **implemented (tested)** |
| 27 | Sync Adapter | `src/sync/sync-adapter.ts` | seam only (`DisabledSyncAdapter`) |
| 28 | AI Provider Layer | `src/ai/provider.ts`, `src/ai/availability.ts` | contract only |
| 29 | PWA Layer | `vite.config.ts`, `public/`, `src/main.tsx` | **implemented (build-verified)** |

`src/engines/index.ts` holds the single honest status registry
(`ENGINE_REGISTRY`). The home screen renders statuses straight from it; a
module may only claim `partial`/`ready` when backed by code and tests.

## 3. Data flow (target)

```
UI (React)
   │ user interactions
   ▼
LearningEvent ──► Student Model ──► Adaptive Engine ──► Daily Planner
   │                    │                                  │
   ▼                    ▼                                  ▼
Error Bank        Knowledge Model ◄────────────────── exercise selection
                        │
                        ▼
                 Memory/SRS Engine ──► due reviews
   all of the above persist to IndexedDB (Dexie) via src/data
   AI features call IAiProvider ONLY when availability != unconfigured
```

Key rule: **evidence flows one way** (raw events → models → decisions), and
every decision is reproducible from persisted data. No engine may read UI
state to decide learning paths.

## 4. Data layer design (Phase 0, implemented)

- Dexie database `english360-gpt`, `SCHEMA_VERSION = 1`.
- Tables: `settings(key)` · `learningEvents(id, occurredAt, skill, itemId)`
  · `memoryStates(itemId, dueAt, stage)` · `errors(id, occurredAt, category, skill)`.
- Settings load merges stored values over defaults so new settings added in
  later versions don't break old databases.
- Export/import wraps every table in an envelope:
  `{ schemaVersion, appVersion, exportedAt, tables[], data{} }`.
  Import runs inside one transaction: clear-all then bulk-add; unknown future
  tables are skipped; version mismatches are rejected with explicit Chinese
  error messages (newer → "upgrade app", older → "migration not implemented").
- Migration policy: every schema change bumps `SCHEMA_VERSION` via a new Dexie
  `.version(n).upgrade(...)` step AND extends export/import tests.
- API keys are **never** persisted. If a later phase adds opt-in local key
  storage it must be an explicit, documented user decision.

## 5. Student model & mastery ladder

Mastery stages (ordered): `seen → recognized → recalled → produced → used →
mastered → transferred`. Productive evidence (speaking/writing/free output)
can raise stages that receptive evidence (recognition/shadowing) cannot.
Ability scores are continuous `0..100` with confidence and sample size;
"accuracy = ability" is explicitly forbidden by the type contracts and will be
forbidden by tests once the engine lands.

## 6. AI Provider Layer design & security

- Engines depend on the `IAiProvider` interface only (chat completion with
  abort support). No SDK imports anywhere else; provider construction happens
  in exactly one place in a later phase.
- Availability state machine (`getAiAvailability`): `unconfigured` (default,
  Phase 0 truth) / `proxy` (recommended for deployment; key stays server-side)
  / `local-key` (BYOK on-device, opt-in, warning shown) / `ready`.
- Security rules enforced today:
  - no keys in git, source, or `public/`; `.env*` is git-ignored except
    `.env.example`;
  - Phase 0 performs zero network calls;
  - any future browser→provider direct call must surface its risk warning in
    UI, not silently ship the key.
- GitHub Pages constraint: static hosting can hold no secrets, therefore the
  deployment story for AI features is either user-supplied BYOK (local use)
  or a small server-side proxy owned by the user. This is documented rather
  than hidden.

## 7. Sync seam

`ISyncAdapter` (`push/pull/isEnabled`) plus `DisabledSyncAdapter` which reports
disabled honestly. Future backends implement this interface; engines and UI
never talk HTTP directly.

## 8. PWA design

- `vite-plugin-pwa` `generateSW`: precaches app shell (html/css/js/icons/svg,
  ≤4MB per file), `navigateFallback: index.html`, autoUpdate with cleanup of
  outdated caches. Runtime caching intentionally empty until real media
  strategy exists.
- Manifest: standalone display, zh-CN, maskable + regular icons, portrait,
  theme `#0f172a`. Icons are generated PNGs (`scripts/generate-icons.ps1`,
  GDI+), committed under `public/`.
- iOS specifics already handled: `viewport-fit=cover`, safe-area CSS vars,
  `apple-mobile-web-app-*` meta, apple-touch-icon, `-webkit-tap-highlight`
  suppression, dark color-scheme.

### Known iOS risks (tracked)

1. **SpeechRecognition**: Safari has WebKit-prefixed, unreliable speech APIs →
   speaking/pronunciation engines must degrade to self-record + playback +
   human/self judgment; never fabricate scores (contract already returns
   `canAutoScore: false`).
2. **Audio unlock**: playback requires a user gesture; audio-first lessons need
   tap-to-start gating.
3. **IndexedDB eviction**: Safari can purge storage under pressure → export
   reminder + (future) sync adapter mitigate.
4. **PWA install**: iOS ignores beforeinstallprompt → provide manual
   "添加到主屏幕" guidance instead of fake install buttons.
5. **Service worker updates**: autoUpdate chosen; update toast UX comes with a
   later phase.
6. **TTS voices**: en-US voice availability varies by iOS settings → detect at
   runtime, allow user-chosen fallbacks.

## 9. Testing strategy

- Unit/integration: Vitest + happy-dom + `fake-indexeddb` (test-only polyfill).
- Current coverage (23 tests): schema creation, settings merge semantics,
  event persistence, export/import round-trip + wipe-restore + duplicate
  prevention + version rejection, AI availability matrix, registry integrity
  (all 29 spec modules present; honest statuses asserted), App shell honesty
  (unconfigured AI shown as such, engines listed as 未实现).
- Every engine implementation phase must add behavioral tests before flipping
  its registry status.

## 10. Deliberate non-goals in Phase 0

No course content, no fake progress, no placeholder dashboards pretending to
be features, no AI calls, no backend, no CI (can add on request), no analytics.

## 11. Phase 1 implementation update (2026-08-22)

The following modules moved from contract-only to REAL, tested code (the live
ENGINE_REGISTRY in src/engines/index.ts remains the single source of truth):

- **Student Model v0** (src/engines/student/student-model-v0.ts): per-skill
  EMA ability estimates with difficulty credit, evidence weights per
  interaction type, confidence from sample size, trend from recent windows.
- **Memory/SRS v0** (src/engines/memory/memory-engine-v0.ts): two-component
  model (stability x difficulty); success multiplies stability by
  2.2+1.3(1-d) (>1 always), failure floors to a 10-minute retry and raises
  difficulty; mastery stage ladder moves on evidence; production modes move
  it faster; due queue with mode adaptation (lapsed items drop to
  recognition; listening modes require real TTS support).
- **Daily Planner v0** (src/engines/planner/planner-v0.ts): rule-based
  adaptive blocks Review -> Lesson -> Practice -> Assessment; rules: due SRS
  first; listening accuracy <50% adds listening drills; recognized-but-never-
  produced items add recall drills; notices explain every adjustment.
- **Curriculum content Day 1-7** (src/content/): authored lessons for zero-
  basis Chinese adults (greetings -> names/politeness -> numbers/age ->
  family -> colors -> cafe ordering -> week review), each with vocab (IPA,
  phonics hints, examples), one sentence pattern, Chinese-dominant notes.
- **Exercise system** (src/study/): deterministic seeded generation
  (recognition / reverse / active recall typing / fill-blank / sentence
  building / TTS listening / self-rated shadowing), pure grading functions,
  honest audio degradation (audio-dependent tasks are not generated without
  speech synthesis support).
- **Learning event recorder** (src/data/recorder.ts): single entry point
  writing append-only evidence, updating the Student Model, and feeding the
  Error Bank on categorized wrong answers.
- **Daily Report v0** (src/engines/progress/daily-report-v0.ts): time spent,
  per-skill accuracy, new knowledge, review outcomes, error groups, ability
  deltas vs day-start snapshot, next-step suggestions derived from the same
  rule inputs the planner will use tomorrow.
- **UI flow** (src/pages/): Home (Day X/360 + today's plan), Study wizard,
  Report page, Status dashboard; hash router, mobile-first bottom nav.

Schema v2 added tables: bilities, dailySessions, dayProgress;
memoryStates rows now carry explicit eviewCount/successCount/failureCount/
producedCount.
## 12. Phase 2 implementation update (2026-08-22)

Four teaching-capability engines landed on top of the Phase 1 loop:

### Knowledge Model v0 (\\src/knowledge/knowledge-model-v0.ts\\)
- Node graph over 300+ lexical entries + 7 grammar points (one per authored
  day pattern), each grammar node carrying Chinese-learner common errors
  (wrong/right/zh triples).
- Edge types: synonym / antonym / word-family / collocation /
  confusion-pair. Collocation edges are DERIVED automatically from phrases;
  confusion edges come from the Phonics minimal pairs; family/syn/ant are
  authored and validated (zero dangling endpoints, enforced by tests).
- Callable by other engines: \elated()\, \getConfusionSet()\,
  \getWordFamily()\, \getCollocationPartners()\,
  \getRelatedUnmastered(itemId)\ (memory-state aware - used by planner),
  \getGrammarNode()\. Persisted mirror in Dexie v3 tables
  \knowledgeItems\ / \knowledgeEdges\ for export/sync completeness.

### Vocabulary Model v0 (src/content/vocab/)
- Structure sized for 12k entries; currently **300+ core words** with full
  fields: zh meaning, American IPA, POS, frequency band 1..7, difficulty,
  example sentence pair, collocations, word family/syn/ant ids, confusion
  partners. Day 1-7 lesson words remain canonical inside the merged index.
- Phonics data is derived per-word at query time by the decode engine -
  never hand-copied.

### Error Analysis Engine v0 (src/engines/errors/error-analysis-v0.ts)
- Taxonomy: recognition-mismatch / recall-failure / spelling /
  word-order / listening-mishear / phonics-confusion.
- Classification is knowledge-aware: a listening miss on a minimal-pair
  word is diagnosed as phonics-confusion with the partner word attached as
  relatedKnowledge; typed near-misses (edit distance <= 2) become spelling.
- Every recorded wrong answer now persists enrichment: errorType,
  possibleCauseZh, relatedKnowledge, recommendedPracticeZh, answerText.
- Statistics: high-frequency categories, REPEATED errors (same category +
  same item >= 2), weak skills (<60% recent accuracy).
- Remedial pipeline: getRemedialSpecs() -> generateRemedialExercises()
  producing targeted vocab drills, phonics discrimination drills or grammar
  pattern drills.

### Phonics System v0 (src/phonics/)
- ~40 GPC rules (digraphs, short/long vowels, r-controlled, clusters) with
  Chinese articulation tips; word-level OVERRIDES for irregular sight words
  (one/two/walk/good/food...); honest uncovered-letter reporting.
- decode()/explainWordZh() power the per-word 拼读 breakdown shown on teach
  cards; buildDiscriminationDrill() generates deterministic minimal-pair
  listening exercises from 8 authored pairs (eat-it, live-leave,
  work-walk, three-tree, bad-bed, cat-cut, full-food, sit-seat).

### Adaptive Planner upgrade
- New plan block kind "drill", inserted right after SRS review when the
  Error Analysis engine detects repeated errors; notices explain why.

Schema v3 added tables: knowledgeItems(id,kind), knowledgeEdges(edgeKey,
fromItemId,toItemId,relation). Errors rows carry new optional enrichment
fields. SCHEMA_VERSION = 3.