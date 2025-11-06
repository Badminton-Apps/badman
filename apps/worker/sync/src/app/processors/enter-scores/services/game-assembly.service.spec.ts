import { Test, TestingModule } from "@nestjs/testing";
import { GameAssemblyService } from "./game-assembly.service";
import { Game } from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";

// Mock data interfaces
interface MockPlayer {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
}

interface MockGame {
  id: string;
  visualCode: string;
  order: number;
  gameType: "S" | "D" | "MX";
  players: MockPlayer[];
}

interface MockAssemblyData {
  // Singles positions
  single1?: string | string[];
  single2?: string | string[];
  single3?: string | string[];
  single4?: string | string[];
  // Doubles positions
  double1?: string | string[];
  double2?: string | string[];
  double3?: string | string[];
  double4?: string | string[];
}

interface MockTeamAssembly {
  teamId: string;
  assembly: MockAssemblyData;
}

interface MockEncounter {
  id: string;
  home: { id: string; name: string };
  away: { id: string; name: string };
}

describe("GameAssemblyService", () => {
  let service: GameAssemblyService;

  // Mock data factory functions
  const createMockPlayer = (overrides: Partial<MockPlayer> = {}): MockPlayer => ({
    id: "player-123",
    memberId: "MB123456",
    firstName: "John",
    lastName: "Doe",
    ...overrides,
  });

  const createMockGame = (overrides: Partial<MockGame> = {}): MockGame => ({
    id: "game-123",
    visualCode: "G001",
    order: 1,
    gameType: "S",
    players: [
      createMockPlayer({ id: "p1", memberId: "MB111" }),
      createMockPlayer({ id: "p2", memberId: "MB222" }),
    ],
    ...overrides,
  });

  // Complete assembly data for Men's team
  const createMensAssemblyData = (): MockAssemblyData => ({
    // Doubles positions (come first in order)
    double1: ["p1", "p2"], // Home team double 1
    double2: ["p3", "p4"], // Home team double 2
    double3: ["p5", "p6"], // Home team double 3
    double4: ["p7", "p8"], // Home team double 4
    // Singles positions (come after doubles)
    single1: "p1", // Home team single 1
    single2: "p2", // Home team single 2
    single3: "p3", // Home team single 3
    single4: "p4", // Home team single 4
  });

  const createMensAwayAssemblyData = (): MockAssemblyData => ({
    // Doubles positions
    double1: ["p9", "p10"], // Away team double 1
    double2: ["p11", "p12"], // Away team double 2
    double3: ["p13", "p14"], // Away team double 3
    double4: ["p15", "p16"], // Away team double 4
    // Singles positions
    single1: "p9", // Away team single 1
    single2: "p10", // Away team single 2
    single3: "p11", // Away team single 3
    single4: "p12", // Away team single 4
  });

  // Complete assembly data for Women's team (same structure as men's)
  const createWomensAssemblyData = (): MockAssemblyData => ({
    double1: ["p17", "p18"],
    double2: ["p19", "p20"],
    double3: ["p21", "p22"],
    double4: ["p23", "p24"],
    single1: "p17",
    single2: "p18",
    single3: "p19",
    single4: "p20",
  });

  const createWomensAwayAssemblyData = (): MockAssemblyData => ({
    double1: ["p25", "p26"],
    double2: ["p27", "p28"],
    double3: ["p29", "p30"],
    double4: ["p31", "p32"],
    single1: "p25",
    single2: "p26",
    single3: "p27",
    single4: "p28",
  });

  // Mixed doubles assembly data (different order: D1, D2, S1, S3, S2, S4, D3, D4)
  const createMixedAssemblyData = (): MockAssemblyData => ({
    double1: ["p33", "p34"], // Mixed double 1 (M+F)
    double2: ["p35", "p36"], // Mixed double 2 (M+F)
    double3: ["p37", "p38"], // Mixed double 3 (M+F)
    double4: ["p39", "p40"], // Mixed double 4 (M+F)
    single1: "p33", // Men's single 1
    single2: "p35", // Men's single 2
    single3: "p34", // Women's single 1
    single4: "p36", // Women's single 2
  });

  const createMixedAwayAssemblyData = (): MockAssemblyData => ({
    double1: ["p41", "p42"],
    double2: ["p43", "p44"],
    double3: ["p45", "p46"],
    double4: ["p47", "p48"],
    single1: "p41",
    single2: "p43",
    single3: "p42",
    single4: "p44",
  });

  const createMockEncounter = (): MockEncounter => ({
    id: "encounter-123",
    home: { id: "home-team-123", name: "Home Team" },
    away: { id: "away-team-123", name: "Away Team" },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameAssemblyService],
    }).compile();

    service = module.get<GameAssemblyService>(GameAssemblyService);
  });

  describe("getAssemblyPositionsInOrder", () => {
    it("should return correct order for Men's team", () => {
      const positions = service.getAssemblyPositionsInOrder(SubEventTypeEnum.M);

      expect(positions).toEqual([
        "double1",
        "double2",
        "double3",
        "double4",
        "single1",
        "single2",
        "single3",
        "single4",
      ]);
    });

    it("should return correct order for Women's team", () => {
      const positions = service.getAssemblyPositionsInOrder(SubEventTypeEnum.F);

      expect(positions).toEqual([
        "double1",
        "double2",
        "double3",
        "double4",
        "single1",
        "single2",
        "single3",
        "single4",
      ]);
    });

    it("should return correct order for Mixed team", () => {
      const positions = service.getAssemblyPositionsInOrder(SubEventTypeEnum.MX);

      expect(positions).toEqual([
        "double1",
        "double2",
        "single1",
        "single3",
        "single2",
        "single4",
        "double3",
        "double4",
      ]);
    });

    it("should return empty array for unknown team type", () => {
      const positions = service.getAssemblyPositionsInOrder("UNKNOWN" as SubEventTypeEnum);

      expect(positions).toEqual([]);
    });
  });

  describe("matchGamesToAssembly", () => {
    let mockEncounter: MockEncounter;

    beforeEach(() => {
      mockEncounter = createMockEncounter();
    });

    describe("Men's team assembly matching", () => {
      it("should match games to assembly positions in correct order", () => {
        // Arrange
        const homeAssembly = createMensAssemblyData();
        const awayAssembly = createMensAwayAssemblyData();

        const assemblies: MockTeamAssembly[] = [
          { teamId: "home-team-123", assembly: homeAssembly },
          { teamId: "away-team-123", assembly: awayAssembly },
        ];

        // Create games that match the assembly positions
        const games: MockGame[] = [
          // Doubles games (should be matched first in order)
          createMockGame({
            id: "game-d1",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p1", memberId: "MB001" }),
              createMockPlayer({ id: "p2", memberId: "MB002" }),
              createMockPlayer({ id: "p9", memberId: "MB009" }),
              createMockPlayer({ id: "p10", memberId: "MB010" }),
            ],
          }),
          createMockGame({
            id: "game-d2",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p3", memberId: "MB003" }),
              createMockPlayer({ id: "p4", memberId: "MB004" }),
              createMockPlayer({ id: "p11", memberId: "MB011" }),
              createMockPlayer({ id: "p12", memberId: "MB012" }),
            ],
          }),
          // Singles games (should be matched after doubles)
          createMockGame({
            id: "game-s1",
            gameType: "S",
            players: [
              createMockPlayer({ id: "p1", memberId: "MB001" }),
              createMockPlayer({ id: "p9", memberId: "MB009" }),
            ],
          }),
          createMockGame({
            id: "game-s2",
            gameType: "S",
            players: [
              createMockPlayer({ id: "p2", memberId: "MB002" }),
              createMockPlayer({ id: "p10", memberId: "MB010" }),
            ],
          }),
        ];

        // Act
        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.M,
          mockEncounter
        );

        // Assert
        expect(result.size).toBe(4);

        // Check that games are matched to correct positions
        const gameD1Mapping = Array.from(result.entries()).find(
          ([game]) => game.id === "game-d1"
        )?.[1];
        const gameD2Mapping = Array.from(result.entries()).find(
          ([game]) => game.id === "game-d2"
        )?.[1];
        const gameS1Mapping = Array.from(result.entries()).find(
          ([game]) => game.id === "game-s1"
        )?.[1];
        const gameS2Mapping = Array.from(result.entries()).find(
          ([game]) => game.id === "game-s2"
        )?.[1];

        expect(gameD1Mapping).toEqual({ assemblyPosition: "double1", gameType: "D" });
        expect(gameD2Mapping).toEqual({ assemblyPosition: "double2", gameType: "D" });
        expect(gameS1Mapping).toEqual({ assemblyPosition: "single1", gameType: "S" });
        expect(gameS2Mapping).toEqual({ assemblyPosition: "single2", gameType: "S" });
      });

      it("should handle complete 8-game men's match", () => {
        // Arrange
        const homeAssembly = createMensAssemblyData();
        const awayAssembly = createMensAwayAssemblyData();

        const assemblies: MockTeamAssembly[] = [
          { teamId: "home-team-123", assembly: homeAssembly },
          { teamId: "away-team-123", assembly: awayAssembly },
        ];

        // Create all 8 games for a complete men's match
        const games: MockGame[] = [
          // 4 Doubles games
          createMockGame({
            id: "game-d1",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p1" }),
              createMockPlayer({ id: "p2" }),
              createMockPlayer({ id: "p9" }),
              createMockPlayer({ id: "p10" }),
            ],
          }),
          createMockGame({
            id: "game-d2",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p3" }),
              createMockPlayer({ id: "p4" }),
              createMockPlayer({ id: "p11" }),
              createMockPlayer({ id: "p12" }),
            ],
          }),
          createMockGame({
            id: "game-d3",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p5" }),
              createMockPlayer({ id: "p6" }),
              createMockPlayer({ id: "p13" }),
              createMockPlayer({ id: "p14" }),
            ],
          }),
          createMockGame({
            id: "game-d4",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p7" }),
              createMockPlayer({ id: "p8" }),
              createMockPlayer({ id: "p15" }),
              createMockPlayer({ id: "p16" }),
            ],
          }),
          // 4 Singles games
          createMockGame({
            id: "game-s1",
            gameType: "S",
            players: [createMockPlayer({ id: "p1" }), createMockPlayer({ id: "p9" })],
          }),
          createMockGame({
            id: "game-s2",
            gameType: "S",
            players: [createMockPlayer({ id: "p2" }), createMockPlayer({ id: "p10" })],
          }),
          createMockGame({
            id: "game-s3",
            gameType: "S",
            players: [createMockPlayer({ id: "p3" }), createMockPlayer({ id: "p11" })],
          }),
          createMockGame({
            id: "game-s4",
            gameType: "S",
            players: [createMockPlayer({ id: "p4" }), createMockPlayer({ id: "p12" })],
          }),
        ];

        // Act
        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.M,
          mockEncounter
        );

        // Assert
        expect(result.size).toBe(8);

        // Verify the order matches the expected assembly position order
        const expectedOrder = [
          { gameId: "game-d1", position: "double1", type: "D" },
          { gameId: "game-d2", position: "double2", type: "D" },
          { gameId: "game-d3", position: "double3", type: "D" },
          { gameId: "game-d4", position: "double4", type: "D" },
          { gameId: "game-s1", position: "single1", type: "S" },
          { gameId: "game-s2", position: "single2", type: "S" },
          { gameId: "game-s3", position: "single3", type: "S" },
          { gameId: "game-s4", position: "single4", type: "S" },
        ];

        expectedOrder.forEach(({ gameId, position, type }) => {
          const mapping = Array.from(result.entries()).find(([game]) => game.id === gameId)?.[1];
          expect(mapping).toEqual({ assemblyPosition: position, gameType: type });
        });
      });
    });

    describe("Women's team assembly matching", () => {
      it("should match women's games with same order as men's", () => {
        // Arrange
        const homeAssembly = createWomensAssemblyData();
        const awayAssembly = createWomensAwayAssemblyData();

        const assemblies: MockTeamAssembly[] = [
          { teamId: "home-team-123", assembly: homeAssembly },
          { teamId: "away-team-123", assembly: awayAssembly },
        ];

        const games: MockGame[] = [
          createMockGame({
            id: "game-wd1",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p17" }),
              createMockPlayer({ id: "p18" }),
              createMockPlayer({ id: "p25" }),
              createMockPlayer({ id: "p26" }),
            ],
          }),
          createMockGame({
            id: "game-ws1",
            gameType: "S",
            players: [createMockPlayer({ id: "p17" }), createMockPlayer({ id: "p25" })],
          }),
        ];

        // Act
        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.F,
          mockEncounter
        );

        // Assert
        expect(result.size).toBe(2);

        const gameWD1Mapping = Array.from(result.entries()).find(
          ([game]) => game.id === "game-wd1"
        )?.[1];
        const gameWS1Mapping = Array.from(result.entries()).find(
          ([game]) => game.id === "game-ws1"
        )?.[1];

        expect(gameWD1Mapping).toEqual({ assemblyPosition: "double1", gameType: "D" });
        expect(gameWS1Mapping).toEqual({ assemblyPosition: "single1", gameType: "S" });
      });
    });

    describe("Mixed team assembly matching", () => {
      it("should match mixed games in correct mixed order", () => {
        // Arrange
        const homeAssembly = createMixedAssemblyData();
        const awayAssembly = createMixedAwayAssemblyData();

        const assemblies: MockTeamAssembly[] = [
          { teamId: "home-team-123", assembly: homeAssembly },
          { teamId: "away-team-123", assembly: awayAssembly },
        ];

        // Create games matching mixed order: D1, D2, S1, S3, S2, S4, D3, D4
        const games: MockGame[] = [
          // First doubles
          createMockGame({
            id: "game-mx-d1",
            gameType: "MX", // All mixed games are MX type
            players: [
              createMockPlayer({ id: "p33" }),
              createMockPlayer({ id: "p34" }),
              createMockPlayer({ id: "p41" }),
              createMockPlayer({ id: "p42" }),
            ],
          }),
          createMockGame({
            id: "game-mx-d2",
            gameType: "MX",
            players: [
              createMockPlayer({ id: "p35" }),
              createMockPlayer({ id: "p36" }),
              createMockPlayer({ id: "p43" }),
              createMockPlayer({ id: "p44" }),
            ],
          }),
          // Singles (note the mixed order: S1, S3, S2, S4)
          createMockGame({
            id: "game-mx-s1",
            gameType: "MX",
            players: [createMockPlayer({ id: "p33" }), createMockPlayer({ id: "p41" })],
          }),
          createMockGame({
            id: "game-mx-s3",
            gameType: "MX",
            players: [createMockPlayer({ id: "p34" }), createMockPlayer({ id: "p42" })],
          }),
        ];

        // Act
        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.MX,
          mockEncounter
        );

        // Assert
        expect(result.size).toBe(4);

        // Verify mixed order: double1, double2, single1, single3
        const expectedMappings = [
          { gameId: "game-mx-d1", position: "double1", type: "MX" },
          { gameId: "game-mx-d2", position: "double2", type: "MX" },
          { gameId: "game-mx-s1", position: "single1", type: "MX" },
          { gameId: "game-mx-s3", position: "single3", type: "MX" },
        ];

        expectedMappings.forEach(({ gameId, position, type }) => {
          const mapping = Array.from(result.entries()).find(([game]) => game.id === gameId)?.[1];
          expect(mapping).toEqual({ assemblyPosition: position, gameType: type });
        });
      });

      it("should handle complete 8-game mixed match in correct order", () => {
        // Arrange
        const homeAssembly = createMixedAssemblyData();
        const awayAssembly = createMixedAwayAssemblyData();

        const assemblies: MockTeamAssembly[] = [
          { teamId: "home-team-123", assembly: homeAssembly },
          { teamId: "away-team-123", assembly: awayAssembly },
        ];

        // Create all 8 mixed games
        const games: MockGame[] = [
          // Doubles
          createMockGame({
            id: "mx-d1",
            gameType: "MX",
            players: [
              createMockPlayer({ id: "p33" }),
              createMockPlayer({ id: "p34" }),
              createMockPlayer({ id: "p41" }),
              createMockPlayer({ id: "p42" }),
            ],
          }),
          createMockGame({
            id: "mx-d2",
            gameType: "MX",
            players: [
              createMockPlayer({ id: "p35" }),
              createMockPlayer({ id: "p36" }),
              createMockPlayer({ id: "p43" }),
              createMockPlayer({ id: "p44" }),
            ],
          }),
          createMockGame({
            id: "mx-d3",
            gameType: "MX",
            players: [
              createMockPlayer({ id: "p37" }),
              createMockPlayer({ id: "p38" }),
              createMockPlayer({ id: "p45" }),
              createMockPlayer({ id: "p46" }),
            ],
          }),
          createMockGame({
            id: "mx-d4",
            gameType: "MX",
            players: [
              createMockPlayer({ id: "p39" }),
              createMockPlayer({ id: "p40" }),
              createMockPlayer({ id: "p47" }),
              createMockPlayer({ id: "p48" }),
            ],
          }),
          // Singles
          createMockGame({
            id: "mx-s1",
            gameType: "MX",
            players: [createMockPlayer({ id: "p33" }), createMockPlayer({ id: "p41" })],
          }),
          createMockGame({
            id: "mx-s2",
            gameType: "MX",
            players: [createMockPlayer({ id: "p35" }), createMockPlayer({ id: "p43" })],
          }),
          createMockGame({
            id: "mx-s3",
            gameType: "MX",
            players: [createMockPlayer({ id: "p34" }), createMockPlayer({ id: "p42" })],
          }),
          createMockGame({
            id: "mx-s4",
            gameType: "MX",
            players: [createMockPlayer({ id: "p36" }), createMockPlayer({ id: "p44" })],
          }),
        ];

        // Act
        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.MX,
          mockEncounter
        );

        // Assert
        expect(result.size).toBe(8);

        // Verify mixed order: D1, D2, S1, S3, S2, S4, D3, D4
        const expectedOrder = [
          { gameId: "mx-d1", position: "double1" },
          { gameId: "mx-d2", position: "double2" },
          { gameId: "mx-s1", position: "single1" },
          { gameId: "mx-s3", position: "single3" },
          { gameId: "mx-s2", position: "single2" },
          { gameId: "mx-s4", position: "single4" },
          { gameId: "mx-d3", position: "double3" },
          { gameId: "mx-d4", position: "double4" },
        ];

        expectedOrder.forEach(({ gameId, position }) => {
          const mapping = Array.from(result.entries()).find(([game]) => game.id === gameId)?.[1];
          expect(mapping).toEqual({ assemblyPosition: position, gameType: "MX" });
        });
      });
    });

    describe("edge cases and error handling", () => {
      it("should return empty map when no assemblies provided", () => {
        const games = [createMockGame()];

        const result = service.matchGamesToAssembly(
          games as Game[],
          [],
          SubEventTypeEnum.M,
          mockEncounter
        );

        expect(result.size).toBe(0);
      });

      it("should return empty map when assembly data is missing", () => {
        const games = [createMockGame()];
        const assemblies = [
          { teamId: "home-team-123", assembly: null },
          { teamId: "away-team-123", assembly: null },
        ];

        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.M,
          mockEncounter
        );

        expect(result.size).toBe(0);
      });

      it("should skip positions with missing players", () => {
        const homeAssembly = { double1: ["p1", "p2"], single1: null };
        const awayAssembly = { double1: ["p9", "p10"], single1: "p9" };

        const assemblies = [
          { teamId: "home-team-123", assembly: homeAssembly },
          { teamId: "away-team-123", assembly: awayAssembly },
        ];

        const games = [
          createMockGame({
            id: "game-d1",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p1" }),
              createMockPlayer({ id: "p2" }),
              createMockPlayer({ id: "p9" }),
              createMockPlayer({ id: "p10" }),
            ],
          }),
        ];

        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.M,
          mockEncounter
        );

        expect(result.size).toBe(1);
        const mapping = Array.from(result.values())[0];
        expect(mapping.assemblyPosition).toBe("double1");
      });

      it("should filter out games with unknown players", () => {
        const homeAssembly = createMensAssemblyData();
        const awayAssembly = createMensAwayAssemblyData();

        const assemblies = [
          { teamId: "home-team-123", assembly: homeAssembly },
          { teamId: "away-team-123", assembly: awayAssembly },
        ];

        const games = [
          createMockGame({
            id: "game-with-unknown",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p1", memberId: "unknown-player-1" }),
              createMockPlayer({ id: "p2" }),
              createMockPlayer({ id: "p9" }),
              createMockPlayer({ id: "p10" }),
            ],
          }),
        ];

        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.M,
          mockEncounter
        );

        // Should not match because one player is unknown
        expect(result.size).toBe(0);
      });

      it("should not match the same game twice", () => {
        const homeAssembly = {
          double1: ["p1", "p2"],
          double2: ["p1", "p2"], // Same players as double1
        };
        const awayAssembly = {
          double1: ["p9", "p10"],
          double2: ["p9", "p10"], // Same players as double1
        };

        const assemblies = [
          { teamId: "home-team-123", assembly: homeAssembly },
          { teamId: "away-team-123", assembly: awayAssembly },
        ];

        const games = [
          createMockGame({
            id: "game-d1",
            gameType: "D",
            players: [
              createMockPlayer({ id: "p1" }),
              createMockPlayer({ id: "p2" }),
              createMockPlayer({ id: "p9" }),
              createMockPlayer({ id: "p10" }),
            ],
          }),
        ];

        const result = service.matchGamesToAssembly(
          games as Game[],
          assemblies,
          SubEventTypeEnum.M,
          mockEncounter
        );

        // Should only match once (to double1, not double2)
        expect(result.size).toBe(1);
        const mapping = Array.from(result.values())[0];
        expect(mapping.assemblyPosition).toBe("double1");
      });
    });
  });
});
