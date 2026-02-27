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
    utils.bytesFromBase64 as ConditionalOutput,
    utils.base64FromBytes as ConditionalOutput,
    utils.Builtin,
    utils.Exact,
    utils.DeepPartial,
    utils.numberToLong as ConditionalOutput,
    utils.longToNumber as ConditionalOutput,
    utils.toTimestamp as ConditionalOutput,
    utils.fromTimestamp as ConditionalOutput,
    utils.fromJsonTimestamp as ConditionalOutput,
    utils.isObject,
    utils.isSet,
    utils.MessageFns,
    utils.ExtensionFns,
    utils.ExtensionHolder,
    utils.NiceGrpcServerStreamingMethodResult as ConditionalOutput,
    utils.GrpcWebError as ConditionalOutput,
    utils.Extension,
    utils.fail as ConditionalOutput,
  );

  return generateConditionalsUtils(helpers);
}
