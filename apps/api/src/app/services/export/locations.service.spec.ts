import { NotFoundException } from "@nestjs/common";
import {
  Availability,
  Club,
  EventCompetition,
  EventEntry,
  Location,
  Team,
} from "@badman/backend-database";
import type { AvailabilityDay } from "@badman/backend-database";
import { LocationsService } from "./locations.service";

const EXPECTED_HEADERS = [
  "Club ID",
  "Clubnaam",
  "Locatie",
  "Adres",
  "Dag",
  "Aantal Velden",
] as const;

const EVENT_ID = "00000000-0000-0000-0000-000000000001";

function makeEvent(name = "Test Competition 2025") {
  return { name } as any;
}

function makeAvailability(days: AvailabilityDay[]) {
  return { days } as unknown as Availability;
}

function makeLocation(
  name: string,
  availabilities: Availability[] = [],
  addressOverrides: Partial<{
    street: string;
    streetNumber: string;
    postalcode: string;
    city: string;
    address: string;
  }> = {}
) {
  return { name, availabilities, ...addressOverrides } as unknown as Location;
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

describe("LocationsService", () => {
  let service: LocationsService;

  beforeEach(() => {
    service = new LocationsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- assembleAddress helper ---

  describe("assembleAddress", () => {
    it("assembles address from all structured fields", () => {
      const location = makeLocation("Hall A", [], {
        street: "Kerkstraat",
        streetNumber: "10",
        postalcode: "2000",
        city: "Antwerpen",
      });
      expect(service.assembleAddress(location)).toBe("Kerkstraat 10 2000 Antwerpen");
    });

    it("falls back to location.address when structured fields are absent", () => {
      const location = makeLocation("Hall A", [], { address: "Fallback Address 1" });
      expect(service.assembleAddress(location)).toBe("Fallback Address 1");
    });

    it("returns empty string when all address fields are absent", () => {
      const location = makeLocation("Hall A");
      expect(service.assembleAddress(location)).toBe("");
    });
  });

  // --- getLocations ---

  describe("getLocations", () => {
    it("returns 6 headers in the correct order", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([]);

      const { headers } = await service.getLocations(EVENT_ID);

      expect(headers).toEqual(EXPECTED_HEADERS);
    });

    it("returns eventName from the competition", async () => {
      jest
        .spyOn(EventCompetition, "findByPk")
        .mockResolvedValue(makeEvent("Test Competition 2025"));
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([]);

      const { eventName } = await service.getLocations(EVENT_ID);

      expect(eventName).toBe("Test Competition 2025");
    });

    it("returns exactly 1 row for a single day entry with courts > 0", async () => {
      const day: AvailabilityDay = { day: "monday", courts: 4 };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([day])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows).toHaveLength(1);
    });

    it("excludes day entry with courts = 0", async () => {
      const day: AvailabilityDay = { day: "monday", courts: 0 };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([day])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows).toHaveLength(0);
    });

    it("excludes day entry with courts absent/undefined", async () => {
      const day = { day: "monday" } as AvailabilityDay;
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([day])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows).toHaveLength(0);
    });

    it("returns correct row count for multiple day entries across locations", async () => {
      const days: AvailabilityDay[] = [
        { day: "monday", courts: 4 },
        { day: "tuesday", courts: 2 },
      ];
      const locationA = makeLocation("Hall A", [makeAvailability(days)]);
      const locationB = makeLocation("Hall B", [makeAvailability([{ day: "friday", courts: 3 }])]);
      const club = makeClub({ locations: [locationA, locationB] });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows).toHaveLength(3);
    });

    it("deduplicates same (clubId, locationName, dayName) from two different entries", async () => {
      const day: AvailabilityDay = { day: "monday", courts: 4 };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([day])])],
      });
      const team = makeTeam(club);
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(team), makeEntry(team)]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows).toHaveLength(1);
    });

    it("translates 'monday' to 'Maandag' in the Dag column", async () => {
      const day: AvailabilityDay = { day: "monday", courts: 4 };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([day])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows[0][4]).toBe("Maandag");
    });

    it.each([
      ["monday", "Maandag"],
      ["tuesday", "Dinsdag"],
      ["wednesday", "Woensdag"],
      ["thursday", "Donderdag"],
      ["friday", "Vrijdag"],
      ["saturday", "Zaterdag"],
      ["sunday", "Zondag"],
    ])("translates '%s' to '%s'", async (dayKey, expected) => {
      const day: AvailabilityDay = { day: dayKey as AvailabilityDay["day"], courts: 2 };
      const club = makeClub({
        locations: [makeLocation("Hall A", [makeAvailability([day])])],
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows[0][4]).toBe(expected);
    });

    it("assembles address from structured fields in the Adres column", async () => {
      const day: AvailabilityDay = { day: "monday", courts: 4 };
      const location = makeLocation("Hall A", [makeAvailability([day])], {
        street: "Kerkstraat",
        streetNumber: "10",
        postalcode: "2000",
        city: "Antwerpen",
      });
      const club = makeClub({ locations: [location] });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows[0][3]).toBe("Kerkstraat 10 2000 Antwerpen");
    });

    it("falls back to location.address in Adres column when structured fields absent", async () => {
      const day: AvailabilityDay = { day: "monday", courts: 4 };
      const location = makeLocation("Hall A", [makeAvailability([day])], {
        address: "Fallback Adres 1",
      });
      const club = makeClub({ locations: [location] });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows[0][3]).toBe("Fallback Adres 1");
    });

    it("skips club with no locations gracefully", async () => {
      const club = makeClub({ locations: [] });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(makeTeam(club))]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows).toHaveLength(0);
    });

    it("skips entries with no team gracefully", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(makeEvent());
      jest.spyOn(EventEntry, "findAll").mockResolvedValue([makeEntry(null)]);

      const { rows } = await service.getLocations(EVENT_ID);

      expect(rows).toHaveLength(0);
    });

    it("throws NotFoundException when EventCompetition does not exist", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);

      await expect(service.getLocations(EVENT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
