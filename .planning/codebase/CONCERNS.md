# Technical Concerns

**Analysis Date:** 2026-02-27

## Technical Debt

### Monolithic `src/main.ts` (3054 lines)
**Severity:** High
**Location:** `src/main.ts`
- Single file handles all message, field, and type generation
- Multiple distinct responsibilities mixed together (messages, maps, oneofs, defaults, well-known types)
- Difficult to navigate and understand in isolation
- **Risk:** Changes have broad blast radius; hard to test individual units

### Pervasive `as any` Type Assertions
**Severity:** Medium
**Location:** Throughout `src/main.ts`, `src/types.ts`
- ~116 instances of `as any` bypassing type safety
- Common pattern: `(someValue as any).property`
- Root cause: ts-proto-descriptors types don't fully represent all runtime shapes
- **Risk:** Silent type errors in edge cases

### Unsafe Type Coercion in Options Parsing
**Severity:** Medium
**Location:** `src/options.ts`
- Options parsed from raw string key=value pairs with minimal validation
- Some options accept multiple types (string | boolean) with runtime branching
- **Risk:** Invalid option combinations can produce subtly wrong output without clear errors

### Code Duplication in Type Handling
**Severity:** Medium
**Location:** `src/types.ts`, `src/main.ts`
- Map type value conversion logic appears in multiple places
- Type name resolution partially duplicated between `basicTypeName()` and inline code in `main.ts`
- **Risk:** Divergent behavior when fixing bugs (may fix in one place, miss another)

### TODO Comments
**Severity:** Low-Medium
**Location:** Various
- Several unresolved TODOs in `src/main.ts` around type coercion and edge cases
- Some TODOs reference proto2 vs proto3 differences that need reconciliation

---

## Known Bugs / Missing Features

### Client Streaming Not Supported (gRPC-Web)
**Severity:** High
**Location:** `src/generate-grpc-web.ts:64`
```typescript
throw new Error("Client streaming is not supported by gRPC-Web");
```
- Client-side streaming RPCs with gRPC-Web throw at runtime
- Documented limitation but surfaces as runtime error, not compile-time

### Enum Type Inference in Batch Methods
**Severity:** Medium
**Location:** `src/generate-services.ts`
- Batch method detection uses heuristics that may fail for edge-case enum field names
- Can produce incorrect DataLoader signatures in rare naming scenarios

### Incomplete Bytes Default Checking
**Severity:** Low
**Location:** `src/main.ts`
- Bytes fields default value handling has conditional gaps between proto2/proto3 semantics

---

## Performance Concerns

### No Type Resolution Caching
**Severity:** Medium
**Location:** `src/types.ts` — `createTypeMap()`
- Type map rebuilt on each file generation pass
- For large proto schemas with many files, this could be expensive
- **Impact:** Slower generation for large codebases (100+ proto files)

### Unoptimized Type Map Lookups
**Severity:** Low
**Location:** `src/main.ts`
- Some type lookups iterate through the type map rather than using direct key access
- Acceptable for typical proto sizes but could degrade at scale

---

## Security Concerns

### Input Validation
**Severity:** Low-Medium
**Location:** `src/options.ts`, `src/plugin.ts`
- Plugin accepts arbitrary `--ts_proto_opt` parameters without strict validation
- Malformed option strings can produce unexpected (but not dangerous) behavior
- **Context:** This is a build-time tool, not a runtime service — security impact is limited

### Code Injection via Comments
**Severity:** Low
**Location:** `src/sourceInfo.ts`
- Proto source comments forwarded directly into generated TypeScript comments
- Comments are not escaped/sanitized
- **Risk:** Malicious proto files could inject unexpected content into generated code

### Unsafe Type Casting
**Severity:** Low
**Location:** Throughout codebase
- `as any` and `as TypeName` casts bypass TypeScript checks
- Could mask runtime errors in unusual proto configurations

---

## Fragile Areas

### Oneof Handling
**Severity:** High fragility
**Location:** `src/main.ts`, `src/options.ts`
- Two oneof modes (`properties` and `unions`) with significantly different output
- Mode-specific code paths scattered across `main.ts`
- Proto2 vs proto3 semantics differ — conditional branching extensive
- **Risk:** Oneof changes likely to have unexpected side effects

### Proto2 vs Proto3 Differences
**Severity:** High fragility
**Location:** Throughout `src/main.ts`, `src/context.ts`
- `isProto3Syntax` flag checked in dozens of places
- Editions support (`isEdition`) adds a third dimension
- Default value handling, required fields, optional semantics all branch on this
- **Risk:** Additions that don't account for all three modes produce inconsistent output

### Map Type Value Conversion
**Severity:** Medium fragility
**Location:** `src/main.ts`
- Map field handling has complex type coercion for key/value types
- Edge cases around message types as map values
- **Risk:** Adding new field types may silently break map generation

### Option Interaction Effects
**Severity:** Medium fragility
**Location:** `src/options.ts`, `src/main.ts`
- 50+ options with complex interdependencies (some combinations illegal, some override others)
- `nestJs=true` silently overrides multiple other options
- **Risk:** New options may interact with existing ones in non-obvious ways

---

## Test Coverage Gaps

- Only 6 unit test files for 22 source files
- No tests for `generate-grpc-web.ts`, `generate-nestjs.ts`, `generate-nice-grpc.ts` at unit level
- Error path testing minimal (invalid protos, bad option combinations)
- No tests for `encode.ts`, `schema.ts`, `sourceInfo.ts`
- Browser environment testing absent (only `testEnvironment: "node"`)
- Proto Editions format testing limited

---

*Concerns analysis: 2026-02-27*
