# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — sharedHelpersFile

**Shipped:** 2026-02-28
**Phases:** 4 | **Plans:** 7 | **Commits:** 30

### What Was Built

- `sharedHelpersFile` boolean option — registered in `src/options.ts` with default `false`, parsed via existing `parseParamValue` mechanism
- `src/generate-shared-helpers.ts` — 65-line module; `generateSharedHelpers(options)` collects 16 movable helpers, forces `exportCommonSymbols: true`, respects `globalThisPolyfill` ordering
- Per-file import injection via ts-poet's `conditionalUtils` — replaces inline ConditionalOutput declarations with imports from `proto-shared`, relative path resolved automatically by ts-poet at all nesting depths
- `integration/shared-helpers/` integration test — helpers.proto (root), minimal.proto (depth-2), committed snapshots; 131 test suites all passing

### What Worked

- **TDD structure** — RED→GREEN pattern for phases 2 and 3 was productive; having failing tests first clarified exact output requirements before implementation
- **ts-poet `conditionalUtils`** — discovering this API eliminated the need to branch `makeUtils()` throughout `src/main.ts`. A one-line addition to `plugin.ts` replaced what would have been a large, risky diff
- **Phase 4 as regression net** — integration test with committed snapshots provides strong protection against future regressions; any unintended change to helper output will produce a non-empty `git diff`
- **Scope discipline** — all 7 v1 requirements shipped, 3 v2 requirements intentionally deferred. No scope creep
- **Backwards compatibility gate** — running full test suite after Phase 3 (COMPAT-02) immediately confirmed zero regressions before writing integration tests

### What Was Inefficient

- **Phase 4-02 required bug fixes to generate-shared-helpers.ts** — function helpers were missing `export` keywords because `exportCommonSymbols` was not threaded through all `makeXxx` helper functions. This rework touched Phase 2 work after Phase 3 was already complete. The issue was caught by the integration snapshot generation, not by unit tests — Phase 2 unit tests didn't run the full code path that `plugin.ts` uses
- **`proto-shared.ts` needed `code` global snippet for globalThis** — `conditionalOutput` with an empty declaration caused an spurious import; had to use `code\`globalThis\`` plain snippet instead. This was a ts-poet behavior nuance not obvious from the API
- **audit-milestone ran on incomplete milestone** — the first audit was run before Phase 2 had started, producing a `gaps_found` report that then needed to be re-run after completion. The initial audit was intentional (milestone scope discovery) but the re-audit added a step

### Patterns Established

- **`generateXxx(options: Options)` pattern** — shared file generators take only `Options`, not `ctx` or `utils`. `plugin.ts` calls them directly without creating a full codegen context
- **ts-poet `conditionalUtils` for shared-file import injection** — when a codebase has ConditionalOutput helper declarations, `conditionalUtils` in `toString()` opts is the right mechanism to redirect them to imports
- **Integration test structure** — `parameters.txt` + `.proto` fixture + committed `.ts` snapshots is the established ts-proto integration test pattern; new integration directories follow this exactly
- **`exportCommonSymbols: true` must be forced inside shared-file generators** — any generator producing a shared helper file must override this option internally, independent of the user's setting

### Key Lessons

1. **Thread `exportCommonSymbols` through all helper-creation functions before considering unit tests complete** — unit tests for shared file content should explicitly test that each symbol is exported, not just present. The Phase 2 tests checked for `"type Builtin"` (presence) but missed the `export` prefix on functions.
2. **Test the full code path used by `plugin.ts`, not just the function directly** — `generateSharedHelpers()` was unit-tested in isolation, but `plugin.ts` calls `getTsPoetOpts()` which may affect output. The integration test caught issues that unit tests missed.
3. **`conditionalUtils` is a ts-poet concept worth deep-reading before planning** — the API was discovered during research but not fully understood. If it had been prototyped earlier, Phase 3 would have been a single plan instead of two.
4. **`proto-shared.ts` has an implicit dependency on co-generated wellknown types** — `Timestamp` is imported from `./google/protobuf/timestamp`. Document this coupling upfront in v2 planning if the feature scope grows.

### Cost Observations

- Model mix: predominantly sonnet (balanced profile); haiku for quick tasks
- Sessions: ~5 context windows across 2 days
- Notable: yolo mode with auto-advance enabled high throughput — phases executed back-to-back without manual re-prompting

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 4 | 7 | First milestone — baseline established |

### Cumulative Quality

| Milestone | Test Suites | Snapshots | New Integration Tests |
|-----------|-------------|-----------|----------------------|
| v1.0 | 131 | 102 | 1 (shared-helpers) |

### Top Lessons (Verified Across Milestones)

1. *(Single milestone — no cross-validated lessons yet)*
