import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { CpDataCollector } from "./cp-data-collector";
import { EventCompetition, Player, Club } from "@badman/backend-database";
import { EnrollmentValidationService } from "@badman/backend-enrollment";
import { TeamMembershipType } from "@badman/utils";

// Helper to create mock objects with association getters
function mockEvent(overrides: Partial<EventCompetition> = {}) {
  return {
    id: "event-1",
    name: "Test Competition 2025",
    season: 2025,
    getSubEventCompetitions: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as EventCompetition;
}

function mockSubEvent(overrides = {}) {
  return {
    id: "sub-1",
    name: "Heren A",
    eventType: "M",
    getEventEntries: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function mockClub(overrides = {}) {
  return {
    id: "club-1",
    name: "BC Test",
    clubId: "12345",
    abbreviation: "BCT",
    getLocations: jest.fn().mockResolvedValue([]),
    getComments: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function mockTeam(overrides = {}) {
  return {
    id: "team-1",
    name: "BC Test",
    clubId: "club-1",
    type: "M",
    link: null,
    teamNumber: 1,
    preferredDay: "wednesday",
    preferredTime: "20:00",
    phone: "0123456789",
    email: "team@test.be",
    players: [],
    getClub: jest.fn().mockResolvedValue(mockClub()),
    getCaptain: jest.fn().mockResolvedValue({
      fullName: "Jan Janssens",
    }),
    getPrefferedLocation: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function mockEntry(overrides = {}) {
  return {
    id: "entry-1",
    subEventId: "sub-1",
    createdAt: new Date("2025-01-15T10:00:00Z"),
    meta: {
      competition: {
        teamIndex: 1,
        players: [
          { id: "player-1", single: 5, double: 4, mix: 3 },
          { id: "player-2", single: 8, double: 7, mix: -1 },
        ],
      },
    },
    getTeam: jest.fn().mockResolvedValue(mockTeam()),
    ...overrides,
  };
}

function mockLocation(overrides = {}) {
  return {
    id: "loc-1",
    name: "Sporthal Test",
    street: "Teststraat",
    streetNumber: "42",
    postalcode: "1000",
    city: "Brussel",
    phone: "02 123 45 67",
    ...overrides,
  };
}

describe("CpDataCollector", () => {
  let collector: CpDataCollector;
  let mockValidation: jest.Mocked<EnrollmentValidationService>;
  let mockI18n: jest.Mocked<I18nService>;

  beforeEach(async () => {
    mockValidation = {
      fetchAndValidate: jest.fn().mockResolvedValue({ teams: [] }),
    } as any;

    mockI18n = {
      translate: jest.fn().mockImplementation((key: string) => key),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CpDataCollector,
        { provide: EnrollmentValidationService, useValue: mockValidation },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();

    collector = module.get<CpDataCollector>(CpDataCollector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("collect", () => {
    it("should throw NotFoundException when event does not exist", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);

      await expect(collector.collect("nonexistent")).rejects.toThrow(NotFoundException);
    });

    it("should return a correct CpPayload structure for a basic competition", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([mockLocation()]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team = mockTeam({
        getClub: jest.fn().mockResolvedValue(club),
        getPrefferedLocation: jest.fn().mockResolvedValue(mockLocation()),
      });

      const entry = mockEntry({
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([
        {
          id: "player-1",
          lastName: "Janssens",
          firstName: "Jan",
          gender: "M",
          memberId: "50001",
        } as any,
        {
          id: "player-2",
          lastName: "Peeters",
          firstName: "Piet",
          gender: "M",
          memberId: "50002",
        } as any,
      ]);

      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      // Verify structure
      expect(payload.event).toEqual({
        name: "Test Competition 2025",
        season: 2025,
      });
      expect(payload.subEvents).toHaveLength(1);
      expect(payload.subEvents[0]).toMatchObject({
        refId: "sub-1",
        name: "Heren A",
        gender: 1,
        sortOrder: 0,
      });
      expect(payload.clubs).toHaveLength(1);
      expect(payload.clubs[0]).toMatchObject({
        refId: "club-1",
        name: "BC Test",
        clubId: "12345",
        country: 19,
      });
      expect(payload.locations).toHaveLength(1);
      expect(payload.locations[0]).toMatchObject({
        refId: "loc-1",
        clubRefId: "club-1",
        name: "Sporthal Test",
        address: "Teststraat 42",
      });
      expect(payload.teams).toHaveLength(1);
      expect(payload.teams[0]).toMatchObject({
        refId: "team-1",
        clubRefId: "club-1",
        name: "BC Test (1)",
        country: 19,
        dayOfWeek: 3,
      });
      expect(payload.players).toHaveLength(2);
      expect(payload.teamPlayers).toHaveLength(2);
      expect(payload.entries).toHaveLength(1);
      expect(payload.settings.tournamentName).toBe("Test Competition 2025");
    });

    it("should deduplicate clubs across multiple sub-events", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team1 = mockTeam({
        id: "team-1",
        getClub: jest.fn().mockResolvedValue(club),
      });
      const team2 = mockTeam({
        id: "team-2",
        getClub: jest.fn().mockResolvedValue(club),
      });

      const entry1 = mockEntry({
        id: "entry-1",
        getTeam: jest.fn().mockResolvedValue(team1),
      });
      const entry2 = mockEntry({
        id: "entry-2",
        subEventId: "sub-2",
        getTeam: jest.fn().mockResolvedValue(team2),
      });

      const subEvent1 = mockSubEvent({
        id: "sub-1",
        getEventEntries: jest.fn().mockResolvedValue([entry1]),
      });
      const subEvent2 = mockSubEvent({
        id: "sub-2",
        name: "Dames A",
        eventType: "F",
        getEventEntries: jest.fn().mockResolvedValue([entry2]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent1, subEvent2]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      // Same club appears in both sub-events, should only appear once
      expect(payload.clubs).toHaveLength(1);
      expect(payload.subEvents).toHaveLength(2);
      expect(payload.teams).toHaveLength(2);
    });

    it("should deduplicate players across multiple teams of the same club", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      // Shared player across two teams
      const sharedPlayerMeta = {
        id: "player-1",
        single: 5,
        double: 4,
        mix: 3,
      };

      const team1 = mockTeam({
        id: "team-1",
        getClub: jest.fn().mockResolvedValue(club),
      });
      const team2 = mockTeam({
        id: "team-2",
        getClub: jest.fn().mockResolvedValue(club),
      });

      const entry1 = mockEntry({
        id: "entry-1",
        meta: { competition: { teamIndex: 1, players: [sharedPlayerMeta] } },
        getTeam: jest.fn().mockResolvedValue(team1),
      });
      const entry2 = mockEntry({
        id: "entry-2",
        meta: {
          competition: {
            teamIndex: 2,
            players: [sharedPlayerMeta, { id: "player-2", single: 8, double: 7, mix: -1 }],
          },
        },
        getTeam: jest.fn().mockResolvedValue(team2),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry1, entry2]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([
        {
          id: "player-1",
          lastName: "Janssens",
          firstName: "Jan",
          gender: "M",
          memberId: "50001",
        } as any,
        {
          id: "player-2",
          lastName: "Peeters",
          firstName: "Piet",
          gender: "M",
          memberId: "50002",
        } as any,
      ]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      // Player-1 appears in both teams but should only be in players array once
      expect(payload.players).toHaveLength(2);
      // But teamPlayers should have 3 entries (player-1 in team-1, player-1 + player-2 in team-2)
      expect(payload.teamPlayers).toHaveLength(3);
    });

    it("should skip teams without a club", async () => {
      const teamNoClub = mockTeam({
        getClub: jest.fn().mockResolvedValue(null),
      });
      const entry = mockEntry({
        getTeam: jest.fn().mockResolvedValue(teamNoClub),
      });
      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });
      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      expect(payload.teams).toHaveLength(0);
      expect(payload.clubs).toHaveLength(0);
    });

    it("should map gender correctly", async () => {
      const subEvents = [
        mockSubEvent({ id: "s1", name: "Heren", eventType: "M" }),
        mockSubEvent({ id: "s2", name: "Dames", eventType: "F" }),
        mockSubEvent({ id: "s3", name: "Gemengd", eventType: "MX" }),
      ];

      // All sub-events have no entries for simplicity
      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue(subEvents),
      });
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      expect(payload.subEvents[0].gender).toBe(1); // M
      expect(payload.subEvents[1].gender).toBe(2); // F
      expect(payload.subEvents[2].gender).toBe(3); // MX
    });

    it("should map day-of-week correctly", async () => {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const expected = [1, 2, 3, 4, 5, 6, 7];

      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const teams = days.map((day, i) =>
        mockTeam({
          id: `team-${i}`,
          preferredDay: day,
          getClub: jest.fn().mockResolvedValue(club),
        })
      );

      const entries = teams.map((team, i) =>
        mockEntry({
          id: `entry-${i}`,
          meta: { competition: { teamIndex: i + 1, players: [] } },
          getTeam: jest.fn().mockResolvedValue(team),
        })
      );

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue(entries),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      payload.teams.forEach((team, i) => {
        expect(team.dayOfWeek).toBe(expected[i]);
      });
    });

    it("should handle team without captain or preferred location", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team = mockTeam({
        preferredDay: null,
        preferredTime: null,
        phone: null,
        email: null,
        getClub: jest.fn().mockResolvedValue(club),
        getCaptain: jest.fn().mockResolvedValue(null),
        getPrefferedLocation: jest.fn().mockResolvedValue(null),
      });

      const entry = mockEntry({
        meta: { competition: { teamIndex: 1, players: [] } },
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      expect(payload.teams[0].contact).toBeNull();
      expect(payload.teams[0].dayOfWeek).toBeNull();
      expect(payload.teams[0].planTime).toBeNull();
      expect(payload.teams[0].preferredLocationRefId).toBeNull();
    });

    it("should include memos with validation errors and comments", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([{ message: "Club comment here" }]),
      });

      const team = mockTeam({
        getClub: jest.fn().mockResolvedValue(club),
        players: [
          {
            id: "player-1",
            TeamPlayerMembership: {
              membershipType: TeamMembershipType.REGULAR,
            },
          },
        ],
      });

      const entry = mockEntry({
        meta: { competition: { teamIndex: 1, players: [{ id: "player-1" }] } },
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);

      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [
          {
            id: "team-1",
            errors: [
              {
                message: "all.v1.enrollment.error.test",
                params: {},
              },
            ],
          },
        ],
      } as any);

      mockI18n.translate.mockReturnValue("Translated error message");

      const payload = await collector.collect("event-1");

      expect(payload.memos).toHaveLength(1);
      expect(payload.memos[0].teamRefId).toBe("team-1");
      expect(payload.memos[0].memo).toContain("--==[Fouten]==--");
      expect(payload.memos[0].memo).toContain("Translated error message");
      expect(payload.memos[0].memo).toContain("--==[Club comments]==--");
      expect(payload.memos[0].memo).toContain("Club comment here");
    });

    it("should strip HTML tags from validation error messages", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team = mockTeam({
        getClub: jest.fn().mockResolvedValue(club),
        players: [],
      });

      const entry = mockEntry({
        meta: { competition: { teamIndex: 1, players: [] } },
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);

      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [
          {
            id: "team-1",
            errors: [
              {
                message: "error.key",
                params: {},
              },
            ],
          },
        ],
      } as any);

      mockI18n.translate.mockReturnValue("Error with <strong>HTML</strong> tags");

      const payload = await collector.collect("event-1");

      expect(payload.memos[0].memo).toContain("Error with HTML tags");
      expect(payload.memos[0].memo).not.toContain("<strong>");
    });

    it("should preserve special characters in data (no SQL escaping at this layer)", async () => {
      const club = mockClub({
        name: "BC O'Brien & Müller",
        getLocations: jest
          .fn()
          .mockResolvedValue([mockLocation({ name: 'Sporthal "De Grote" Hal' })]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team = mockTeam({
        name: "O'Brien Team",
        getClub: jest.fn().mockResolvedValue(club),
      });

      const entry = mockEntry({
        meta: { competition: { teamIndex: 1, players: [] } },
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      expect(payload.clubs[0].name).toBe("BC O'Brien & Müller");
      expect(payload.locations[0].name).toBe('Sporthal "De Grote" Hal');
      expect(payload.teams[0].name).toBe("O'Brien Team (1)");
    });

    it("should produce JSON-serializable output (no Date objects, circular refs)", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([mockLocation()]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team = mockTeam({
        getClub: jest.fn().mockResolvedValue(club),
      });

      const entry = mockEntry({
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([
        {
          id: "player-1",
          lastName: "Test",
          firstName: "Player",
          gender: "M",
          memberId: "99999",
        } as any,
      ]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      // Round-trip through JSON should produce identical result
      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(payload);
    });

    it("should format team name with teamIndex from entry meta", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team = mockTeam({
        name: "BC Test",
        getClub: jest.fn().mockResolvedValue(club),
      });

      const entry = mockEntry({
        meta: { competition: { teamIndex: 3, players: [] } },
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      expect(payload.teams[0].name).toBe("BC Test (3)");
    });

    it("should format entryDate as MM/DD/YYYY HH:MM:ss", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team = mockTeam({
        getClub: jest.fn().mockResolvedValue(club),
      });

      const entry = mockEntry({
        createdAt: new Date("2025-03-15T14:30:45Z"),
        meta: { competition: { teamIndex: 1, players: [] } },
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      // Must match MM/DD/YYYY HH:MM:ss format for Access date literals
      expect(payload.teams[0].entryDate).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
      // Verify the actual date components
      expect(payload.teams[0].entryDate).toContain("03/15/2025");
    });

    it("should set player levels with defaults of -1", async () => {
      const club = mockClub({
        getLocations: jest.fn().mockResolvedValue([]),
        getComments: jest.fn().mockResolvedValue([]),
      });

      const team = mockTeam({
        getClub: jest.fn().mockResolvedValue(club),
      });

      const entry = mockEntry({
        meta: {
          competition: {
            teamIndex: 1,
            players: [
              { id: "player-1" }, // No levels specified
            ],
          },
        },
        getTeam: jest.fn().mockResolvedValue(team),
      });

      const subEvent = mockSubEvent({
        getEventEntries: jest.fn().mockResolvedValue([entry]),
      });

      const event = mockEvent({
        getSubEventCompetitions: jest.fn().mockResolvedValue([subEvent]),
      });

      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(event);
      jest.spyOn(Player, "findAll").mockResolvedValue([
        {
          id: "player-1",
          lastName: "NoLevels",
          firstName: "Player",
          gender: "M",
          memberId: "11111",
        } as any,
      ]);
      mockValidation.fetchAndValidate.mockResolvedValue({
        teams: [],
      } as any);

      const payload = await collector.collect("event-1");

      expect(payload.players[0].levels).toEqual({
        single: -1,
        double: -1,
        mix: -1,
      });
    });
  });
});
