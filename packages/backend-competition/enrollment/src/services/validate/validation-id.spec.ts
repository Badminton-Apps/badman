import { validationMessageId } from "./validation-id";

// Expected ids were produced by the previous implementation (ts-md5
// `Md5.hashStr(JSON.stringify(message))`), so ids stay stable for clients.
describe("validationMessageId", () => {
  it("hashes a validation message to the same id as before", () => {
    expect(
      validationMessageId({
        message: "all.v1.entryTeamDrawer.validation.errors.player-min-level",
        params: { player: { id: "p1", fullName: "Jan Peeters" }, level: 5 },
      })
    ).toBe("d57bde95f0ffbb1fada81eee2a1dd87a");
  });

  it("hashes non-ASCII text as UTF-8, like before", () => {
    expect(
      validationMessageId({
        message: "all.v1.x",
        params: { player: { fullName: "Zoë Dé Smét" }, club: "Café ‘t Hoekske" },
      })
    ).toBe("c79dee2488d62121781c2ed46ec1218c");
  });

  it("gives identical messages identical ids", () => {
    expect(validationMessageId({})).toBe("99914b932bd37a50b983c5e7c90ae93b");
    expect(validationMessageId({ message: "a" })).toBe(validationMessageId({ message: "a" }));
  });
});
