import { correctWrongPlayers } from "../correctWrongPlayers";

describe("correctWrongPlayers", () => {
  it.each(["50641964", "50711059"])(
    "keeps federation memberId %s instead of remapping it to another player",
    (memberId) => {
      expect(correctWrongPlayers({ memberId })).toEqual({ memberId });
    }
  );

  it.each(["50641964", "50529021", "51509172"])(
    "does not merge Elias Goossens with memberId %s onto another Elias Goossens",
    (memberId) => {
      const player = { memberId, firstName: "Elias", lastName: "Goossens" };

      expect(correctWrongPlayers(player)).toEqual(player);
    }
  );

  it("still applies the remaining corrections", () => {
    expect(
      correctWrongPlayers({ memberId: "98443", firstName: "Yaro", lastName: "Van Delsen" })
    ).toEqual({ memberId: "50110338", firstName: "Yaro", lastName: "Van Delsen" });
  });
});
