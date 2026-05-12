import { NotFoundException } from "@nestjs/common";
import {
  Availability,
  Club,
  EventCompetition,
  EventEntry,
  Location,
  Team,
} from "@badman/backend-database";
import type { AvailabilityException } from "@badman/backend-database";
import { ExceptionsService } from "./exceptions.service";

const EXPECTED_HEADERS = ["Club ID", "Clubnaam", "Locatie", "Datum", "Velden"] as const;

const EVENT_ID = "00000000-0000-0000-0000-000000000001";

function makeEvent(name = "Test Competition 2025") {
  return { name } as any;
}

function makeAvailability(exceptions: AvailabilityException[]) {
  return { exceptions } as unknown as Availability;
}

function makeLocation(name: string, availabilities: Availability[] = []) {
  return { name, availabilities } as unknown as Location;
}

function makeClub(
  overrides: Partial<{ clubId: number; name: string; locations: Location[] }> = {}
) {
  return {
    clubId: overrides.clubId ?? 1,
    name: overrides.name ?? "Club A",
    locations: overrides.locations ?? [],
  } as unknown as Club;
}

function makeTeam(club: Club) {
  return { club } as unknown as Team;
}

function makeEntry(team: Team | null) {
  return { team } as any;
}

describe("ExceptionsService", () => {
  let service: ExceptionsService;

  beforeEach(() => {
    service = new ExceptionsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- dateRangeToDays helper ---

  describe("dateRangeToDays", () => {
    it("returns empty array when start is undefined", () => {
      expect(service.dateRangeToDays(undefined)).toEqual([]);
    });

    it("returns single day when end is absent", () => {
      const days = service.dateRangeToDays(new Date("2024-12-25"));
      expect(days).toHaveLength(1);
    });

    it("returns one entry per day for a range", () => {
      const days = service.dateRangeToDays(new Date("2024-12-23"), new Date("2024-12-25"));
      expect(days).toHaveLength(3);
    });
  });

  // --- formatBelgianDate helper ---

  describe("formatBelgianDate", () => {
    it("formats Christmas 2024 as '25/12/2024'", () => {
      expect(service.formatBelgianDate(new Date("2024-12-25T12:00:00Z"))).toBe("25/12/2024");
    });

    it("renders the Brussels calendar day for a UTC date near midnight", () => {
      // 2024-03-31T23:00:00Z = 2024-04-01T01:00:00 Brussels (CEST +2)
      expect(service.formatBelgianDate(new Date("2024-03-31T23:00:00Z"))).toBe("01/04/2024");
    });
  });

  // --- getExceptions ---

  describe("getExceptions", () => {
    it("returns 5 headers in the correct order", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([]);

      const { headers } = await service.getExceptions(EVENT_ID);

      expect(headers).toEqual(EXPECTED_HEADERS);
    });

    it("returns eventName from the competition", async () => {
      jest
        .spyOn(EventCompetition, "findByPk")
        .mockResolvedValue(makeEvent("Test Competition 2025"));
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([]);

      const { eventName } = await service.getExceptions(EVENT_ID);

      expect(eventName).toBe("Test Competition 2025");
    });

    it("returns zero rows for empty exceptions array", async () => {
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows).toHaveLength(0);
    });

    it("returns exactly 1 row for a single-day exception (no end)", async () => {
      const exception: AvailabilityException = { start: new Date("2024-12-25") };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([exception])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows).toHaveLength(1);
    });

    it("returns exactly 3 rows for a 3-day range exception", async () => {
      const exception: AvailabilityException = {
        start: new Date("2024-12-23"),
        end: new Date("2024-12-25"),
      };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([exception])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows).toHaveLength(3);
    });

    it("deduplicates same (clubId, locationName, date) from two different entries", async () => {
      const exception: AvailabilityException = { start: new Date("2024-12-25") };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([exception])])],
      });
      const team = makeTeam(club);
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(team), makeEntry(team)]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows).toHaveLength(1);
    });

    it("formats Christmas 2024 date as '25/12/2024' in the Datum column", async () => {
      const exception: AvailabilityException = { start: new Date("2024-12-25T12:00:00Z") };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([exception])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows[0][3]).toBe("25/12/2024");
    });

    it("renders Brussels calendar day for a UTC date near midnight (timezone correctness)", async () => {
      // 2024-03-31T23:00:00Z = 2024-04-01T01:00:00 Brussels (CEST +2)
      const exception: AvailabilityException = { start: new Date("2024-03-31T23:00:00Z") };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([exception])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows[0][3]).toBe("01/04/2024");
    });

    it("skips entries where club has no locations", async () => {
      const club = makeClub({ locations: [] });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows).toHaveLength(0);
    });

    it("skips entries with no team", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(null)]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows).toHaveLength(0);
    });

    it("uses empty string in Velden column when courts is absent", async () => {
      const exception: AvailabilityException = { start: new Date("2024-12-25") };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([exception])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows[0][4]).toBe("");
    });

    it("includes courts value in Velden column when present", async () => {
      const exception: AvailabilityException = { start: new Date("2024-12-25"), courts: 4 };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([exception])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getExceptions(EVENT_ID);

      expect(rows[0][4]).toBe(4);
    });

    it("throws NotFoundException when EventCompetition does not exist", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);

      await expect(service.getExceptions(EVENT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
