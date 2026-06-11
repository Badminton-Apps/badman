import { ClubMembershipType } from "@badman/utils";
import * as XLSX from "xlsx";
import { Club, ClubPlayerMembership, Player } from "@badman/backend-database";
import { TransferService } from "./transfers.service";

jest.mock("xlsx");
jest.mock("@badman/backend-database", () => ({
  Player: { findAll: jest.fn() },
  Club: { findAll: jest.fn() },
  ClubPlayerMembership: Object.assign(jest.fn(), { findAll: jest.fn() }),
}));

const SEASON = 2025;

function mockXlsxRows(rows: object[]) {
  (XLSX.read as jest.Mock).mockReturnValue({ Sheets: { Sheet1: {} }, SheetNames: ["Sheet1"] });
  (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(rows);
}

function makeTransferRow(lidnummer = 1001, nieuwClubnummer = 42) {
  return {
    Lidnummer: lidnummer,
    Voornaam: "Test",
    Naam: "Player",
    OudeClub: "Old Club",
    OudClubnummer: 10,
    NieuweClub: "New Club",
    NieuwClubnummer: nieuwClubnummer,
  };
}

function makePlayer(id: string, memberId: string) {
  return { id, memberId, fullName: `Player ${id}` } as unknown as Player;
}

function makeClub(id: string, clubId: number) {
  return { id, clubId } as unknown as Club;
}

function makeMembership(
  overrides: Partial<{
    id: string;
    playerId: string;
    clubId: string;
    start: Date;
    end: Date | null;
    confirmed: boolean;
    membershipType: ClubMembershipType;
  }> = {}
) {
  return {
    id: "m1",
    playerId: "p1",
    clubId: "old-club",
    membershipType: ClubMembershipType.NORMAL,
    confirmed: true,
    end: null,
    start: new Date(SEASON - 1, 6, 1),
    save: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ClubPlayerMembership;
}

describe("TransferService", () => {
  let service: TransferService;

  beforeEach(() => {
    service = new TransferService();
    (ClubPlayerMembership as unknown as jest.Mock).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      end: null,
    }));
  });

  afterEach(() => jest.resetAllMocks());

  describe("process", () => {
    it("returns { message: false } when file is empty", async () => {
      mockXlsxRows([]);
      const result = await service.process(Buffer.from(""), SEASON);
      expect(result).toEqual({ message: false });
    });

    it("skips row when player not found in DB", async () => {
      mockXlsxRows([makeTransferRow()]);
      (Player.findAll as jest.Mock).mockResolvedValue([]);
      (Club.findAll as jest.Mock).mockResolvedValue([makeClub("c1", 42)]);
      // outer memberships call only — per-player call never reached when player missing
      (ClubPlayerMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

      await service.process(Buffer.from(""), SEASON);

      expect(ClubPlayerMembership as unknown as jest.Mock).not.toHaveBeenCalled();
    });

    it("skips row when target club not found in DB", async () => {
      mockXlsxRows([makeTransferRow(1001, 42)]);
      (Player.findAll as jest.Mock).mockResolvedValue([makePlayer("p1", "1001")]);
      (Club.findAll as jest.Mock).mockResolvedValue([]);
      // outer memberships call only — per-player call never reached when club missing
      (ClubPlayerMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

      await service.process(Buffer.from(""), SEASON);

      expect(ClubPlayerMembership as unknown as jest.Mock).not.toHaveBeenCalled();
    });

    it("creates new membership and ends old ones when player moves to new club", async () => {
      mockXlsxRows([makeTransferRow(1001, 42)]);

      const player = makePlayer("p1", "1001");
      const club = makeClub("c1", 42);
      const oldMembership = makeMembership({ playerId: "p1", clubId: "old-club", confirmed: true });

      (Player.findAll as jest.Mock).mockResolvedValue([player]);
      (Club.findAll as jest.Mock).mockResolvedValue([club]);
      (ClubPlayerMembership.findAll as jest.Mock)
        .mockResolvedValueOnce([oldMembership]) // open memberships
        .mockResolvedValueOnce([]); // this-season check

      await service.process(Buffer.from(""), SEASON);

      // new membership created
      expect(ClubPlayerMembership as unknown as jest.Mock).toHaveBeenCalled();
      const instance = (ClubPlayerMembership as unknown as jest.Mock).mock.results[0].value;
      expect(instance.save).toHaveBeenCalled();

      // old membership closed
      expect(oldMembership.save).toHaveBeenCalled();
      expect((oldMembership as any).end).not.toBeNull();
    });

    it("does not create new membership when player already has one at same club this season", async () => {
      mockXlsxRows([makeTransferRow(1001, 42)]);

      const player = makePlayer("p1", "1001");
      const club = makeClub("c1", 42);
      const existingMembership = makeMembership({
        playerId: "p1",
        clubId: "c1",
        start: new Date(SEASON, 6, 1),
        end: null,
      });

      (Player.findAll as jest.Mock).mockResolvedValue([player]);
      (Club.findAll as jest.Mock).mockResolvedValue([club]);
      (ClubPlayerMembership.findAll as jest.Mock)
        .mockResolvedValueOnce([]) // open memberships
        .mockResolvedValueOnce([existingMembership]); // this-season check

      await service.process(Buffer.from(""), SEASON);

      expect(ClubPlayerMembership as unknown as jest.Mock).not.toHaveBeenCalled();
      expect(existingMembership.end).toBeNull();
      expect(existingMembership.save).toHaveBeenCalled();
    });

    it("keeps latest and destroys older when multiple same-season memberships exist", async () => {
      mockXlsxRows([makeTransferRow(1001, 42)]);

      const player = makePlayer("p1", "1001");
      const club = makeClub("c1", 42);
      const older = makeMembership({
        id: "m-old",
        playerId: "p1",
        clubId: "c1",
        start: new Date(SEASON, 6, 1),
      });
      const newer = makeMembership({
        id: "m-new",
        playerId: "p1",
        clubId: "c1",
        start: new Date(SEASON, 8, 1),
      });

      (Player.findAll as jest.Mock).mockResolvedValue([player]);
      (Club.findAll as jest.Mock).mockResolvedValue([club]);
      (ClubPlayerMembership.findAll as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([older, newer]);

      await service.process(Buffer.from(""), SEASON);

      expect(older.destroy).toHaveBeenCalled();
      expect(newer.destroy).not.toHaveBeenCalled();
      expect(newer.save).toHaveBeenCalled();
    });
  });
});
