import { AppController } from "./app.controller";
import versionPackage from "../../version.json";

describe("AppController", () => {
  describe("getVersion", () => {
    it("reports the version baked into the build", () => {
      // getVersion has no runtime dependencies, so the injected collaborators
      // are irrelevant here — pass nulls and assert the pure response shape.
      const controller = new AppController(
        null as never,
        null as never,
        null as never,
        null as never
      );

      expect(controller.getVersion()).toEqual({ version: versionPackage.version });
    });
  });
});
