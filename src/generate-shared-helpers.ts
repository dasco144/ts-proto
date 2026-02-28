import { Code, generateConditionalsUtils } from "ts-poet";
import { ConditionalOutput } from "ts-poet/build/ConditionalOutput";
import { makeUtils } from "./main";
import { Options } from "./options";

/**
 * Generates the Code value for proto-shared.ts — a file containing all helpers
 * that are safe to share across generated files (i.e., don't reference user-generated types).
 *
 * Satisfies:
 *   GEN-02: All movable helpers included
 *   GEN-03: All declarations use `export` regardless of exportCommonSymbols option
 *   GEN-04: globalThisPolyfill (gt IIFE) appears first when enabled
 *   GEN-05: Helpers referencing user-generated types are excluded
 */
export function generateSharedHelpers(options: Options): Code {
  // GEN-03: Force exportCommonSymbols=true to ensure all declarations use `export`.
  // This only applies inside generateSharedHelpers — per-file generation uses original options.
  const utils = makeUtils({ ...options, exportCommonSymbols: true });

  const helpers: ConditionalOutput[] = [];

  // GEN-04: globalThisPolyfill (the gt IIFE) MUST appear first.
  // utils.globalThis IS the IIFE object when globalThisPolyfill=true.
  // When globalThisPolyfill=false, do NOT include it (empty placeholder adds noise).
  if (options.globalThisPolyfill) {
    helpers.push(utils.globalThis as ConditionalOutput);
  }

  // GEN-02: All movable helpers in order.
  // GEN-05: Excluded helpers reference user-generated types:
  //   utils.StructWrapperFns, utils.AnyValueWrapperFns, utils.ListValueWrapperFns,
  //   utils.FieldMaskWrapperFns, utils.fromProtoObjectId, utils.fromJsonObjectId, utils.toProtoObjectId
  // Note: utils.Long is an Import (not ConditionalOutput) and must never be in this array.
  helpers.push(
    utils.bytesFromBase64,
    utils.base64FromBytes,
    utils.Builtin,
    utils.Exact,
    utils.DeepPartial,
    utils.numberToLong,
    utils.longToNumber,
    utils.toTimestamp,
    utils.fromTimestamp,
    utils.fromJsonTimestamp,
    utils.isObject,
    utils.isSet,
    utils.MessageFns,
    utils.ExtensionFns,
    utils.ExtensionHolder,
    utils.Extension,
    utils.fail,
  );

  // GrpcWebError references grpc namespace types (grpc.Code, grpc.Metadata) that are only
  // available when outputClientImpl="grpc-web". Only include it in the shared file then.
  if (options.outputClientImpl === "grpc-web") {
    helpers.push(utils.NiceGrpcServerStreamingMethodResult, utils.GrpcWebError);
  }

  return generateConditionalsUtils(helpers);
}
