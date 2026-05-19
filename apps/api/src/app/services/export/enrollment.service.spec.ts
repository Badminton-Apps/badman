import { NotFoundException } from "@nestjs/common";
import {
  DrawCompetition,
  EventCompetition,
  EventEntry,
  Player,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { EnrollmentService } from "./enrollment.service";

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
] as const;

const EVENT_ID = "00000000-0000-0000-0000-000000000001";
const PLAYER_ID = "00000000-0000-0000-0000-000000000002";

function makeEvent(name = "Test Competition 2025", subEvents: unknown[] = []) {
  return {
    name,
    getSubEventCompetitions: jest.fn().mockResolvedValue(subEvents),
  } as unknown as EventCompetition;
}

function makePlayer(overrides: Partial<Player> = {}) {
  return {
    id: PLAYER_ID,
    lastName: "Janssen",
    firstName: "Jan",
    memberId: "123456",
    gender: "M",
    ...overrides,
  } as Player;
}

function makeTeam(name = "Club A 1H") {
  return { name } as Team;
}

function makeEntry(overrides: {
  team?: Team | null;
  players?: { id: string; single?: number; double?: number; mix?: number }[];
  teamIndex?: number;
}): EventEntry {
  return {
    id: "entry-1",
    team: overrides.team !== undefined ? overrides.team : makeTeam(),
    meta: {
      competition: {
        teamIndex: overrides.teamIndex ?? 1,
        players: overrides.players ?? [{ id: PLAYER_ID, single: 5, double: 4, mix: 3 }],
      },
    },
  } as unknown as EventEntry;
}

function makeDrawWithEntries(entries: EventEntry[]): DrawCompetition {
  return {
    name: "Heren - Groep 1",
    getEventEntries: jest.fn().mockResolvedValue(entries),
  } as unknown as DrawCompetition;
}

function makeSubEvent(eventType: string, draws: DrawCompetition[]): SubEventCompetition {
  return {
    name: "Heren",
    eventType,
    getDrawCompetitions: jest.fn().mockResolvedValue(draws),
  } as unknown as SubEventCompetition;
}

describe("EnrollmentService", () => {
  let service: EnrollmentService;

  beforeEach(() => {
    service = new EnrollmentService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 12 headers in the correct order", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
    jest.spyOn(Player, "findAll").mockResolvedValue([]);

    const { headers } = await service.getEnrollment(EVENT_ID);

    expect(headers).toEqual(EXPECTED_HEADERS);
  });

  it("returns eventName from the competition", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent("Test Competition 2025"));
    jest.spyOn(Player, "findAll").mockResolvedValue([]);

    const { eventName } = await service.getEnrollment(EVENT_ID);

    expect(eventName).toBe("Test Competition 2025");
  });

  it("returns exactly 1 row for a single player entry", async () => {
    const player = makePlayer();
    const draw = makeDrawWithEntries([
      makeEntry({ players: [{ id: PLAYER_ID, single: 5, double: 4, mix: 3 }] }),
    ]);
    const subEvent = makeSubEvent(SubEventTypeEnum.M, [draw]);

    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent("Test", [subEvent]));
    jest.spyOn(Player, "findAll").mockResolvedValue([player]);

    const { rows } = await service.getEnrollment(EVENT_ID);

    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe("Janssen");
    expect(rows[0][1]).toBe("Jan");
  });

  it("skips entry with no team and logs a warning", async () => {
    const warnSpy = jest.spyOn(service["logger"], "warn");
    const draw = makeDrawWithEntries([makeEntry({ team: null })]);
    const subEvent = makeSubEvent(SubEventTypeEnum.M, [draw]);

    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent("Test", [subEvent]));
    jest.spyOn(Player, "findAll").mockResolvedValue([]);

    const { rows } = await service.getEnrollment(EVENT_ID);

    expect(rows).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no team"));
  });

  it("skips player row when player ID not found in map", async () => {
    const draw = makeDrawWithEntries([makeEntry({ players: [{ id: "unknown-id" }] })]);
    const subEvent = makeSubEvent(SubEventTypeEnum.M, [draw]);

    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent("Test", [subEvent]));
    jest.spyOn(Player, "findAll").mockResolvedValue([]);

    const { rows } = await service.getEnrollment(EVENT_ID);

    expect(rows).toHaveLength(0);
  });

  it("MX sub-event: col 10 = single+double+mix, col 11 is empty", async () => {
    const player = makePlayer();
    const draw = makeDrawWithEntries([
      makeEntry({ players: [{ id: PLAYER_ID, single: 5, double: 4, mix: 3 }] }),
    ]);
    const subEvent = makeSubEvent(SubEventTypeEnum.MX, [draw]);

    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent("Test", [subEvent]));
    jest.spyOn(Player, "findAll").mockResolvedValue([player]);

    const { rows } = await service.getEnrollment(EVENT_ID);

    expect(rows[0][10]).toBe(12); // 5+4+3
    expect(rows[0][11]).toBe("");
  });

  it("non-MX sub-event: col 10 is empty, col 11 = single+double", async () => {
    const player = makePlayer();
    const draw = makeDrawWithEntries([
      makeEntry({ players: [{ id: PLAYER_ID, single: 5, double: 4, mix: 3 }] }),
    ]);
    const subEvent = makeSubEvent(SubEventTypeEnum.M, [draw]);

    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent("Test", [subEvent]));
    jest.spyOn(Player, "findAll").mockResolvedValue([player]);

    const { rows } = await service.getEnrollment(EVENT_ID);

    expect(rows[0][10]).toBe("");
    expect(rows[0][11]).toBe(9); // 5+4
  });

  it("strips sub-event name prefix from draw name in Reeks column", async () => {
    const player = makePlayer();
    const draw = {
      name: "Heren - Groep 1",
      getEventEntries: jest
        .fn()
        .mockResolvedValue([
          makeEntry({ players: [{ id: PLAYER_ID, single: 5, double: 4, mix: 0 }] }),
        ]),
    } as unknown as DrawCompetition;
    const subEvent = {
      name: "Heren",
      eventType: SubEventTypeEnum.M,
      getDrawCompetitions: jest.fn().mockResolvedValue([draw]),
    } as unknown as SubEventCompetition;

    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent("Test", [subEvent]));
    jest.spyOn(Player, "findAll").mockResolvedValue([player]);

    const { rows } = await service.getEnrollment(EVENT_ID);

    expect(rows[0][9]).toBe("Groep 1");
  });

  it("throws NotFoundException when EventCompetition does not exist", async () => {
    jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);

    await expect(service.getEnrollment(EVENT_ID)).rejects.toThrow(NotFoundException);
  });
});
