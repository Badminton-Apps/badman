import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

export interface ExistingMatchRow {
  matchId: string;
  header: string;
  players: string[];
  sets: string[];
  winner: string;
}

export interface ExistingResult {
  filledRows: ExistingMatchRow[];
  resultEntered: string | null;
}

function isFilledMatchRow(row: ExistingMatchRow): boolean {
  const hasPlayer = row.players.some((player) => player !== "" && player !== "0");
  const hasSet = row.sets.some((set) => set.trim() !== "");
  const hasWinner = Number(row.winner) > 0;
  return hasPlayer || hasSet || hasWinner;
}

export async function readExistingResult(
  pupeteer: { page: Page },
  args?: { logger?: Logger }
): Promise<ExistingResult> {
  const { logger } = args || {};
  logger?.verbose("readExistingResult");
  const { page } = pupeteer;

  const rows = await page.$$eval('select[id^="match_"][id$="_t1p1"]', (selects) =>
    selects.map((select) => {
      const matchId = select.id.replace(/^match_/, "").replace(/_t1p1$/, "");
      const valueOf = (id: string) =>
        (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";

      return {
        matchId,
        header: select.closest("tr")?.querySelector("th")?.textContent?.trim() ?? "",
        players: ["t1p1", "t1p2", "t2p1", "t2p2"].map((p) => valueOf(`match_${matchId}_${p}`)),
        sets: [1, 2, 3].map((set) => valueOf(`match_${matchId}_set_${set}`)),
        winner: valueOf(`match_${matchId}_winner`),
      };
    })
  );

  // A team result entered on its own (e.g. a forfeit) leaves the game rows empty;
  // toernooi.nl then only shows who entered it in the header table.
  const resultEntered = await page.$$eval("th", (headers) => {
    const label = headers.find((th) =>
      /result entered|uitslag ingevoerd/i.test(th.textContent ?? "")
    );
    return label?.nextElementSibling?.textContent?.trim() || null;
  });

  return { filledRows: rows.filter(isFilledMatchRow), resultEntered };
}
