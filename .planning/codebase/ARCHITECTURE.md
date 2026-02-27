# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview

**Overall:** Protobuf Code Generator Plugin - Compiler-driven generation pattern

ts-proto is a protoc (Protocol Buffer compiler) plugin that transforms `.proto` protocol buffer definitions into TypeScript code. It follows the standard protoc plugin architecture where:

1. protoc reads `.proto` files and creates a `CodeGeneratorRequest` in binary format
2. ts-proto receives this request via stdin
3. ts-proto generates TypeScript code and writes a `CodeGeneratorResponse` to stdout
4. protoc writes the generated files to disk

**Key Characteristics:**
- Single-pass generation from proto descriptors to TypeScript AST
- Heavily descriptor-driven (interprets protobuf metadata structures)
- Multiple configurable output targets (gRPC, NestJS, gRPC-web, generic services, etc.)
- Code generation via `ts-poet` library for AST-based output formatting
- Recursive message/enum traversal with support for nested types

## Layers

**Entry Point & Request Handling:**
- Purpose: Receives protoc requests, parses options, orchestrates file generation
- Location: `src/plugin.ts`
- Contains: Plugin main entry point, request deserialization, response serialization
- Depends on: `src/main.ts` (generateFile), `src/context.ts` (context creation), `src/utils.ts` (file I/O)
- Used by: Node.js process invoked by protoc

**Configuration & Options:**
- Purpose: Defines all generation options (feature flags, formatting choices, encoding methods)
- Location: `src/options.ts`
- Contains: `Options` type, enums like `LongOption`, `DateOption`, `ServiceOption`, `OneofOption`
- Depends on: ts-poet types
- Used by: All generation modules to decide what code to emit

**Type Analysis & Utilities:**
- Purpose: Analyzes proto descriptors to determine TypeScript type equivalents
- Location: `src/types.ts` (main), `src/case.ts` (naming), `src/utils.ts` (helpers)
- Contains: Type predicates (isMessage, isEnum, isLong), type name resolution, wire type constants, field name/json name extraction
- Depends on: ts-proto-descriptors (protobuf metadata)
- Used by: All generation modules

**Context Management:**
- Purpose: Passes configuration and utilities through generation call chain
- Location: `src/context.ts`
- Contains: `BaseContext` (options, typeMap, utils), `Context` (adds currentFile), `FileContext` (proto version info)
- Depends on: options, types
- Used by: All generate* functions

**Code Generation - Main Message/Type Generation:**
- Purpose: Generates interfaces, encode/decode methods, JSON serialization for messages and enums
- Location: `src/main.ts` (orchestration), `src/enums.ts` (enums), `src/schema.ts` (protobuf schema output)
- Contains: `generateFile()` (main entry), message interface generation, field code generation, validation logic
- Depends on: Visit pattern, type analysis, all specialized generators
- Used by: plugin.ts

**Code Generation - Specialized Modules:**
- Location: Multiple generate-*.ts files
- Services: `src/generate-services.ts` - Base service interfaces, client impls, RPC types
- gRPC-JS: `src/generate-grpc-js.ts` - gRPC-JS specific service generation
- gRPC-web: `src/generate-grpc-web.ts` - gRPC-web client and service descriptors
- NestJS: `src/generate-nestjs.ts` - NestJS service controllers and clients
- Nice-gRPC: `src/generate-nice-grpc.ts` - Nice-gRPC service generation
- Generic: `src/generate-generic-service-definition.ts` - Framework-agnostic RPC interface
- Wrappers: `src/generate-struct-wrappers.ts` - Struct/Value/wrapper type conversion methods
- Async: `src/generate-async-iterable.ts` - Streaming encode/decode transforms
- Type Registry: `src/generate-type-registry.ts` - Message type registry for reflection

**Proto Descriptor Traversal:**
- Purpose: Visits messages and enums in proto files, handles nested types
- Location: `src/visit.ts`
- Contains: `visit()` (recursive message traversal), `visitServices()` (service traversal)
- Depends on: Proto descriptors, options (for naming transforms)
- Used by: main.ts, schema.ts, other generators

**Source Info & Comments:**
- Purpose: Extracts location/comment information from proto source for documentation
- Location: `src/sourceInfo.ts`
- Contains: SourceInfo class, Fields enum for path indexing
- Depends on: Proto descriptors
- Used by: main.ts, all generators for JSDoc comments

**Encoding & Special Types:**
- Purpose: Handles JSON/protobuf encoding for special types (Timestamp, Struct, wrapper types)
- Location: `src/encode.ts`
- Contains: `generateEncoder()`, `generateDecoder()` for wrapper types
- Depends on: Type analysis, context
- Used by: main.ts for message encoding logic

**Utilities & Helpers:**
- Purpose: Common functions for code generation and proto manipulation
- Location: `src/utils.ts`
- Contains: Import generation, field/method descriptor formatting, null/undefined checks, comment sanitization, index file generation
- Depends on: ts-poet, options
- Used by: All other modules

## Data Flow

**Proto Compilation Request:**

1. protoc invokes ts-proto plugin binary with serialized `CodeGeneratorRequest`
2. `src/plugin.ts` main() reads stdin, deserializes request
3. Options extracted from request.parameter string via `optionsFromParameter()`
4. TypeMap built via `createTypeMap()` scanning all proto files
5. Utils created via `makeUtils()` with option-specific helper functions

**File Generation:**

1. For each file in `fileToGenerate`:
   - Create FileContext with proto version info via `createFileContext()`
   - Call `generateFile(context, fileDesc)` from `src/main.ts`
   - Returns [filepath, Code] tuple

2. Inside `generateFile()`:
   - Create SourceInfo from file descriptor for comment locations
   - Call `visit()` to recursively traverse messages → generate interfaces for each
   - Call `visitServices()` to traverse services → generate service interfaces/clients
   - Conditionally generate: enums, encode/decode methods, JSON methods, schema definitions
   - Accumulate all Code chunks into single file Code object
   - Convert Code to string via ts-poet with `getTsPoetOpts()`

3. Special handling:
   - If outputTypeRegistry: generate typeRegistry.ts
   - If outputIndex: generate barrel index files for packages
   - Nested types handled recursively in visit() with naming adjustments

**Output Serialization:**

1. All generated [path, content] files collected
2. Assembled into CodeGeneratorResponse with feature flags
3. Encoded to buffer via protobuf
4. Written to stdout for protoc to handle

**State Management:**

- No runtime state - pure functional transformation
- TypeMap is immutable lookup built at start
- Context object threaded through all generation functions
- Proto descriptor modifications (method formatting) done in-place during generation phase

## Key Abstractions

**Code Generation via ts-poet:**
- Purpose: Deferred code emission with proper formatting/imports
- Examples: `src/main.ts`, `src/generate-services.ts`, `src/enums.ts`
- Pattern: `Code` objects accumulated in arrays, joined with `joinCode()`, finally converted to string with formatting options
- Allows building complex nested code structures with automatic import deduplication

**Type Predicates & Resolution:**
- Purpose: Determine TypeScript equivalents for proto types
- Examples: `isLong()`, `isMessage()`, `isEnum()`, `basicTypeName()`, `toTypeName()`
- Pattern: Query proto descriptor to classify field/message type, use options to customize output type
- Enables option-driven type representation (e.g., long as number/string/bigint)

**DescriptorProto Analysis:**
- Purpose: Examine proto metadata to generate correct code
- Pattern: Access `.field`, `.nestedType`, `.enumType`, `.method` arrays, inspect field `.type`, `.label`, `.number`
- Used to determine message layout, presence semantics, streaming vs unary RPCs

**Context Threading:**
- Purpose: Avoid parameter explosion by grouping related data
- Pattern: BaseContext (immutable config), Context (adds currentFile), specialized contexts created as needed
- Enables clean function signatures while preserving all necessary generation context

**Service Specialization:**
- Purpose: Different RPC frameworks need different generated code
- Pattern: `options.outputClientImpl` selects which generator to invoke (grpc-js, nice-grpc, grpc-web, etc.)
- Each generator extends base service interface with framework-specific client/server code

## Entry Points

**Plugin Binary Entry:**
- Location: `src/plugin.ts` - `main()` function
- Triggers: protoc command-line invocation
- Responsibilities: Read stdin, deserialize request, coordinate generation, serialize response, write stdout

**File Generation Entry:**
- Location: `src/main.ts` - `generateFile()` function
- Triggers: Called once per .proto file to generate
- Responsibilities: Orchestrate message/enum/service generation, accumulate all code chunks, format output

**Service-Specific Generators:**
- Locations: `src/generate-services.ts`, `src/generate-grpc-js.ts`, etc.
- Triggers: Called conditionally based on options.outputClientImpl and other service flags
- Responsibilities: Generate framework-specific RPC code

## Error Handling

**Strategy:** Early validation with clear error messages, fail fast on invalid proto descriptors

**Patterns:**
- `fail(message)` in `src/utils.ts` throws descriptive errors
- Type analysis validates proto structure matches expectations
- Comments sanitized to remove harmful `*/` patterns before embedding in JSDoc
- Unrecognized enum values handled gracefully with fallback behavior
- Unsupported type combinations rejected with helpful error messages

## Cross-Cutting Concerns

**Logging:** Console.warn() for deprecated option usage in `src/main.ts`

**Validation:**
- Type name uniqueness (checks for Date/Function conflicts)
- Message field presence rules based on proto2 vs proto3 syntax
- Wire type compatibility for packed fields
- Streaming RPC method validation

**Naming Conventions:**
- Proto snake_case to camelCase conversion via `maybeSnakeToCamel()` in `src/case.ts`
- Package names preserved in generated types via `maybePrefixPackage()`
- Field JSON names extracted via `getFieldJsonName()` for JSON methods
- Service name formatting via `FormattedMethodDescriptor`

**Comments & Documentation:**
- Proto source comments extracted via SourceInfo.lookup()
- Embedded as JSDoc in generated TypeScript
- Sanitized to remove `*/` patterns that would break comment blocks

**Import Management:**
- Centralized via `ts-poet` imp() calls
- Path aliases resolved based on options.importSuffix, options.fileSuffix
- Module resolution for proto file dependencies
- Barrel files generated for package organization

---

*Architecture analysis: 2026-02-27*
