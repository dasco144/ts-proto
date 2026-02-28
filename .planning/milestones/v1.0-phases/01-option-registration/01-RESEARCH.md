# Phase 1: Option Registration - Research

**Researched:** 2026-02-27
**Domain:** TypeScript option parsing in a protoc plugin (ts-proto)
**Confidence:** HIGH

## Summary

Phase 1 is purely mechanical: add a `sharedHelpersFile` boolean field to the `Options` type in `src/options.ts`, set its default to `false` in `defaultOptions()`, and update the one inline snapshot test that enumerates every option. No other files need changing for this phase — the parser already accepts arbitrary key/value pairs without error, so `--ts_proto_opt=sharedHelpersFile=true` works at the protoc level today; the only gap is that the field is not typed in `Options` and therefore not safely accessible by code in later phases.

The entire change is two lines of production code (one in the type, one in the factory function) plus a snapshot update. There is no option validation in ts-proto that would reject unknown keys — `parseParameter` casts to `as any` and assigns anything it receives — so there is no "unknown-option error" from ts-proto's own code to worry about. The success criterion about not producing an unknown-option error refers to protoc's behavior, and protoc passes `--ts_proto_opt` values verbatim to the plugin without validating them.

Testing is via Jest with ts-jest (no separate build step needed for unit tests). The existing `tests/options-test.ts` file contains a `toMatchInlineSnapshot` that lists every field on the `Options` object; adding `sharedHelpersFile` will cause that snapshot to fail until it is updated with `jest --updateSnapshot` (or by editing the snapshot string manually).

**Primary recommendation:** Add `sharedHelpersFile: boolean` to the `Options` type and `sharedHelpersFile: false` to `defaultOptions()`, then update the inline snapshot in `tests/options-test.ts`. No other changes needed for this phase.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OPT-01 | `sharedHelpersFile` boolean option exists in `src/options.ts` with default `false` | Add to `Options` type and `defaultOptions()` factory — two-line change, fully typed, TypeScript enforces completeness |
| OPT-02 | Option can be passed via `--ts_proto_opt=sharedHelpersFile=true` and is correctly parsed | `parseParameter` already handles this without changes — it uses `as any` and assigns any key/value pair; verified by running the built plugin |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.3 | Type system for Options type | Already the project language; `strict: true` in tsconfig.json |
| Jest + ts-jest | jest ^29.6.1, ts-jest ^29.3.4 | Unit test framework | Already configured in jest.config.js and package.json |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jest --updateSnapshot` / `-u` | N/A (CLI flag) | Update inline snapshots after Options type changes | After adding any new field to Options — the `toMatchInlineSnapshot` in options-test.ts covers every field |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `boolean` type for `sharedHelpersFile` | `boolean | undefined` | Undefined complicates all usage sites; `false` default is the established pattern for every other boolean option in the file |

**Installation:** No new packages required.

## Architecture Patterns

### How Options Are Defined (confirmed by reading `src/options.ts`)

The `Options` type is a plain TypeScript `type` alias (not interface, not class):

```typescript
// src/options.ts - the pattern for ALL boolean options
export type Options = {
  // ...other fields...
  globalThisPolyfill: boolean;  // ← exact pattern to follow
  // ...
};
```

The factory function `defaultOptions()` returns a complete `Options` object literal — TypeScript strict mode enforces that every field in the type is present:

```typescript
export function defaultOptions(): Options {
  return {
    // ...every field must be listed here...
    globalThisPolyfill: false,  // ← follow this pattern
  };
}
```

The parser is completely permissive — unknown keys are silently accepted:

```typescript
// src/options.ts lines 331-358
function parseParameter(parameter: string): Options {
  const options = { M: {} } as any;  // ← 'as any' bypasses type checking
  parameter.split(",").forEach((param) => {
    const optionSeparatorPos = param.indexOf("=");
    const key = param.substring(0, optionSeparatorPos);
    const value = parseParamValue(param.substring(optionSeparatorPos + 1));
    // M-prefix handling omitted...
    } else if (options[key]) {
      options[key] = [options[key], value];  // repeated values become array
    } else {
      options[key] = value;  // any key is accepted silently
    }
  });
  return options;
}
```

`parseParamValue` converts `"true"` → `true`, `"false"` → `false`, anything else stays as string:

```typescript
function parseParamValue(value: string): string | boolean {
  return value === "true" ? true : value === "false" ? false : value;
}
```

So `sharedHelpersFile=true` will become the boolean `true` in the returned options object automatically — no special handling needed in `parseParameter`.

### How Options Flow Through the System

```
protoc --ts_proto_opt=sharedHelpersFile=true
  → CodeGeneratorRequest.parameter = "sharedHelpersFile=true"
  → optionsFromParameter(request.parameter)        [plugin.ts line 25]
  → parseParameter(parameter)                      [returns any-cast object]
  → Object.assign(options, parsed)                 [options.ts line 218-219]
  → options.sharedHelpersFile = true               [typed boolean, accessible everywhere]
  → ctx.options flows into generateFile and all helpers
```

`optionsFromParameter` in `src/options.ts` (lines 211-328) is the only transformation point. After adding `sharedHelpersFile: false` to `defaultOptions()`, the `Object.assign` on line 218 will correctly override it when the user passes the flag.

### How Tests Are Structured

Unit tests live in `tests/` and use `*-test.ts` naming. The critical file is `tests/options-test.ts`.

The first test uses `toMatchInlineSnapshot` which serializes the ENTIRE Options object. Adding a new field WILL break this test until the snapshot is updated:

```typescript
// tests/options-test.ts
it("can set outputJsonMethods with nestJs=true", () => {
  expect(optionsFromParameter("nestJs=true,outputJsonMethods=true")).toMatchInlineSnapshot(`
    {
      "M": {},
      // ... every Options field listed alphabetically ...
      "globalThisPolyfill": false,
      // sharedHelpersFile: false  ← must appear here after the change
    }
  `);
});
```

Update command: `yarn jest tests/options-test.ts --updateSnapshot`

Integration tests live in `integration/*/` directories. Each has:
- A `.proto` file
- Generated `.ts` file(s) (snapshot artifacts committed to git)
- A `*-test.ts` file (the actual test)
- Optional `parameters.txt` (options to pass to `--ts_proto_opt`)

Integration tests are generated by running `protoc` via Docker (`yarn proto2ts`). Phase 1 does NOT require a new integration test — that is scoped to Phase 4 per REQUIREMENTS.md.

### Anti-Patterns to Avoid
- **Adding logic to `optionsFromParameter` for this phase:** The boolean flag needs no special coercion — `parseParamValue` already handles `"true"` → `true`. Only options with complex types (arrays, enums, legacy boolean-as-string) need special handling.
- **Adding `sharedHelpersFile` to `nestJsOptions` partial:** There is no reason NestJS should default-override this flag; leave it out of `nestJsOptions`.
- **Gating any generation logic in this phase:** Phase 1 is purely registration. The condition `if (options.sharedHelpersFile)` belongs in Phases 2 and 3.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Option parsing | Custom key validation | The existing `parseParameter` function | It already handles all edge cases (M-prefix, repeated values, boolean coercion) |
| Snapshot updating | Manually editing the snapshot string | `yarn jest --updateSnapshot` | Jest handles inline snapshot formatting/ordering automatically |

**Key insight:** The permissive `as any` cast in `parseParameter` means that technically `sharedHelpersFile=true` already "works" at the parsing level before any code changes — the option just silently becomes a dynamic property. The type system change is what makes it safe for later phases to access `options.sharedHelpersFile` without TypeScript errors.

## Common Pitfalls

### Pitfall 1: Forgetting the Inline Snapshot Update
**What goes wrong:** Adding `sharedHelpersFile` to `Options` and `defaultOptions()` causes the `toMatchInlineSnapshot` test to fail with a diff showing the new field is present in the snapshot output but not in the expected string.
**Why it happens:** `toMatchInlineSnapshot` is a comprehensive snapshot — it captures every enumerable property of the returned object in alphabetical order.
**How to avoid:** Run `yarn jest tests/options-test.ts --updateSnapshot` immediately after changing `options.ts`, then review the diff before committing.
**Warning signs:** Test output shows `- Snapshot / + Received` with `sharedHelpersFile` appearing in the `+` section.

### Pitfall 2: TypeScript Strictness on `defaultOptions()` Return Value
**What goes wrong:** If `sharedHelpersFile` is added to the `Options` type but NOT to the `defaultOptions()` return object, TypeScript compilation fails because `defaultOptions(): Options` must return a complete object.
**Why it happens:** The project uses `"strict": true` in `tsconfig.json`. The `Options` type has no optional fields (no `?`) — every field is required.
**How to avoid:** Add `sharedHelpersFile: false` to the `defaultOptions()` return object in the same commit.
**Warning signs:** `yarn tsc --noEmit` reports "Property 'sharedHelpersFile' is missing in type '{ ... }' but required in type 'Options'."

### Pitfall 3: Using `undefined` Instead of `false` as Default
**What goes wrong:** Using `sharedHelpersFile: undefined` or making the field optional (`sharedHelpersFile?: boolean`) would diverge from the established pattern and require downstream code to handle `undefined` in addition to `false`.
**Why it happens:** Temptation to use `undefined` as a "not set" sentinel.
**How to avoid:** Follow the exact pattern of every other boolean option in the codebase: required field in type, `false` in `defaultOptions()`.

### Pitfall 4: Assuming `parseParameter` Validates Unknown Keys
**What goes wrong:** Believing that passing an unrecognized option to `--ts_proto_opt` produces an error from ts-proto. It does not — the plugin silently accepts it.
**Why it happens:** Confusion between protoc's validation (none for plugin opts) and ts-proto's validation (also none).
**How to avoid:** Understand that the "unknown-option error" in the success criteria is prevented by ts-proto's permissive parser, not by any validation logic. The typed field in `Options` is for correctness and later-phase access, not for error suppression.

## Code Examples

Verified patterns from reading `src/options.ts` directly:

### Adding a Boolean Option (following the `outputIndex` pattern)

Step 1 — Add to `Options` type:
```typescript
// src/options.ts — in the Options type alias
export type Options = {
  // ... existing fields ...
  outputIndex: boolean;       // ← existing boolean example
  sharedHelpersFile: boolean; // ← add this line
  // ... rest of fields ...
};
```

Step 2 — Add to `defaultOptions()`:
```typescript
// src/options.ts — in the defaultOptions() function
export function defaultOptions(): Options {
  return {
    // ... existing fields ...
    outputIndex: false,       // ← existing example
    sharedHelpersFile: false, // ← add this line
    // ... rest of fields ...
  };
}
```

Step 3 — Update inline snapshot in `tests/options-test.ts`:
```bash
yarn jest tests/options-test.ts --updateSnapshot
```

The snapshot will gain a line like:
```
"sharedHelpersFile": false,
```
(alphabetically ordered between "returnObservable" and "snakeToCamel")

### Verifying the Option Is Parsed (no code change needed)
```typescript
// This already works without any change to parseParameter:
const opts = optionsFromParameter("sharedHelpersFile=true");
// opts.sharedHelpersFile === true  (after adding the typed field)

const opts2 = optionsFromParameter("");
// opts2.sharedHelpersFile === false  (from defaultOptions())
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | Options type is a plain TS `type`, factory function, permissive parser | Established pattern throughout project | Well-understood — no surprises for this phase |

**No deprecated patterns in scope for this phase.**

## Open Questions

1. **Does the inline snapshot test need to be updated manually or via `--updateSnapshot`?**
   - What we know: Jest `toMatchInlineSnapshot` updates the source file in place when run with `--updateSnapshot`. This requires the test runner to have write access to `tests/options-test.ts`.
   - What's unclear: Whether the CI/CD environment runs with `--updateSnapshot` or expects the snapshot to be committed in advance.
   - Recommendation: Update the snapshot as part of the implementation commit — run `yarn jest tests/options-test.ts --updateSnapshot`, review the diff, commit the updated test file alongside `src/options.ts`.

2. **Should `sharedHelpersFile` appear in the README options table?**
   - What we know: `README.markdown` documents all `--ts_proto_opt` options. The requirements (OPT-01, OPT-02) don't mention README updates.
   - What's unclear: Whether Phase 4 or a separate task covers documentation.
   - Recommendation: Out of scope for Phase 1; flag for the final phase.

## Sources

### Primary (HIGH confidence)
- Direct code reading of `/home/dan/projects/ts-proto/src/options.ts` — complete understanding of Options type, defaultOptions(), parseParameter(), optionsFromParameter()
- Direct code reading of `/home/dan/projects/ts-proto/tests/options-test.ts` — inline snapshot test structure and all existing test patterns
- Direct code reading of `/home/dan/projects/ts-proto/src/plugin.ts` — how options flow from CodeGeneratorRequest to the generator
- Direct code reading of `/home/dan/projects/ts-proto/jest.config.js` — test runner configuration (ts-jest, no build needed)
- Direct code reading of `/home/dan/projects/ts-proto/tsconfig.json` — strict TypeScript mode confirmed
- Runtime verification: `node -e "require('./build/src/options').optionsFromParameter('sharedHelpersFile=true')"` confirms boolean `true` is parsed without error

### Secondary (MEDIUM confidence)
- `integration/update-code.sh` read to understand how parameters.txt is used in integration tests — confirms no integration test changes needed for Phase 1

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed by direct code reading and running tests
- Architecture: HIGH — confirmed by direct code reading; no external dependencies
- Pitfalls: HIGH — the snapshot pitfall was verified by understanding the exact test structure

**Research date:** 2026-02-27
**Valid until:** 2026-04-28 (stable codebase with no fast-moving dependencies in scope)
