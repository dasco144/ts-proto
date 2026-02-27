import { generateSharedHelpers } from "../src/generate-shared-helpers";
import { defaultOptions } from "../src/options";

describe("generateSharedHelpers", () => {
  describe("GEN-02: basic helpers always present", () => {
    it("contains export type Builtin", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).toContain("export type Builtin");
    });

    it("contains isSet", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).toContain("isSet");
    });

    it("contains isObject", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).toContain("isObject");
    });
  });

  describe("GEN-03: all declarations use export regardless of exportCommonSymbols", () => {
    it("exports DeepPartial when exportCommonSymbols=false", () => {
      const code = generateSharedHelpers({ ...defaultOptions(), exportCommonSymbols: false });
      expect(code.toString()).toContain("export type DeepPartial");
    });

    it("exports Exact when exportCommonSymbols=false", () => {
      const code = generateSharedHelpers({ ...defaultOptions(), exportCommonSymbols: false });
      expect(code.toString()).toContain("export type Exact");
    });

    it("exports MessageFns when exportCommonSymbols=false", () => {
      const code = generateSharedHelpers({ ...defaultOptions(), exportCommonSymbols: false });
      expect(code.toString()).toContain("export interface MessageFns");
    });
  });

  describe("GEN-04: globalThisPolyfill ordering", () => {
    it("puts gt IIFE before DeepPartial when globalThisPolyfill=true", () => {
      const code = generateSharedHelpers({ ...defaultOptions(), globalThisPolyfill: true });
      const output = code.toString();
      const gtPos = output.indexOf("const gt");
      const deepPartialPos = output.indexOf("DeepPartial");
      expect(gtPos).toBeGreaterThanOrEqual(0);
      expect(deepPartialPos).toBeGreaterThanOrEqual(0);
      expect(gtPos).toBeLessThan(deepPartialPos);
    });
  });

  describe("GEN-05: helpers referencing user-generated types are excluded", () => {
    it("does not contain StructWrapperFns", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).not.toContain("StructWrapperFns");
    });

    it("does not contain AnyValueWrapperFns", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).not.toContain("AnyValueWrapperFns");
    });

    it("does not contain fromProtoObjectId", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).not.toContain("fromProtoObjectId");
    });

    it("does not contain fromJsonObjectId", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).not.toContain("fromJsonObjectId");
    });

    it("does not contain toProtoObjectId", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).not.toContain("toProtoObjectId");
    });

    it("does not contain ListValueWrapperFns", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).not.toContain("ListValueWrapperFns");
    });

    it("does not contain FieldMaskWrapperFns", () => {
      const code = generateSharedHelpers(defaultOptions());
      expect(code.toString()).not.toContain("FieldMaskWrapperFns");
    });
  });
});
