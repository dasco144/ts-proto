# Features Research: ts-proto sharedHelpersFile

**Research Type:** Features dimension — what goes in proto-shared.ts
**Date:** 2026-02-27
**Confidence:** HIGH (verified by direct source + integration test inspection)

---

## Summary

There are ~27 distinct conditional outputs emitted as "helpers" in generated files via ts-poet's `conditionalOutput` mechanism — each is only emitted if referenced within that file. When moving to a shared file, the file must declare all helpers that _could_ be used by any generated file in the run.

---

## Complete Helpers Inventory

| Helper | Kind | Always Emitted? | Key Option Gate | Safe for shared file? |
|--------|------|-----------------|-----------------|----------------------|
| `Builtin` | type | Yes (body varies) | `forceLong`, `useDate` affect body | YES |
| `KeysOfUnion<T>` | type (inside Exact) | With Exact | `useExactTypes` | YES |
| `DeepPartial<T>` | type | Yes (body varies) | `oneof`, `forceLong` affect body | YES |
| `Exact<P, I>` | type | Default yes | `useExactTypes=false` omits it | YES |
| `isSet` | function | Yes | none | YES |
| `isObject` | function | When map or Struct fields present | Map/Struct proto content | YES |
| `MessageFns<T>` | interface | Yes (body varies) | `outputEncodeMethods`, `outputJsonMethods`, etc. affect members | YES |
| `bytesFromBase64` | function | When bytes fields + JSON | `env` affects body | YES |
| `base64FromBytes` | function | When bytes fields + JSON | `env` affects body | YES |
| `gt` (globalThis polyfill) | const (IIFE) | `globalThisPolyfill=true` | `globalThisPolyfill` | YES |
| `longToNumber` | function | When int64 as number | `forceLong` | YES |
| `numberToLong` | function | `forceLong=long` | `forceLong` | YES |
| `toTimestamp` | function | When Timestamp fields | `useDate` (4 code variants) | YES |
| `fromTimestamp` | function | When Timestamp fields | `useDate` (4 code variants) | YES |
| `fromJsonTimestamp` | function | When Timestamp+JSON | `useDate` (3 code variants) | YES |
| `Extension<T>` | interface | `outputExtensions=true` | `outputExtensions` | YES |
| `ExtensionFns<T>` | interface | extensions + unknownFields | `outputExtensions`, `unknownFields` | YES |
| `ExtensionHolder<T,V>` | type | extensions present | `outputExtensions` | YES |
| `ServerStreamingMethodResult<Response>` | type | nice-grpc server-stream | `outputServices=nice-grpc` | YES |
| `GrpcWebError` | class | grpc-web client | `outputClientImpl=grpc-web` | Possible (needs grpc-web import) |
| `fail` | function | context option or outputExtensions | `context`, `outputExtensions` | YES |
| `fromProtoObjectId` | function | `useMongoObjectId=true` | `useMongoObjectId` | **NO** — references generated ObjectId type |
| `fromJsonObjectId` | function | `useMongoObjectId=true` | `useMongoObjectId` | **NO** — references generated ObjectId type |
| `toProtoObjectId` | function | `useMongoObjectId=true` | `useMongoObjectId` | **NO** — references generated ObjectId type |
| `StructWrapperFns` | interface | Struct proto present | proto content | **NO** — references Struct type |
| `AnyValueWrapperFns` | interface | Value proto present | proto content | **NO** — references Value type |
| `ListValueWrapperFns` | interface | ListValue proto present | proto content | **NO** — references ListValue type |
| `FieldMaskWrapperFns` | interface | FieldMask proto present | proto content | **NO** — references FieldMask type |

---

## Categories

### Table Stakes (Safe for shared file — YES)

All helpers where `Safe for shared file? = YES` above. These are either:
- Pure type/function definitions with no reference to user-generated types
- Option-dependent variants where the option is a project-level constant (same for all files in a run)

**Critical:** The `gt` (globalThis polyfill) IIFE must be emitted first if `globalThisPolyfill=true` — other helpers that reference `globalThis` use `gt` instead.

### Cannot Move to Shared File (Safe = NO)

Four categories of helpers reference types that are generated from the user's proto definitions:
1. **MongoDB ObjectId helpers** — `fromProtoObjectId`, `fromJsonObjectId`, `toProtoObjectId` reference the generated `ObjectId` proto message type
2. **Struct wrapper interfaces** — `StructWrapperFns`, `AnyValueWrapperFns`, `ListValueWrapperFns`, `FieldMaskWrapperFns` reference generated message types

These must continue to be inlined in the files that use them, even when `sharedHelpersFile=true`.

---

## Conditional vs Always-Emitted

### Always emitted (under default options)
- `Builtin`, `DeepPartial`, `Exact`, `isSet`, `MessageFns`

### Conditionally emitted (option or content gates)
- Everything else — emitted only when needed (see option gates column)

---

## Key Finding: conditionalOutput Mechanism

ts-poet's `conditionalOutput` emits a helper only if it's **referenced within that specific file**. When moving to a shared file:

- The shared file must declare all helpers that _could_ be used across the entire generation run
- The implementation must collect all conditional outputs that fire across ALL files in the run
- Per-file logic becomes: "does this generation run have options that would trigger this helper?" rather than "does this specific file reference it?"

---

## exportCommonSymbols Interaction

The `exportCommonSymbols` option controls whether `DeepPartial`/`Exact` use `export type` vs `type`. In the shared file, these **must always be exported** (since other files import them).

---

*Research date: 2026-02-27*
