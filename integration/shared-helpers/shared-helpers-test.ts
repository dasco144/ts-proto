import { Helpers } from "./helpers";

describe("shared-helpers", () => {
  it("compiles and imports resolve from proto-shared", () => {
    expect(Helpers).not.toBeUndefined();
  });
});
