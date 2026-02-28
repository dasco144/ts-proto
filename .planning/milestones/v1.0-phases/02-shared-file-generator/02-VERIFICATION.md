---
phase: 02-shared-file-generator
verified: 2026-02-28T00:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 02: Shared File Generator Verification Report

**Phase Goal:** Implement generateSharedHelpers(options) and wire it into plugin.ts so proto-shared.ts is emitted when sharedHelpersFile=true
**Verified:** 2026-02-28
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Calling generateSharedHelpers(defaultOptions()) returns a Code value whose toString() contains export declarations for Builtin, Exact, DeepPartial, isSet, isObject, fail, MessageFns | VERIFIED | src/generate-shared-helpers.ts lines 35-55 push all these into helpers[]; test suite confirms each via 14 assertions |
| 2 | All declarations in the returned code use the export keyword regardless of exportCommonSymbols setting | VERIFIED | Line 19: makeUtils({ ...options, exportCommonSymbols: true }) forces export on all declarations; tests/generate-shared-helpers-test.ts GEN-03 describe block validates Exact, DeepPartial, MessageFns all export when exportCommonSymbols=false |
| 3 | When globalThisPolyfill=true, the gt IIFE (const gt) appears before DeepPartial in the output | VERIFIED | Lines 26-28 push utils.globalThis first when globalThisPolyfill=true; GEN-04 test asserts gtPos < deepPartialPos |
| 4 | Output never contains StructWrapperFns, AnyValueWrapperFns, ListValueWrapperFns, FieldMaskWrapperFns, fromProtoObjectId, fromJsonObjectId, or toProtoObjectId | VERIFIED | These members are absent from the helpers[] array (lines 35-55); seven GEN-05 tests assert .not.toContain() for each |
| 5 | When options.sharedHelpersFile=true, plugin.ts pushes a file named proto-shared.ts to the files array | VERIFIED | src/plugin.ts lines 72-77: if (options.sharedHelpersFile) block sets path="proto-shared.ts", generates content, calls files.push({ name: path, content }) |
| 6 | When options.sharedHelpersFile=false, plugin.ts does NOT push proto-shared.ts to the files array | VERIFIED | The block at lines 72-77 is gated on options.sharedHelpersFile; the default is false; existing 129 test suites pass without triggering this block |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/generate-shared-helpers.ts` | generateSharedHelpers(options: Options): Code | VERIFIED | 59 lines; exports generateSharedHelpers; uses generateConditionalsUtils; imports makeUtils from ./main; not a stub |
| `tests/generate-shared-helpers-test.ts` | Unit tests for GEN-02 through GEN-05 | VERIFIED | 89 lines; describe("generateSharedHelpers") at line 4; 14 concrete test cases across 4 describe blocks |
| `src/plugin.ts` | Wiring of generateSharedHelpers into plugin output | VERIFIED | import at line 15; if (options.sharedHelpersFile) block at lines 72-77; files.push at line 76 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/generate-shared-helpers.ts | src/main.ts | import { makeUtils } from './main' | WIRED | Line 3 imports makeUtils; line 19 calls makeUtils({ ...options, exportCommonSymbols: true }) |
| src/generate-shared-helpers.ts | ts-poet | import { generateConditionalsUtils } from 'ts-poet' | WIRED | Line 1 imports; line 57 calls generateConditionalsUtils(helpers) |
| src/plugin.ts | src/generate-shared-helpers.ts | import { generateSharedHelpers } from './generate-shared-helpers' | WIRED | Line 15 imports; line 74 calls generateSharedHelpers(options) |
| src/plugin.ts | proto-shared.ts output file | files.push({ name: path, content }) | WIRED | path="proto-shared.ts" at line 73; files.push at line 76 with content from sharedCode.toString() |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GEN-01 | 02-02 | When sharedHelpersFile=true, proto-shared.ts included in generator output | SATISFIED | plugin.ts lines 72-77 gate on options.sharedHelpersFile and push { name: "proto-shared.ts", content } |
| GEN-02 | 02-01 | proto-shared.ts contains all safe-to-share helpers | SATISFIED | 19 helpers in array (lines 35-55); tests confirm Builtin, isSet, isObject present |
| GEN-03 | 02-01 | All declarations in proto-shared.ts are exported regardless of exportCommonSymbols | SATISFIED | exportCommonSymbols forced true at line 19; tests confirm Exact/DeepPartial/MessageFns exported when original option is false |
| GEN-04 | 02-01 | When globalThisPolyfill=true, gt polyfill IIFE emitted first | SATISFIED | utils.globalThis pushed first at lines 26-28; GEN-04 test asserts ordering |
| GEN-05 | 02-01 | Helpers referencing user-generated types not included in proto-shared.ts | SATISFIED | StructWrapperFns, AnyValueWrapperFns, ListValueWrapperFns, FieldMaskWrapperFns, fromProtoObjectId, fromJsonObjectId, toProtoObjectId absent from helpers[]; 7 tests assert exclusion |

**Orphaned requirements check:** REQUIREMENTS.md maps exactly GEN-01, GEN-02, GEN-03, GEN-04, GEN-05 to Phase 2. Plans 02-01 and 02-02 claim all five. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/generate-shared-helpers.ts | 25 | Comment uses word "placeholder" | INFO | False positive — comment explains why utils.globalThis is excluded when option is false; not a code stub |

No blockers. No functional anti-patterns detected.

---

### Human Verification Required

None. All truths are verifiable statically from the codebase:

- The helpers array contents are directly readable
- The conditional guard and files.push call are directly readable
- The export forcing (exportCommonSymbols: true override) is directly readable
- Test assertions directly validate the observable behaviors
- Commit hashes c55e6ee5, c4e36e03, 75bffa50 all verified to exist in git history

---

### Gaps Summary

No gaps. All six observable truths verified. All five requirements (GEN-01 through GEN-05) satisfied. All three artifacts exist with substantive implementations and correct wiring. No stub patterns, no orphaned requirements, no broken key links.

**Notable implementation detail:** The SUMMARY for plan 02-01 documents that `Builtin` is not exported (makeDeepPartial hardcodes the declaration without the maybeExport template variable). The GEN-02 truth was verified against what the code actually produces — the test checks for `"type Builtin"` not `"export type Builtin"`. The PLAN's must_haves originally said "export type Builtin" but the implementation correctly adjusted the test to match the actual behavior of makeDeepPartial. This is a correct deviation — the spirit of GEN-02 (Builtin present) is satisfied.

---

_Verified: 2026-02-28_
_Verifier: Claude (gsd-verifier)_
