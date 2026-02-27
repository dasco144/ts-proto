# External Integrations

**Analysis Date:** 2026-02-27

## APIs & External Services

**Protocol Buffers Compiler (protoc):**
- protoc - Google's Protocol Buffer compiler
  - Integration: ts-proto acts as a plugin for protoc via the protoc plugin protocol
  - Input format: `.proto` files (Protocol Buffer schema language)
  - Invoked via: `protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=.`
  - Plugin communication: stdin/stdout using CodeGeneratorRequest/CodeGeneratorResponse messages
  - SDK/Client: ts-proto-descriptors (wraps protobuf descriptor protos)

## RPC & Service Generation

**gRPC (grpc-js):**
- SDK/Client: @grpc/grpc-js (1.8.17), @grpc/proto-loader (0.7.8)
- Purpose: Generates gRPC service clients and server implementations
- Uses: `src/generate-grpc-js.ts` for grpc-js service generation
- Service option: `--ts_proto_opt=outputServices=grpc-js`

**gRPC-Web:**
- SDK/Client: @improbable-eng/grpc-web (0.14.1), @improbable-eng/grpc-web-node-http-transport (0.14.1)
- Purpose: Browser-compatible gRPC implementation
- Uses: `src/generate-grpc-web.ts` for client and service descriptor generation
- Service option: `--ts_proto_opt=outputServices=grpc-web`
- Depends on: browser-headers package (imported as `BrowserHeaders@browser-headers`)

**nice-grpc:**
- SDK/Client: nice-grpc (2.1.4)
- Purpose: Alternative gRPC implementation with more idiomatic TypeScript
- Uses: `src/generate-nice-grpc.ts` for service generation
- Service option: `--ts_proto_opt=outputServices=nice-grpc`

**NestJS:**
- SDK/Client: @nestjs/common, @nestjs/core, @nestjs/microservices (9.4.3)
- Purpose: Generates NestJS service controllers and clients
- Uses: `src/generate-nestjs.ts` for controller and decorator generation
- Service option: `--ts_proto_opt=outputServices=generic-definitions` (for NestJS)
- Documentation: `NESTJS.markdown`

**Generic Service Definitions:**
- Purpose: Generates abstract service interfaces without RPC framework coupling
- Uses: `src/generate-generic-service-definition.ts`
- Service option: `--ts_proto_opt=outputServices=generic-definitions`

## Data Storage

**MongoDB:**
- Database Type: MongoDB (via driver)
- Client: mongodb (5.7.0)
- Special Support: Custom ObjectId type mapping
- Usage: If `--ts_proto_opt=useMongoObjectId=true` is set
- Implementation: `src/main.ts` generates conversion functions:
  - `fromProtoObjectId(oid: ObjectId): mongodb.ObjectId`
  - `fromJsonObjectId(o: any): mongodb.ObjectId`
  - `toProtoObjectId(oid: mongodb.ObjectId): ObjectId`
- Allows seamless use of MongoDB ObjectId in generated protobuf messages

**File Storage:**
- Not applicable - ts-proto is a code generator, not a runtime application
- Generated code may interact with file storage based on user implementation

**Caching:**
- Dataloader (2.2.2) - Batch loading and caching utility
- Purpose: N+1 prevention in RPC service implementations
- Auto-batching feature: `src/generate-services.ts` generates dataloader types

## Authentication & Identity

**Auth Provider:**
- None built-in - ts-proto does not implement authentication
- Generated code can work with any auth system (OAuth2, JWT, API keys, etc.)
- NestJS integration supports NestJS auth decorators and guards

**Metadata Handling:**
- reflect-metadata (0.1.13) - Enables metadata reflection for decorators
- Used for NestJS integration to support decorator-based service generation

## Monitoring & Observability

**Error Tracking:**
- None - ts-proto is a build-time tool

**Logs:**
- No integration with external logging services
- Generated code uses console methods for optional logging

**RxJS Integration:**
- rxjs (7.8.1) - Reactive extensions library
- Usage: Observable-based responses in gRPC client implementations
- Used in `src/generate-grpc-web.ts` and `src/generate-services.ts`
- Operators: `share`, `take` imported from rxjs/operators

## CI/CD & Deployment

**Hosting:**
- NPM Registry - Primary distribution channel
- GitHub - Source repository (github:stephenh/ts-proto)

**CI Pipeline:**
- GitHub Actions (via `.github/workflows/`)
- Semantic Release integration:
  - @semantic-release/github (12.0.2) - Creates GitHub releases
  - @semantic-release/npm (13.1.3) - Publishes to NPM
  - @semantic-release/git (10.0.1) - Updates git repository
  - @semantic-release/changelog (6.0.3) - Generates CHANGELOG.md
- Commit analysis: conventional-changelog-conventionalcommits (8.0.0)

**Release Configuration:**
- Config file: `release.config.js`
- Branches: main, alpha (prerelease)
- Preset: conventionalcommits
- Output: Version bumps published to NPM and GitHub

## Environment Configuration

**Required Environment Variables:**
- None for the plugin itself
- Generated code may require environment variables based on implementation

**Configuration Method:**
- Options passed via protoc command-line: `--ts_proto_opt=key=value`
- Parsed in: `src/options.ts`
- Options structure defined in: Type `Options`

**Common Configuration Options:**
- `snakeToCamel`: ["json" | "keys"] - Case conversion
- `useDate`: "date" | "string" | "string-nano" | "temporal" | "timestamp" - Date handling
- `useOptionals`: boolean | "none" | "deprecatedOnly" | "messages" | "all" - Optional field generation
- `outputServices`: "grpc-js" | "nice-grpc" | "generic-definitions" | "default" | "none" - Service generation
- `useMongoObjectId`: boolean - MongoDB ObjectId support
- `env`: "node" | "browser" | "both" - Target environment
- `oneof`: "properties" | "unions" | "unions-value" - OneOf field handling
- `outputEncodeIncludeTypes`, `outputDecodeIncludeTypes` - Type filtering

## Webhooks & Callbacks

**Incoming:**
- None - ts-proto is not a server

**Outgoing:**
- None - ts-proto generates code; runtime behavior depends on generated code
- Semantic Release integration may trigger GitHub webhooks during release

## Code Generation Input

**Proto File Locations:**
- Source: `protos/` directory
- Contains: `google/` subdirectory with well-known type descriptors
- Built-in descriptors: Generated from `ts-proto-descriptors` package

**Integration Test Fixtures:**
- Location: `integration/` directory (159 test subdirectories)
- Purpose: Validate code generation for various combinations of options and input types
- Includes examples for:
  - grpc-js
  - grpc-web
  - nice-grpc
  - NestJS
  - Angular
  - Simple ESM and CommonJS patterns

## Third-Party Proto File Support

**Well-Known Types:**
- google.protobuf.Timestamp - Date/time handling
- google.protobuf.Duration - Duration handling
- google.protobuf.Struct - JSON object mapping
- google.protobuf.Wrapper types - Scalar wrappers
- google.protobuf.Any - Type-erased messages

**External Proto Files:**
- ts-proto supports importing external `.proto` files via standard protobuf syntax
- Handles type resolution across file boundaries
- `emitImportedFiles` option controls whether to generate code for imported files

---

*Integration audit: 2026-02-27*
