import { NotFoundException } from "@nestjs/common";
import { EventCompetition, EventEntry, Team } from "@badman/backend-database";
import { TeamsService } from "./teams.service";

const EXPECTED_HEADERS = [
  "Club ID",
  "Clubnaam",
  "Ploegnaam",
  "Voorkeur speelmoment (dag)",
  "Voorkeur speelmoment (tijdstip)",
] as const;

function makeTeam(
  overrides: Partial<{
    id: string;
    name: string;
    clubId: string;
    clubName: string;
    preferredDay: string | null;
    preferredTime: string | null;
  }> = {}
) {
  const opts = {
    id: "team-1",
    name: "Club A 1H",
    clubId: "club-001",
    clubName: "Club A",
    preferredDay: "monday",
    preferredTime: "09:00:00",
    ...overrides,
  };
  return {
    id: opts.id,
    name: opts.name,
    preferredDay: opts.preferredDay,
    preferredTime: opts.preferredTime,
    club: { clubId: opts.clubId, name: opts.clubName },
  } as unknown as Team;
}

function makeEntry(team: Team | null) {
  return { team } as any;
}

function makeEvent(name = "Test Competition 2025") {
  return { name } as any;
}

describe("TeamsService", () => {
  let service: TeamsService;

  beforeEach(() => {
    service = new TeamsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the 5 headers in the correct order", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([]);

    const { headers } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(headers).toEqual(EXPECTED_HEADERS);
  });

  it("returns eventName from the competition", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([]);

    const { eventName } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(eventName).toBe("Test Competition 2025");
  });

  it("deduplicates a team enrolled in multiple entries", async () => {
    const team = makeTeam();
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(team), makeEntry(team)]);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows).toHaveLength(1);
  });

  it("translates 'monday' to 'Maandag'", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([makeEntry(makeTeam({ preferredDay: "monday" }))]);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][3]).toBe("Maandag");
  });

  it.each([
    ["tuesday", "Dinsdag"],
    ["wednesday", "Woensdag"],
    ["thursday", "Donderdag"],
    ["friday", "Vrijdag"],
    ["saturday", "Zaterdag"],
    ["sunday", "Zondag"],
  ])("translates '%s' to '%s'", async (day, expected) => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([makeEntry(makeTeam({ preferredDay: day }))]);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][3]).toBe(expected);
  });

  it("formats preferredTime '09:00:00' as '09:00'", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([makeEntry(makeTeam({ preferredTime: "09:00:00" }))]);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][4]).toBe("09:00");
  });

  it("returns empty string when preferredDay is null", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([makeEntry(makeTeam({ preferredDay: null }))]);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][3]).toBe("");
  });

  it("returns empty string when preferredTime is null", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([makeEntry(makeTeam({ preferredTime: null }))]);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][4]).toBe("");
  });

  it("skips entries with no team", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(null)]);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows).toHaveLength(0);
  });

  it("throws NotFoundException when event does not exist", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);

    await expect(service.getTeams("00000000-0000-0000-0000-000000000001")).rejects.toThrow(
      NotFoundException
    );
  });
});
