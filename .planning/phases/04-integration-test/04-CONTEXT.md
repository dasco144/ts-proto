# Phase 4: Integration Test - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Create `integration/shared-helpers/` — a committed integration test directory with a purpose-built `.proto` fixture, `parameters.txt` enabling `sharedHelpersFile=true`, and committed expected output files (both `proto-shared.ts` and all generated `.ts` files). The test validates the complete feature end-to-end and guards against future regressions. Creating runtime behavioral tests and testing option variants are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Proto fixture scope
- Comprehensive — covers all option-gated helpers (not minimal)
- New file purpose-built for this test (not reused from another integration test)
- Must exercise all four key helper groups: timestamps (`google.protobuf.Timestamp`), byte fields (`bytes`), map fields, and repeated + nested messages
- Messages only — no service definitions

### Test depth
- Snapshot-only: committed generated files are the expected output — no runtime `-test.ts` assertions
- Committed snapshots include BOTH `proto-shared.ts` AND all generated `.ts` message files
- Committed output files live directly in the integration directory (standard ts-proto in-place pattern); `yarn proto2ts` regenerates them; test passes if no diff

### Option variants
- Baseline only: one integration directory, one `parameters.txt` with `sharedHelpersFile=true`
- Claude's discretion on any companion options to add alongside `sharedHelpersFile=true`
- No negative test (default/off behavior already validated by Phase 3 COMPAT-01, COMPAT-02)

### Nesting validation
- Include a nested proto at two levels deep (`subdir/nested/minimal.proto`) to exercise relative import path `../../proto-shared`
- Nested proto is minimal — one simple message, purpose is to prove the import path computes correctly at depth-2
- Root-level protos carry the comprehensive helper-coverage exercise

### Claude's Discretion
- Exact companion options in `parameters.txt` (if any beyond `sharedHelpersFile=true`)
- Proto package name, message names, field names
- Whether to use one root `.proto` or multiple root-level protos
- Exact subdirectory name(s) for nesting

</decisions>

<specifics>
## Specific Ideas

- The nested proto's sole purpose is path validation, not helper coverage — keep it trivial
- Nesting depth-2 is the maximum non-trivial case for relative path computation; testing it is high-value for IMP-02 regression detection

</specifics>

<deferred>
## Deferred Ideas

- Runtime behavioral test (`-test.ts` with encode/decode/fromPartial assertions) — could be a follow-up
- Additional option-combination variants (`globalThisPolyfill=true`, `importSuffix=.js`) — future phases or backlog items

</deferred>

---

*Phase: 04-integration-test*
*Context gathered: 2026-02-28*
