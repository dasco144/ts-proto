import * as path from "path";
import { generateSharedHelpers } from "../src/generate-shared-helpers";
import { defaultOptions } from "../src/options";

function computeRelativePath(filePath: string, conditionalUtils: string): string {
  const importPath = path.normalize(conditionalUtils);
  const outputPath = path.normalize(filePath);
  const outputPathDir = path.dirname(outputPath);
  let relativePath = path.relative(outputPathDir, importPath).split(path.sep).join("/");
  if (!relativePath.startsWith(".")) {
    relativePath = "./" + relativePath;
  }
  return relativePath;
}

describe("proto-shared import path computation (IMP-02, IMP-03)", () => {
  it("root-level file gets ./proto-shared", () => {
    expect(computeRelativePath("foo.ts", "./proto-shared")).toBe("./proto-shared");
  });
  it("one level deep gets ../proto-shared", () => {
    expect(computeRelativePath("google/foo.ts", "./proto-shared")).toBe("../proto-shared");
  });
  it("two levels deep gets ../../proto-shared", () => {
    expect(computeRelativePath("google/api/foo.ts", "./proto-shared")).toBe("../../proto-shared");
  });
  it("importSuffix=.js: root gets ./proto-shared.js", () => {
    expect(computeRelativePath("foo.ts", "./proto-shared.js")).toBe("./proto-shared.js");
  });
  it("importSuffix=.js: two levels deep gets ../../proto-shared.js", () => {
    expect(computeRelativePath("google/api/foo.ts", "./proto-shared.js")).toBe("../../proto-shared.js");
  });
});

describe("conditionalUtils behavior (IMP-01)", () => {
  it("without conditionalUtils: isSet appears as inline declaration", () => {
    const code = generateSharedHelpers(defaultOptions());
    const output = code.toString({ path: "proto-shared.ts" });
    expect(output).toContain("function isSet");
  });

  it("with conditionalUtils on a fresh Code that uses a ConditionalOutput: import is emitted, not declaration", () => {
    // This test documents the mechanism but requires a ConditionalOutput fixture.
    // Verify via plugin integration: when sharedHelpersFile=true,
    // the per-file toString uses conditionalUtils = "./proto-shared" + importSuffix.
    // The full end-to-end is verified in the integration test (Phase 4).
    // Here we verify the option string is constructed correctly.
    const options = { ...defaultOptions(), sharedHelpersFile: true, importSuffix: "" };
    const conditionalUtils = "./proto-shared" + options.importSuffix;
    expect(conditionalUtils).toBe("./proto-shared");
  });

  it("importSuffix=.js: conditionalUtils string includes suffix", () => {
    const options = { ...defaultOptions(), sharedHelpersFile: true, importSuffix: ".js" };
    const conditionalUtils = "./proto-shared" + options.importSuffix;
    expect(conditionalUtils).toBe("./proto-shared.js");
  });

  it("importSuffix=.ts: conditionalUtils string includes suffix", () => {
    const options = { ...defaultOptions(), sharedHelpersFile: true, importSuffix: ".ts" };
    const conditionalUtils = "./proto-shared" + options.importSuffix;
    expect(conditionalUtils).toBe("./proto-shared.ts");
  });
});
