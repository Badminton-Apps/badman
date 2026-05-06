import { NotFoundException } from "@nestjs/common";
import { EventCompetition, Team } from "@badman/backend-database";
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

function makeDraw(entries: ReturnType<typeof makeEntry>[]) {
  return { getEventEntries: jest.fn().mockResolvedValue(entries) } as any;
}

function makeSubEvent(draws: ReturnType<typeof makeDraw>[]) {
  return { getDrawCompetitions: jest.fn().mockResolvedValue(draws) } as any;
}

function makeEvent(subEvents: ReturnType<typeof makeSubEvent>[]) {
  return {
    name: "Test Competition 2025",
    getSubEventCompetitions: jest.fn().mockResolvedValue(subEvents),
  } as any;
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
    const event = makeEvent([makeSubEvent([makeDraw([])])]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

    const { headers } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(headers).toEqual(EXPECTED_HEADERS);
  });

  it("returns eventName from the competition", async () => {
    const event = makeEvent([]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

    const { eventName } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(eventName).toBe("Test Competition 2025");
  });

  it("deduplicates a team enrolled in multiple draws", async () => {
    const team = makeTeam();
    const draw1 = makeDraw([makeEntry(team)]);
    const draw2 = makeDraw([makeEntry(team)]);
    const event = makeEvent([makeSubEvent([draw1, draw2])]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows).toHaveLength(1);
  });

  it("translates 'monday' to 'Maandag'", async () => {
    const event = makeEvent([
      makeSubEvent([makeDraw([makeEntry(makeTeam({ preferredDay: "monday" }))])]),
    ]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

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
    const event = makeEvent([
      makeSubEvent([makeDraw([makeEntry(makeTeam({ preferredDay: day }))])]),
    ]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][3]).toBe(expected);
  });

  it("formats preferredTime '09:00:00' as '09:00'", async () => {
    const event = makeEvent([
      makeSubEvent([makeDraw([makeEntry(makeTeam({ preferredTime: "09:00:00" }))])]),
    ]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][4]).toBe("09:00");
  });

  it("returns empty string when preferredDay is null", async () => {
    const event = makeEvent([
      makeSubEvent([makeDraw([makeEntry(makeTeam({ preferredDay: null }))])]),
    ]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][3]).toBe("");
  });

  it("returns empty string when preferredTime is null", async () => {
    const event = makeEvent([
      makeSubEvent([makeDraw([makeEntry(makeTeam({ preferredTime: null }))])]),
    ]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

    const { rows } = await service.getTeams("00000000-0000-0000-0000-000000000001");

    expect(rows[0][4]).toBe("");
  });

  it("skips entries with no team", async () => {
    const event = makeEvent([makeSubEvent([makeDraw([makeEntry(null)])])]);
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);

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
