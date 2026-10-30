import { ExistingMatchRow, readExistingResult } from "../readExistingResult";

const emptyRow: ExistingMatchRow = {
  matchId: "1",
  header: "HD1",
  players: ["0", "0", "0", "0"],
  sets: ["", "", ""],
  winner: "0",
};

function makePage(rows: ExistingMatchRow[], resultEntered: string | null = null) {
  return {
    $$eval: jest.fn((selector: string) =>
      Promise.resolve(selector === "th" ? resultEntered : rows)
    ),
  };
}

async function filledRowsOf(rows: ExistingMatchRow[]) {
  const { filledRows } = await readExistingResult({ page: makePage(rows) as never });
  return filledRows;
}

describe("readExistingResult", () => {
  it("reads the game rows from the player selects", async () => {
    const page = makePage([emptyRow]);

    await readExistingResult({ page: page as never });

    expect(page.$$eval).toHaveBeenCalledWith(
      'select[id^="match_"][id$="_t1p1"]',
      expect.any(Function)
    );
  });

  it("returns no rows when nothing is filled", async () => {
    const emptyWinner = { ...emptyRow, players: ["", "", "", ""], winner: "" };

    await expect(filledRowsOf([emptyRow, emptyWinner])).resolves.toEqual([]);
  });

  it("returns a row with a selected player", async () => {
    const row = { ...emptyRow, players: ["12345", "0", "0", "0"] };

    await expect(filledRowsOf([emptyRow, row])).resolves.toEqual([row]);
  });

  it("returns a row with a set score", async () => {
    const row = { ...emptyRow, sets: ["21-18", "", ""] };

    await expect(filledRowsOf([row])).resolves.toEqual([row]);
  });

  it("returns a row with only a winner", async () => {
    const row = { ...emptyRow, winner: "7" };

    await expect(filledRowsOf([row])).resolves.toEqual([row]);
  });

  it("returns who entered the team result when toernooi.nl shows it", async () => {
    const page = makePage([emptyRow], "BARET BC on Tue 21/04/2026 17:03");

    await expect(readExistingResult({ page: page as never })).resolves.toEqual({
      filledRows: [],
      resultEntered: "BARET BC on Tue 21/04/2026 17:03",
    });
    expect(page.$$eval).toHaveBeenCalledWith("th", expect.any(Function));
  });

  it("returns no team result when the form has none", async () => {
    const { resultEntered } = await readExistingResult({
      page: makePage([emptyRow]) as never,
    });

    expect(resultEntered).toBeNull();
  });
});
