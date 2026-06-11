import { ClubMembershipType } from "@badman/utils";
import * as XLSX from "xlsx";
import { Club, ClubPlayerMembership, Player } from "@badman/backend-database";
import { LoansService } from "./loans.service.ts";

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

function makeLoanRow(lidnummer = 1001, ontLenendeClubNummer = 42) {
  return {
    Lidnummer: lidnummer,
    Voornaam: "Test",
    Naam: "Player",
    uitlenendeClub: "Lending Club",
    uitlenendeClubNummer: 10,
    ontLenendeClub: "Borrowing Club",
    ontLenendeClubNummer,
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
    end: Date;
    membershipType: ClubMembershipType;
  }> = {}
) {
  return {
    id: "m1",
    playerId: "p1",
    clubId: "c1",
    membershipType: ClubMembershipType.LOAN,
    start: new Date(SEASON, 6, 1),
    end: new Date(SEASON + 1, 5, 30),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ClubPlayerMembership;
}

describe("LoansService", () => {
  let service: LoansService;

  beforeEach(() => {
    service = new LoansService();
    (ClubPlayerMembership as unknown as jest.Mock).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(undefined),
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
      mockXlsxRows([makeLoanRow()]);
      (Player.findAll as jest.Mock).mockResolvedValue([]);
      (Club.findAll as jest.Mock).mockResolvedValue([makeClub("c1", 42)]);
      (ClubPlayerMembership.findAll as jest.Mock).mockResolvedValue([]);

      await service.process(Buffer.from(""), SEASON);

      expect(ClubPlayerMembership as unknown as jest.Mock).not.toHaveBeenCalled();
    });

    it("skips row when borrowing club not found in DB", async () => {
      mockXlsxRows([makeLoanRow(1001, 42)]);
      (Player.findAll as jest.Mock).mockResolvedValue([makePlayer("p1", "1001")]);
      (Club.findAll as jest.Mock).mockResolvedValue([]);
      (ClubPlayerMembership.findAll as jest.Mock).mockResolvedValue([]);

      await service.process(Buffer.from(""), SEASON);

      expect(ClubPlayerMembership as unknown as jest.Mock).not.toHaveBeenCalled();
    });

    it("creates new loan membership when none exists for player", async () => {
      mockXlsxRows([makeLoanRow(1001, 42)]);
      (Player.findAll as jest.Mock).mockResolvedValue([makePlayer("p1", "1001")]);
      (Club.findAll as jest.Mock).mockResolvedValue([makeClub("c1", 42)]);
      (ClubPlayerMembership.findAll as jest.Mock).mockResolvedValue([]);

      await service.process(Buffer.from(""), SEASON);

      expect(ClubPlayerMembership as unknown as jest.Mock).toHaveBeenCalled();
      const instance = (ClubPlayerMembership as unknown as jest.Mock).mock.results[0].value;
      expect(instance.save).toHaveBeenCalled();
    });

    it("does not create duplicate when loan already exists for same club", async () => {
      mockXlsxRows([makeLoanRow(1001, 42)]);
      (Player.findAll as jest.Mock).mockResolvedValue([makePlayer("p1", "1001")]);
      (Club.findAll as jest.Mock).mockResolvedValue([makeClub("c1", 42)]);
      (ClubPlayerMembership.findAll as jest.Mock).mockResolvedValue([
        makeMembership({ playerId: "p1", clubId: "c1" }),
      ]);

      await service.process(Buffer.from(""), SEASON);

      expect(ClubPlayerMembership as unknown as jest.Mock).not.toHaveBeenCalled();
    });

    it("creates new loan when existing one is for a different club", async () => {
      mockXlsxRows([makeLoanRow(1001, 42)]);
      (Player.findAll as jest.Mock).mockResolvedValue([makePlayer("p1", "1001")]);
      (Club.findAll as jest.Mock).mockResolvedValue([makeClub("c1", 42)]);
      (ClubPlayerMembership.findAll as jest.Mock).mockResolvedValue([
        makeMembership({ playerId: "p1", clubId: "other-club" }),
      ]);

      await service.process(Buffer.from(""), SEASON);

      expect(ClubPlayerMembership as unknown as jest.Mock).toHaveBeenCalled();
      const instance = (ClubPlayerMembership as unknown as jest.Mock).mock.results[0].value;
      expect(instance.save).toHaveBeenCalled();
    });
  });
});
