import * as XLSX from "xlsx";
import { EventCompetition, Player, Team } from "@badman/backend-database";
import { ExcelService } from "./excel.services";

const EXPECTED_HEADERS = [
  "Naam",
  "Voornaam",
  "Lidnummer",
  "Geslacht",
  "Ploeg",
  "Enkel",
  "Dubbel",
  "Gemengd",
  "Afdeling",
  "Reeks",
  "Somindex gemengde competitie",
  "Somindex heren-/damescompetitie",
];

describe("ExcelService.GetEnrollment", () => {
  let service: ExcelService;

  beforeEach(() => {
    service = new ExcelService();
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns a non-empty buffer", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue({
      getSubEventCompetitions: jest.fn().mockResolvedValue([]),
    } as unknown as EventCompetition);

    const { buffer } = await service.GetEnrollment("event-id");
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("produces a workbook with sheet name Enrollment", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue({
      getSubEventCompetitions: jest.fn().mockResolvedValue([]),
    } as unknown as EventCompetition);

    const { buffer } = await service.GetEnrollment("event-id");
    const wb = XLSX.read(buffer, { type: "buffer" });
    expect(wb.SheetNames).toContain("Enrollment");
  });

  it("has exactly 12 columns matching the expected header row", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue({
      getSubEventCompetitions: jest.fn().mockResolvedValue([]),
    } as unknown as EventCompetition);

    const { buffer } = await service.GetEnrollment("event-id");
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets["Enrollment"];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

    expect(rows[0]).toHaveLength(12);
    expect(rows[0]).toEqual(EXPECTED_HEADERS);
  });

  it("includes player rows when data exists", async () => {
    const mockPlayer = {
      lastName: "Janssen",
      firstName: "Jan",
      memberId: "123456",
      gender: "M",
    } as unknown as Player;

    const mockTeam = { name: "Team A" } as unknown as Team;

    const mockEntry = {
      team: mockTeam,
      meta: {
        competition: {
          teamIndex: 1,
          players: [{ id: "p1", single: 5, double: 4, mix: 3 }],
        },
      },
    };

    const mockDraw = {
      name: "Heren - Groep 1",
      getEventEntries: jest.fn().mockResolvedValue([mockEntry]),
    };

    const mockSubEvent = {
      name: "Heren",
      eventType: "M",
      getDrawCompetitions: jest.fn().mockResolvedValue([mockDraw]),
    };

    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue({
      getSubEventCompetitions: jest.fn().mockResolvedValue([mockSubEvent]),
    } as unknown as EventCompetition);

    jest.spyOn(Player, "findByPk").mockResolvedValue(mockPlayer);

    const { buffer } = await service.GetEnrollment("event-id");
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets["Enrollment"];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

    expect(rows).toHaveLength(2); // header + 1 player row
    expect(rows[1][0]).toBe("Janssen");
    expect(rows[1][1]).toBe("Jan");
  });
});
