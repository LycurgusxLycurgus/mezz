# Mezz POC Canon

## Prime Directive
- `agents/canon.md` is the single source of truth for this repository's current architecture and target direction.
- Scope is explicitly **POC** (not production), but implementation choices must remain locality-first, vanilla-first, and easy to evolve.

## Project Summary
- Product: static SPA for English-learning (Spanish speaker audience) with spaced repetition sessions and TTS playback.
- Stack: vanilla HTML/CSS/ES modules, IndexedDB + LocalStorage, no app runtime framework.
- Entry point: `index.html:18` loads `js/main.js`.
- Non-generic direction: preserve the current bold visual language, but simplify architecture toward feature-local slices and explicit runtime contracts.

## Environment and Runtime Matrix (POC Baseline)
- OS/runtime expectation: browser execution only (no Node server in app runtime).
- Startup: open `index.html` from a static server context so fetch paths resolve (`js/data/import.js:8`).
- Storage: IndexedDB primary (`js/data/indexeddb.js:55`), in-memory fallback after timeout (`js/data/indexeddb.js:345`).
- Audio: speech synthesis only by runtime flag (`js/modules/audio.js:8`).

## Architecture Overview (Current)
- UI shell and routing are hash-based: `Router.init()` + `hashchange` subscriber model in `js/modules/router.js:5`.
- Main orchestration and rendering are centralized in one file (`js/main.js:21` through `js/main.js:429`), including route rendering and event binding.
- Session logic is isolated in `js/modules/session.js:35`, using SRS calculation from `js/modules/srs.js:33` and persistence calls to IndexedDB.
- Data bootstrapping imports card JSON payloads via fetch (`js/data/import.js:33`) and writes each card through `saveCard`.
- Styling is tokenized in `css/tokens.css:3` and split into component/view/keyframe files (`css/components.css`, `css/views.css`, `css/keyframes.css`).

## Feature Inventory
- Onboarding gate: redirects to `#onboarding` if not completed (`js/main.js:62`).
- Home decks: daily/core/golden counts from due cards and session launch controls (`js/main.js:111`).
- Review loop: reveal -> rate -> persist -> rerender (`js/main.js:328`, `js/main.js:349`).
- Settings: audio toggle and daily limit persistence (`js/main.js:357`).

## Request/Execution Flow (Validated)
- Primary happy path (review):
  1) `js/main.js:172` (`#quick-start`) -> `startSession`
  2) `js/modules/session.js:35` -> `getDueCards`
  3) `js/data/indexeddb.js:225` -> queue returned
  4) `js/main.js:217` render review and `loadNextCard`
  5) `js/main.js:349` rating click -> `rateCurrentCard`
  6) `js/modules/session.js:85` -> `calculateNextReview` (`js/modules/srs.js:33`) -> `saveCard` (`js/modules/session.js:191`)
- Traceability is within <=3 operational hops from UI action to persistence for core interactions.

## Data Contracts (Current and Canonical Target)
- Card contract is implicit via JSDoc and JSON shape, not runtime-validated (`js/modules/srs.js:7`, `js/data/indexeddb.js:27`, `js/assets/golden-sentences.json:4`).
- Settings contract is implicit defaults + merge (`js/data/localstorage.js:20`).
- Session record shape is locally defined in `endSession` (`js/modules/session.js:144`).
- Canon target for POC: add one shared `contracts` module with vanilla validators for Card/Settings/Session to validate at import boundary and before persistence.

## Detailed Canon Decisions (Checklist-Mapped)

### A1 Authentication and Authorization
- Current: no auth layer exists; app is local single-user browser state.
- Canon decision: keep auth out of POC scope; if sync/account features are added later, introduce one centralized auth guard module before any protected route.

### A2 Request Flow and State Management
- Current: clear route and session flow, but orchestration is concentrated in `js/main.js:21` and rerender-driven.
- Canon decision: split by feature slices (`onboarding`, `home`, `review`, `settings`) while keeping one lightweight app bootstrap file.

### A3 Error Handling and Recovery
- Current: many modules emit JSON logs via `console.log` (`js/main.js:426`, `js/data/indexeddb.js:409`) and often catch errors; user-facing fallback messaging exists in selected paths (`js/data/import.js:104`, `js/modules/audio.js:96`).
- Canon decision: standardize one error envelope `{status, code, message, details}` at all boundaries (import, storage, session rating) and one shared logger helper.

### A4 Data Contracts and Schemas
- Current: no runtime schema validation for imported JSON cards (`js/data/import.js:39`) or settings persistence.
- Canon decision: POC-safe validators must reject malformed cards before `saveCard`, and sanitize optional fields before render.

### A5 Critical User Journeys
- Current: onboarding -> home -> review -> completion is implemented and navigable (`js/main.js:67`, `js/main.js:111`, `js/main.js:217`, `js/main.js:263`).
- Canon decision: preserve this path as the canonical happy path and treat import/storage failure as explicit degraded mode with clear message and recover action.

### B1 Design System Foundation
- Current: single CSS approach with centralized tokens (`css/tokens.css:3`) and dedicated component/view files.
- Canon decision: keep this structure; avoid adding utility frameworks.

### B2 Visual Language
- Current: intentional palette and typography system present; however several hardcoded colors remain (`css/components.css:152`, `css/views.css:183`, `css/views.css:195`).
- Canon decision: migrate hardcoded colors to token aliases for consistency and easier tuning.

### B3 Component Architecture
- Current: UI rendering is string-template heavy in `js/main.js`, with `UI` helper module mostly unused (`js/modules/ui.js:7`).
- Canon decision: remove dead abstraction or adopt it consistently; prefer feature-local render functions and event handlers over global mega-file templates.

### B4 Responsive Strategy
- Current: single breakpoint strategy at `768px` in views (`css/views.css:20`, `css/views.css:112`).
- Canon decision: keep one breakpoint system for POC; ensure all actionable elements remain touch-safe (current primary buttons meet >=48px in `css/components.css:63`).

### B5 Accessibility Baseline
- Current: live region exists (`index.html:16`) and image alts are present in key templates (`js/main.js:131`, `js/main.js:185`), but no explicit focus-visible styles were found in CSS.
- Canon decision: add visible keyboard focus styles for buttons/inputs as non-negotiable POC baseline.

### C1 Environment and Configuration
- Current: no `.env` and no server config requirements; app uses static constants and browser APIs.
- Canon decision: document static-server requirement and browser capability assumptions (IndexedDB + speechSynthesis).

### C2 Repository Structure
- Current: shallow structure (max depth 3), but one large orchestration file (`js/main.js` 429 LOC) and large data files (`js/assets/core-words.json` 11904 LOC).
- Canon decision: keep directory depth <=3; split `main.js` by feature view modules; keep large dataset as source artifact but move generated/expanded content outside runtime repo path if it continues to grow.

### C3 Dependency Management
- Current app runtime dependencies: 0 package dependencies; remote Google Fonts import exists (`css/tokens.css:1`).
- Canon decision: maintain zero npm dependency posture for app runtime; optional font self-hosting can be deferred for POC.

### C4 Build and Development
- Current: no build pipeline; static SPA served directly.
- Canon decision: keep no-build flow for POC and document one canonical run command in project docs when docs are added.

### C5 Testing Infrastructure
- Current: no automated tests found; no `tests/` or testscripts directory in repo.
- Canon decision: adopt minimal manual testscripts first (smoke + happy path + storage fallback) before introducing tooling.

### C6 Logging and Observability
- Current: structured log payloads exist but duplicated per module (`js/modules/session.js:227`, `js/modules/audio.js:198`, `js/data/import.js:108`).
- Canon decision: one shared logger utility with deterministic correlation propagation per session.

### C7 Security Baseline
- Current: no auth attack surface, no eval usage found, but heavy `innerHTML` rendering from data-backed fields (`js/main.js:280`, `js/main.js:301`) creates XSS risk if content source changes.
- Canon decision: sanitize content fields before interpolation or render via text nodes for user/content-sourced strings.

### C8 Git and Version Control
- Current: `.gitignore` is incomplete for general app repos (`.gitignore:1` through `.gitignore:5`) and does not include common Node/build/editor artifacts.
- Canon decision: expand `.gitignore` baseline when repository transitions from pure POC experiments to shared team workflow.

### C9 Deployment and Infrastructure
- Current: no deployment config detected (no Docker/platform manifests).
- Canon decision: treat deployment as out-of-scope for this POC; when required, choose one static host and document environment parity.

### C10 CI/CD Pipeline
- Current: no CI workflows detected.
- Canon decision: CI deferred for POC; minimum future pipeline is install (if added), smoke testscript, and static integrity checks.

## Anti-Generic Filter Findings (Canonical Direction)
- Replace generalized but unused abstraction (`js/modules/ui.js`) with either full adoption in feature slices or removal; avoid half-adopted indirection.
- Replace repeated module-local logger/announce helpers with one shared infrastructure utility to reduce drift.
- Replace monolithic render-control file (`js/main.js`) with localized feature modules to improve first-read comprehension and edit safety.

## Locality Budget
- Current actuals (runtime-relevant):
  - files: 17 (`index.html`, 10 JS, 4 CSS, 2 JSON datasets)
  - LOC/file: peak app logic file 429 (`js/main.js`), peak data file 11904 (`js/assets/core-words.json`)
  - deps: 0 runtime package deps, 1 remote font import
- Canon target (POC-safe):
  - files: <=20 runtime files (do not expand file count unless locality improves measurably)
  - LOC/file: <=300 for JS/CSS logic files, hard cap 500; data files exempt but should be generated/curated intentionally
  - deps: 0 runtime package deps; max 1 external concern per concern only if unavoidable

## POC Constitution (Project-Specific)
- Locality first: each feature owns route/render/logic/data contract in adjacent files; shared code only after rule-of-three.
- Vanilla first: browser primitives before libraries; do not add framework/build complexity while app remains static POC.
- Contracts at boundaries: validate imported card payloads and persisted settings/session objects before use.
- Deterministic debugging: keep structured logs with correlation IDs and explicit boundary logs (route change, session start, card rate, storage write).
- Testing progression: run one-shot testscripts per feature phase (smoke -> happy path -> failure path), and if debugging fails after two turns, produce `agents/testscripts/failure_report.md` with artifacts and boundary hypothesis.
- Budget discipline: every plan/change must explicitly state `{files, LOC/file, deps}` and stay within locality envelope.
