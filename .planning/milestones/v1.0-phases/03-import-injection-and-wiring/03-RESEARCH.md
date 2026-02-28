# Phase 3: Import Injection and Wiring - Research

**Researched:** 2026-02-28
**Domain:** ts-proto code generation — ts-poet `conditionalUtils` ToStringOpts, relative path computation, per-file import injection
**Confidence:** HIGH

## Summary

Phase 3 completes the end-to-end `sharedHelpersFile` feature. The work from Phase 2 (generating `proto-shared.ts`) is already wired into `plugin.ts`. Phase 3 connects the per-file generation side: when `sharedHelpersFile=true`, each generated `.ts` file must import its helpers from `proto-shared` instead of declaring them inline.

The mechanism to achieve this is already built into ts-poet 6.12.0: the `conditionalUtils` field of `ToStringOpts`. When set to a module path string, ts-poet's `deepFindAll` replaces every `ConditionalOutput` usage site with a named import from that module, and automatically suppresses the `ifUsed` inline declarations (because those helpers are never added to the `used[]` array when `conditionalUtils` is active). The relative import path is computed automatically by ts-poet's `maybeRelativePath` function, which takes the generating file's `path` (already passed to `toString()`) and the `conditionalUtils` module path, and derives the correct `./proto-shared`, `../proto-shared`, or `../../proto-shared` etc.

The implementation fits in two small, targeted changes: (1) pass `conditionalUtils: "./proto-shared" + options.importSuffix` in the per-file `toString()` call in `plugin.ts` when `options.sharedHelpersFile` is true, and (2) verify COMPAT-01/COMPAT-02 — the code path when `sharedHelpersFile=false` is completely unmodified. No changes to `main.ts`, `generate-shared-helpers.ts`, or any helper logic are needed.

**Primary recommendation:** In `plugin.ts`, add `conditionalUtils: "./proto-shared" + options.importSuffix` to the `ToStringOpts` spread when generating per-proto files and `options.sharedHelpersFile` is true. This single change satisfies IMP-01, IMP-02, and IMP-03 simultaneously.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMP-01 | Each generated `.ts` file imports movable helpers from `proto-shared` instead of declaring them inline | `conditionalUtils` in `ToStringOpts` converts every `ConditionalOutput` usage site to an import and suppresses `ifUsed` declarations — confirmed by reading `Code.js` `deepFindAll` implementation |
| IMP-02 | Import paths are correctly relative to the generated file's depth (`./proto-shared`, `../proto-shared`, `../../proto-shared`) | ts-poet's `maybeRelativePath(ourModulePath, importPath)` computes this automatically from the `path` field (already set to the generated file's path) and `conditionalUtils` value — confirmed by reading `Import.js` `maybeRelativePath` implementation |
| IMP-03 | `importSuffix` is respected in the import path (e.g., `proto-shared.js`) | Construct `conditionalUtils` as `"./proto-shared" + options.importSuffix`; this is exactly how other import paths in ts-proto handle `importSuffix` (e.g., `impProto` in `utils.ts` line 282) |
| COMPAT-01 | When `sharedHelpersFile=false`, output is byte-for-byte identical to current behavior | The `conditionalUtils` addition is gated on `options.sharedHelpersFile`; the false-path code in `plugin.ts` remains completely unchanged |
| COMPAT-02 | All existing integration tests pass unchanged | No changes to `main.ts`, `generateFile`, or any helper logic; only additive change to `plugin.ts` per-file `toString()` call |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-poet | 6.12.0 | `ToStringOpts.conditionalUtils` — replaces `ConditionalOutput` instances with imports from a specified module | Already installed; `conditionalUtils` is specifically designed for this use case (confirmed by `ConditionalOutput.d.ts` JSDoc) |
| TypeScript | ~5.8.3 | Implementation language | Project language; strict mode in tsconfig.json |
| Jest + ts-jest | jest ^29.6.1, ts-jest ^29.3.4 | Unit tests for path computation, integration tests for end-to-end behavior | Already configured; `testMatch` covers both `tests/` and `integration/` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `path` | built-in | Computing relative import paths | Already used in `utils.ts` for `generateIndexFiles`; ts-poet imports it internally for `maybeRelativePath` |

**Installation:** No new packages required.

## Architecture Patterns

### How `conditionalUtils` Works (HIGH confidence — verified by reading `Code.js` and `Import.js`)

When `code.toString({ conditionalUtils: "./proto-shared.js", path: "google/api/foo.ts" })` is called:

1. `generateCodeWithImports` calls `deepFindAll(opts.conditionalUtils)` — passing the utils module path
2. In `deepFindAll`, when a `ConditionalOutput` placeholder is encountered AND `utilsUrl` is set:
   ```js
   // Code.js line 67-69
   if (utilsUrl && placeholder instanceof ConditionalOutput) {
     imports.push(Import.importsName(placeholder.usageSiteName, utilsUrl, placeholder.isType));
     continue;  // <-- skips adding to `used[]`
   }
   ```
3. The `continue` means the helper is NEVER added to the `used[]` array
4. Later, when `MaybeOutput` (the `ifUsed` wrapper) is processed: `if (used.includes(current.parent))` — condition is false, declaration is suppressed
5. The import `import { isSet } from "./proto-shared.js"` is emitted; the inline `function isSet(...)` declaration is NOT emitted

**Result:** IMP-01 (import instead of inline) and COMPAT-01 (no changes when off) are satisfied automatically by this single mechanism.

### How Relative Paths Are Computed (HIGH confidence — verified by reading `Import.js` `maybeRelativePath`)

```js
// Import.js lines 324-343
function maybeRelativePath(outputPath, importPath) {
  if (!importPath.startsWith("./")) {
    return importPath;  // non-relative paths returned as-is
  }
  importPath = path.normalize(importPath);
  outputPath = path.normalize(outputPath);
  const outputPathDir = path.dirname(outputPath);
  // ... edge case: importing a file named same as importing file's dir
  let relativePath = path.relative(outputPathDir, importPath).split(path.sep).join(path.posix.sep);
  if (!relativePath.startsWith(".")) {
    relativePath = "./" + relativePath;
  }
  return relativePath;
}
```

**Examples (all produce correct output):**
| Generated file path | `conditionalUtils` value | Computed import path |
|---------------------|--------------------------|----------------------|
| `foo.ts` | `./proto-shared` | `./proto-shared` |
| `google/api/foo.ts` | `./proto-shared` | `../../proto-shared` |
| `a/b/c/foo.ts` | `./proto-shared` | `../../../proto-shared` |
| `foo.ts` | `./proto-shared.js` | `./proto-shared.js` |
| `google/api/foo.ts` | `./proto-shared.js` | `../../proto-shared.js` |

The `path` parameter passed to `toString()` is already correctly set in `plugin.ts` line 55-58 (`const [path, code] = generateFile(...)` where `path` is the module name like `google/api/foo.ts`). ts-poet uses this `path` to compute the relative import path.

### The Modification to `plugin.ts`

**Current code (lines 53-59):**
```typescript
const files = await Promise.all(
  filesToGenerate.map(async (file) => {
    const [path, code] = generateFile({ ...ctx, currentFile: createFileContext(file) }, file);
    const content = code.toString({ ...getTsPoetOpts(options, tsProtoVersion, protocVersion, file.name), path });
    return { name: path, content };
  }),
);
```

**Phase 3 change:**
```typescript
const files = await Promise.all(
  filesToGenerate.map(async (file) => {
    const [path, code] = generateFile({ ...ctx, currentFile: createFileContext(file) }, file);
    const tsPoetOpts = getTsPoetOpts(options, tsProtoVersion, protocVersion, file.name);
    if (options.sharedHelpersFile) {
      tsPoetOpts.conditionalUtils = "./proto-shared" + options.importSuffix;
    }
    const content = code.toString({ ...tsPoetOpts, path });
    return { name: path, content };
  }),
);
```

This is the only code change needed for IMP-01, IMP-02, and IMP-03. No changes to `main.ts`, `generateFile`, `getTsPoetOpts`, or `generate-shared-helpers.ts`.

**Alternative: Modify `getTsPoetOpts` to accept `sharedHelpersFile`:**
```typescript
// options.ts
export function getTsPoetOpts(
  options: Options,
  tsProtoVersion: string,
  protocVersion: string,
  fileName?: string,
): ToStringOpts {
  const { importSuffix, esModuleInterop } = options;
  const pbjs = "protobufjs/minimal" + importSuffix;

  return {
    prefix: `...`,
    dprintOptions: { preferSingleLine: true, lineWidth: 120 },
    forceRequireImport: esModuleInterop ? [] : ["long"],
    forceDefaultImport: esModuleInterop ? [pbjs] : [],
    forceModuleImport: esModuleInterop ? [] : [pbjs],
    // IMP-01, IMP-02, IMP-03: redirect ConditionalOutput to shared file
    ...(options.sharedHelpersFile && fileName
      ? { conditionalUtils: "./proto-shared" + importSuffix }
      : {}),
  };
}
```

The `fileName` parameter distinguishes per-file calls (where we inject `conditionalUtils`) from extra-file calls for `typeRegistry.ts`, `proto-shared.ts`, and `index.ts` itself (where `fileName` is undefined or irrelevant). However, the inline approach in `plugin.ts` is cleaner and requires no changes to `getTsPoetOpts`.

**Recommended:** Inline modification in `plugin.ts` — simpler, more explicit, no function signature changes.

### The `importSuffix` Pattern (HIGH confidence — verified by reading `src/utils.ts` lines 272-282)

All ts-proto import paths that reference generated files append `importSuffix`:
```typescript
// src/utils.ts line 282 — impProto pattern
return imp(`${prefix}${type}@./${module}${options.fileSuffix}${options.importSuffix}`);

// src/options.ts line 373 — pbjs import
const pbjs = "protobufjs/minimal" + importSuffix;
```

For the `proto-shared` import path, the pattern is:
```typescript
"./proto-shared" + options.importSuffix
// Examples:
//   importSuffix=""    → "./proto-shared"
//   importSuffix=".js" → "./proto-shared.js"
//   importSuffix=".ts" → "./proto-shared.ts"
```

The shared file is ALWAYS named `proto-shared.ts` (no `fileSuffix` applied). The import path only gets `importSuffix`, not `fileSuffix`. This matches requirements: IMP-03 says "importSuffix is respected in the import path."

### COMPAT-01 and COMPAT-02 Safety

**COMPAT-01 (output identical when `sharedHelpersFile=false`):** The change to `plugin.ts` is strictly gated on `if (options.sharedHelpersFile)`. When false, `tsPoetOpts` has no `conditionalUtils` field, and `toString()` behavior is identical to today. Zero regression risk.

**COMPAT-02 (all existing integration tests pass):** The change affects only the per-file `toString()` call. No changes to:
- `main.ts` / `generateFile` function
- Any helper `conditionalOutput()` definitions
- `generate-shared-helpers.ts`
- `getTsPoetOpts` (if using inline approach)
- Any integration test fixture or parameters file

### Anti-Patterns to Avoid

- **Setting `conditionalUtils` for the shared file itself:** `proto-shared.ts` must NOT have `conditionalUtils` set — it IS the declaration file. Its `toString()` call in `plugin.ts` (line 75) does not pass `conditionalUtils` and must remain unchanged.
- **Using `fileSuffix` in the shared file import path:** The shared file is always `proto-shared.ts` regardless of `fileSuffix`. Only `importSuffix` goes in the import path.
- **Modifying `generateFile` or `makeUtils`:** No changes needed there. The `ifUsed` declarations in `main.ts` lines 459-467 are automatically suppressed by the `conditionalUtils` mechanism — no manual filtering required.
- **Passing `conditionalUtils` to `typeRegistry.ts` toString:** Line 68 in `plugin.ts` calls `code.toString({ ...getTsPoetOpts(...), path })` without `conditionalUtils` — this must remain unchanged. The type registry has its own context and should not import from `proto-shared`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Replacing inline declarations with imports | Custom AST transform, string replacement | `conditionalUtils` in `ToStringOpts` | ts-poet already implements this exact use case; it handles all `ConditionalOutput` instances, including nested transitive ones, in a single pass |
| Computing relative paths from file to `proto-shared` | Custom `path.relative()` logic in `plugin.ts` | ts-poet's built-in `maybeRelativePath` inside `emitImports` | Invoked automatically when `path` and `conditionalUtils` are both set in `toString()` opts; handles edge cases (same-dir, posix separators on Windows) |
| Suppressing `ifUsed` declarations | Conditional code in `main.ts` to skip `ifUsed` when `sharedHelpersFile=true` | The `conditionalUtils` mechanism already skips adding helpers to `used[]`, which causes `ifUsed` to emit nothing | Adding a conditional in `main.ts` would duplicate logic that ts-poet already owns |

**Key insight:** The `conditionalUtils` option in ts-poet was designed precisely for the "generate a shared utils file and import from it" use case. The entire Phase 3 implementation is a single-line addition to `plugin.ts`.

## Common Pitfalls

### Pitfall 1: Setting `conditionalUtils` on the `proto-shared.ts` toString call
**What goes wrong:** `proto-shared.ts` generates its content using `generateSharedHelpers(options)` which returns `generateConditionalsUtils(helpers)`. If `conditionalUtils` were added to its `toString()` call, the shared file would try to import its own helpers from itself — circular import, empty file, or no-op.
**Why it happens:** The `proto-shared.ts` block in `plugin.ts` (lines 72-77) uses the same `getTsPoetOpts` as per-file generation. If `getTsPoetOpts` were modified to always include `conditionalUtils` when `sharedHelpersFile=true`, it would incorrectly affect the shared file itself.
**How to avoid:** Only add `conditionalUtils` in the per-file generation block (lines 53-59), NOT in the `proto-shared.ts` block (lines 72-77). The inline approach in `plugin.ts` makes this explicit and easy to verify.
**Warning signs:** `proto-shared.ts` imports from itself or is empty.

### Pitfall 2: Forgetting `importSuffix` in the `conditionalUtils` value
**What goes wrong:** When users set `importSuffix=.js` (for ESM compatibility), imports from `proto-shared` would be generated as `import { isSet } from "./proto-shared"` (without `.js`) instead of `import { isSet } from "./proto-shared.js"`. TypeScript in ESM mode requires explicit file extensions.
**Why it happens:** `importSuffix` must be explicitly appended — it is not part of the shared file's filename (`proto-shared.ts`), only of the import path.
**How to avoid:** Always use `"./proto-shared" + options.importSuffix` — never bare `"./proto-shared"`.
**Warning signs:** ESM integration tests fail with "Cannot find module" errors; `import { isSet } from "./proto-shared"` appears in output when `importSuffix=.js`.

### Pitfall 3: Expecting `conditionalUtils` to handle `isType` correctly for type-only helpers
**What goes wrong:** Some `ConditionalOutput` instances have `isType: true` (e.g., `DeepPartial`, `Exact`, `Builtin`, `MessageFns`). When `conditionalUtils` is set, ts-poet calls `Import.importsName(name, utilsUrl, placeholder.isType)`, which creates a `typeImport` import (`import type { DeepPartial }`) for those helpers.
**Why it happens:** This is correct behavior — type-only imports avoid value imports for types. However, if `proto-shared.ts` does not export these with `export type` or the consuming file uses `isolatedModules`, there could be issues.
**How to avoid:** Verify that `proto-shared.ts` exports types as `export type` or regular `export` (ts-poet handles this in the shared file generation). In Phase 2, `generateSharedHelpers` forces `exportCommonSymbols: true`, which uses `export type` for type helpers.
**Warning signs:** TypeScript compilation error "Module ... does not export type ..." or "is not a module" in `isolatedModules` mode.

### Pitfall 4: The `typeRegistry.ts` extra file picking up `conditionalUtils`
**What goes wrong:** If `conditionalUtils` is added to `getTsPoetOpts` without a `fileName` guard, the `typeRegistry.ts` generation (lines 61-70 of `plugin.ts`) would also get `conditionalUtils`, causing type registry helpers to be imported from `proto-shared` instead of defined in the type registry file.
**Why it happens:** `getTsPoetOpts` is used for all files including the type registry extra file.
**How to avoid:** Use the inline approach (modify only the per-file block in `plugin.ts`) rather than modifying `getTsPoetOpts`. If modifying `getTsPoetOpts`, gate on `fileName !== undefined` AND `options.sharedHelpersFile`.
**Warning signs:** `typeRegistry.ts` has unexpected imports from `proto-shared`.

### Pitfall 5: Missing `path` in `toString()` opts causing incorrect relative path computation
**What goes wrong:** `maybeRelativePath` uses `path` (the output file path) to compute relative imports. If `path` is not set, all paths would be computed from the root, producing incorrect `./proto-shared` for all files regardless of nesting depth.
**Why it happens:** `path` is already passed in the current `plugin.ts` code as a spread: `{ ...getTsPoetOpts(...), path }`. This is correct and must be preserved.
**How to avoid:** Ensure `path` remains in the `toString()` opts spread. Do not restructure the call in a way that drops `path`.
**Warning signs:** All generated files (even nested ones) have `import { isSet } from "./proto-shared"` instead of the correctly depth-adjusted `../../proto-shared`.

## Code Examples

### The Complete Phase 3 Change

```typescript
// src/plugin.ts — modify the per-file generation block only
const files = await Promise.all(
  filesToGenerate.map(async (file) => {
    const [path, code] = generateFile({ ...ctx, currentFile: createFileContext(file) }, file);
    const tsPoetOpts = getTsPoetOpts(options, tsProtoVersion, protocVersion, file.name);
    // IMP-01, IMP-02, IMP-03: redirect ConditionalOutput instances to shared file
    if (options.sharedHelpersFile) {
      tsPoetOpts.conditionalUtils = "./proto-shared" + options.importSuffix;
    }
    const content = code.toString({ ...tsPoetOpts, path });
    return { name: path, content };
  }),
);
```

### Verifying Path Computation in Unit Test

```typescript
// tests/import-injection-test.ts
import * as path from "path";

describe("proto-shared import path computation", () => {
  // These tests document the expected behavior of ts-poet's maybeRelativePath
  // when conditionalUtils = "./proto-shared" and various file paths are used.

  function computeRelativePath(filePath: string, conditionalUtils: string): string {
    // Replicate ts-poet's maybeRelativePath logic
    const importPath = path.normalize(conditionalUtils);
    const outputPath = path.normalize(filePath);
    const outputPathDir = path.dirname(outputPath);
    let relativePath = path.relative(outputPathDir, importPath).split(path.sep).join("/");
    if (!relativePath.startsWith(".")) {
      relativePath = "./" + relativePath;
    }
    return relativePath;
  }

  it("root-level file: ./proto-shared", () => {
    expect(computeRelativePath("foo.ts", "./proto-shared")).toBe("./proto-shared");
  });

  it("one level deep: ../proto-shared", () => {
    expect(computeRelativePath("google/foo.ts", "./proto-shared")).toBe("../proto-shared");
  });

  it("two levels deep: ../../proto-shared", () => {
    expect(computeRelativePath("google/api/foo.ts", "./proto-shared")).toBe("../../proto-shared");
  });

  it("importSuffix=.js: ../../proto-shared.js", () => {
    expect(computeRelativePath("google/api/foo.ts", "./proto-shared.js")).toBe("../../proto-shared.js");
  });
});
```

### End-to-End Verification Pattern

To verify IMP-01 and IMP-02 without a real protoc run, use the existing `generateFile` function directly:

```typescript
// tests/import-injection-test.ts
import { generateFile, makeUtils } from "../src/main";
import { defaultOptions } from "../src/options";
import { getTsPoetOpts, Options } from "../src/options";
import { createTypeMap } from "../src/types";
import { createFileContext, BaseContext } from "../src/context";

// ... (requires a minimal FileDescriptorProto fixture)
// Key assertion: when sharedHelpersFile=true, output should NOT contain
// "function isSet" and SHOULD contain "import { isSet } from"
```

### Pattern: How the Output Looks (Before vs After)

**Before (sharedHelpersFile=false) — root-level `foo.ts`:**
```typescript
// ... message code ...

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}

export type DeepPartial<T> = ...
export interface MessageFns<T> { ... }
```

**After (sharedHelpersFile=true) — root-level `foo.ts`:**
```typescript
import { DeepPartial, isSet, MessageFns } from "./proto-shared";
// ... message code uses these symbols without declaring them ...
// No inline function declarations at end of file
```

**After (sharedHelpersFile=true) — nested `google/api/foo.ts`:**
```typescript
import { DeepPartial, isSet, MessageFns } from "../../proto-shared";
// ... message code ...
```

**After (sharedHelpersFile=true, importSuffix=.js) — nested `google/api/foo.ts`:**
```typescript
import { DeepPartial, isSet, MessageFns } from "../../proto-shared.js";
// ... message code ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All helpers declared inline at bottom of each file via `ifUsed` | When `sharedHelpersFile=true`: imported from `proto-shared` via `conditionalUtils` | This feature (Phase 3) | Eliminates duplication; no behavior change when `sharedHelpersFile=false` |
| N/A | `ToStringOpts.conditionalUtils` in ts-poet 6.12.0 added specifically for this pattern | ts-poet 6.12.0 release | Makes Phase 3 a single-line change |

**No deprecated patterns in scope for this phase.**

## Open Questions

1. **Should `getTsPoetOpts` be modified vs. inlining in `plugin.ts`?**
   - What we know: Both approaches work. Inlining is more explicit and requires zero signature changes. Modifying `getTsPoetOpts` would centralize the logic but risks accidentally affecting the `typeRegistry.ts` or `proto-shared.ts` toString calls.
   - Recommendation: Use the inline approach in `plugin.ts`. Modify only the per-file generation block. This makes the Phase 3 change maximally localized.

2. **Does `conditionalUtils` handle `isType: true` helpers correctly for `isolatedModules` users?**
   - What we know: ts-poet calls `Import.importsName(name, utilsUrl, placeholder.isType)`. When `isType=true`, this creates a type-only import (`import type { Foo }`). This is correct for TypeScript.
   - What's unclear: Whether `proto-shared.ts` exports types with `export type` or `export` — the Phase 2 implementation uses `generateConditionalsUtils` which emits declaration site code exactly as written in the helper (e.g. `export type DeepPartial<T> = ...`). This should be fine.
   - Recommendation: Proceed; verify during implementation by checking a generated `proto-shared.ts` for correct `export type` on type helpers.

3. **What happens if a generated file uses NO movable helpers?**
   - What we know: If a proto only defines an enum with no messages, `generateFile` would produce code that references no `ConditionalOutput` instances. In that case, `deepFindAll` with `conditionalUtils` set would collect zero imports from the shared file.
   - What's unclear: Whether ts-poet emits an empty `import {} from "./proto-shared"` or no import at all.
   - Recommendation: The `emitImports` function in ts-poet groups imports by source. If no helpers from `proto-shared` are used, no import line is emitted. This is correct behavior — verify in output.

## Validation Architecture

> `workflow.nyquist_validation` not present in `.planning/config.json` — section included based on project test infrastructure.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.6.1 + ts-jest 29.3.4 |
| Config file | `jest.config.js` (root) |
| Quick run command | `yarn jest tests/import-injection-test.ts` |
| Full suite command | `yarn test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMP-01 | Generated file has imports from `proto-shared`, not inline declarations | unit | `yarn jest tests/import-injection-test.ts` | No — Wave 0 |
| IMP-02 | Import path is correct relative path based on file depth | unit | `yarn jest tests/import-injection-test.ts` | No — Wave 0 |
| IMP-03 | `importSuffix` is appended to `proto-shared` import path | unit | `yarn jest tests/import-injection-test.ts` | No — Wave 0 |
| COMPAT-01 | When `sharedHelpersFile=false`, output identical to current | unit | `yarn jest tests/` | Existing tests cover this |
| COMPAT-02 | All existing integration tests pass | integration | `yarn test` | All existing tests in `integration/` |

### Sampling Rate
- **Per task commit:** `yarn jest tests/import-injection-test.ts`
- **Per wave merge:** `yarn test` (all unit + integration tests)
- **Phase gate:** Full suite green; verify no integration test regressions

### Wave 0 Gaps
- [ ] `tests/import-injection-test.ts` — covers IMP-01, IMP-02, IMP-03

*(Existing test infrastructure is sufficient; no framework install or config changes needed. COMPAT-02 is covered by the existing integration test suite.)*

## Sources

### Primary (HIGH confidence)
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/Code.js` lines 59-94 — `deepFindAll` implementation; confirmed `conditionalUtils` causes `ConditionalOutput` → import conversion and suppresses `used[]` addition
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/Import.js` lines 324-343 — `maybeRelativePath` implementation; confirmed automatic relative path computation from `outputPath` and `importPath`
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/Code.d.ts` — `ToStringOpts.conditionalUtils` documented as "The file path (relative or absolute) to the utilities module from which all ConditionalOutput imports will be sourced"
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/ConditionalOutput.d.ts` — JSDoc confirming `conditionalUtils` behavior
- Direct reading of `/home/dan/projects/ts-proto/src/plugin.ts` — current structure confirmed; Phase 2 `proto-shared.ts` block already present; per-file toString() call identified for modification
- Direct reading of `/home/dan/projects/ts-proto/src/main.ts` lines 459-467 — `ifUsed` declarations pattern confirmed; no changes needed here
- Direct reading of `/home/dan/projects/ts-proto/src/utils.ts` lines 272-282 — `importSuffix` pattern confirmed (`impProto` appends `options.importSuffix` directly to import path string)
- Direct reading of `/home/dan/projects/ts-proto/src/options.ts` lines 366-395 — `getTsPoetOpts` signature and return type confirmed; no `conditionalUtils` currently present

### Secondary (MEDIUM confidence)
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/Import.js` lines 266-313 — `emitImports` full implementation; confirmed `maybeRelativePath` + `maybeAdjustExtension` pipeline
- Direct reading of `/home/dan/projects/ts-proto/integration/import-suffix/parameters.txt` and `child.pb.ts` — confirmed `importSuffix=.js` produces correct import patterns in existing code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; ts-poet `conditionalUtils` confirmed by reading implementation source
- Architecture: HIGH — implementation path confirmed by reading both ts-poet internals and ts-proto plugin.ts; the change is a single conditional assignment
- Pitfalls: HIGH — all pitfalls derived from code analysis (the shared-file toString issue, importSuffix requirement, typeRegistry contamination risk); not speculative

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (stable codebase; ts-poet 6.12.0 is a locked dependency)
