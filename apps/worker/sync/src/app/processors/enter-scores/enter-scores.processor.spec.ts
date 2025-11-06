import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Job } from "bull";
import { TransactionManager } from "@badman/backend-queue";
import { EnterScoresProcessor } from "./enter-scores.processor";
import { EnterScoresRepository } from "./repository";
import { EnterScoresBrowserService } from "./browser.service";
import { EnterScoresValidationService } from "./validation.service";
import { EnterScoresNotificationService } from "./notification.service";

// Mock data interfaces
interface MockPlayer {
  id: string;
  memberId: string;
  gender: "M" | "F";
  firstName: string;
  lastName: string;
  fullName: string;
}

interface MockGame {
  id: string;
  visualCode: string;
  order: number;
  set1Team1: number;
  set1Team2: number;
  set2Team1: number;
  set2Team2: number;
  set3Team1?: number;
  set3Team2?: number;
  gameType: "S" | "D" | "MX";
  winner: number;
  players: MockPlayer[];
}

interface MockEncounter {
  id: string;
  visualCode: string;
  shuttle: string;
  startHour: string;
  endHour: string;
  homeTeamId: string;
  awayTeamId: string;
  games: MockGame[];
  gameLeader: MockPlayer;
  drawCompetition: {
    id: string;
    subEventCompetition: {
      id: string;
      eventCompetition: {
        id: string;
        visualCode: string;
      };
    };
  };
  assembly: {
    id: string;
    name: string;
  };
  home: {
    id: string;
    name: string;
    type: string;
  };
  away: {
    id: string;
    name: string;
    type: string;
  };
}

describe("EnterScoresProcessor", () => {
  let processor: EnterScoresProcessor;
  let mockRepository: jest.Mocked<EnterScoresRepository>;
  let mockBrowserService: jest.Mocked<EnterScoresBrowserService>;
  let mockValidationService: jest.Mocked<EnterScoresValidationService>;
  let mockNotificationService: jest.Mocked<EnterScoresNotificationService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockTransactionManager: jest.Mocked<TransactionManager>;

  // Mock data factory functions
  const createMockPlayer = (overrides: Partial<MockPlayer> = {}): MockPlayer => ({
    id: "player-123",
    memberId: "MB123456",
    gender: "M",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    ...overrides,
  });

  const createMockGame = (overrides: Partial<MockGame> = {}): MockGame => ({
    id: "game-123",
    visualCode: "G001",
    order: 1,
    set1Team1: 21,
    set1Team2: 19,
    set2Team1: 21,
    set2Team2: 15,
    set3Team1: undefined,
    set3Team2: undefined,
    gameType: "S",
    winner: 1,
    players: [
      createMockPlayer({
        id: "p1",
        memberId: "MB111",
        firstName: "Alice",
        lastName: "Smith",
        fullName: "Alice Smith",
      }),
      createMockPlayer({
        id: "p2",
        memberId: "MB222",
        firstName: "Bob",
        lastName: "Jones",
        fullName: "Bob Jones",
      }),
    ],
    ...overrides,
  });

  const createMockEncounter = (overrides: Partial<MockEncounter> = {}): MockEncounter => ({
    id: "encounter-123",
    visualCode: "ENC001",
    shuttle: "A1",
    startHour: "09:00",
    endHour: "11:00",
    homeTeamId: "home-team-123",
    awayTeamId: "away-team-123",
    games: [
      createMockGame({ order: 1, gameType: "S" }),
      createMockGame({
        id: "game-456",
        visualCode: "G002",
        order: 2,
        gameType: "D",
        players: [
          createMockPlayer({
            id: "p3",
            memberId: "MB333",
            firstName: "Charlie",
            lastName: "Brown",
            fullName: "Charlie Brown",
          }),
          createMockPlayer({
            id: "p4",
            memberId: "MB444",
            firstName: "Diana",
            lastName: "Prince",
            fullName: "Diana Prince",
          }),
          createMockPlayer({
            id: "p5",
            memberId: "MB555",
            firstName: "Eve",
            lastName: "Wilson",
            fullName: "Eve Wilson",
          }),
          createMockPlayer({
            id: "p6",
            memberId: "MB666",
            firstName: "Frank",
            lastName: "Miller",
            fullName: "Frank Miller",
          }),
        ],
      }),
      createMockGame({
        id: "game-789",
        visualCode: "G003",
        order: 3,
        gameType: "MX",
        set1Team1: 15,
        set1Team2: 21,
        set2Team1: 21,
        set2Team2: 18,
        set3Team1: 21,
        set3Team2: 19,
        winner: 2,
        players: [
          createMockPlayer({
            id: "p7",
            memberId: "MB777",
            firstName: "Grace",
            lastName: "Lee",
            fullName: "Grace Lee",
            gender: "F",
          }),
          createMockPlayer({
            id: "p8",
            memberId: "MB888",
            firstName: "Henry",
            lastName: "Davis",
            fullName: "Henry Davis",
          }),
          createMockPlayer({
            id: "p9",
            memberId: "MB999",
            firstName: "Ivy",
            lastName: "Chen",
            fullName: "Ivy Chen",
            gender: "F",
          }),
          createMockPlayer({
            id: "p10",
            memberId: "MB000",
            firstName: "Jack",
            lastName: "Taylor",
            fullName: "Jack Taylor",
          }),
        ],
      }),
    ],
    gameLeader: createMockPlayer({
      id: "leader-123",
      memberId: "LEAD001",
      firstName: "Leader",
      lastName: "Person",
      fullName: "Leader Person",
    }),
    drawCompetition: {
      id: "draw-123",
      subEventCompetition: {
        id: "subevent-123",
        eventCompetition: {
          id: "event-123",
          visualCode: "EVT001",
        },
      },
    },
    assembly: {
      id: "assembly-123",
      name: "Test Assembly",
    },
    home: {
      id: "home-team-123",
      name: "Home Team",
      type: "CLUB",
    },
    away: {
      id: "away-team-123",
      name: "Away Team",
      type: "CLUB",
    },
    ...overrides,
  });

  const createMockJob = (encounterId: string = "encounter-123"): Job<{ encounterId: string }> =>
    ({
      id: "job-123",
      data: { encounterId },
    }) as Job<{ encounterId: string }>;

  beforeEach(async () => {
    // Create mocks
    mockRepository = {
      getEncounterById: jest.fn(),
      constructToernooiUrl: jest.fn(),
    } as any;

    mockBrowserService = {
      initializeBrowser: jest.fn(),
      acceptCookies: jest.fn(),
      signIn: jest.fn(),
      enterEditMode: jest.fn(),
      clearFields: jest.fn(),
      enterGames: jest.fn(),
      enterGameLeader: jest.fn(),
      enterShuttle: jest.fn(),
      enterStartHour: jest.fn(),
      enterEndHour: jest.fn(),
      enableInputValidation: jest.fn(),
      validateRowMessages: jest.fn(),
      clickSaveButton: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    mockValidationService = {
      validateCredentials: jest.fn(),
      validateEncounter: jest.fn(),
      isTimeoutError: jest.fn(),
      logValidationResult: jest.fn(),
    } as any;

    mockNotificationService = {
      shouldSendNotification: jest.fn(),
      createDevRecipient: jest.fn(),
      sendSuccessNotification: jest.fn(),
      sendFailureNotification: jest.fn(),
      logNotificationSkipped: jest.fn(),
    } as any;

    // Setup config service with default credentials for constructor
    mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === "VR_API_USER") return "testuser";
        if (key === "VR_API_PASS") return "testpass";
        return undefined;
      }),
    } as any;

    mockTransactionManager = {
      transaction: jest.fn(),
      getTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnterScoresProcessor,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TransactionManager, useValue: mockTransactionManager },
        { provide: EnterScoresRepository, useValue: mockRepository },
        { provide: EnterScoresBrowserService, useValue: mockBrowserService },
        { provide: EnterScoresValidationService, useValue: mockValidationService },
        { provide: EnterScoresNotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    processor = module.get<EnterScoresProcessor>(EnterScoresProcessor);
  });

  describe("enterScores", () => {
    describe("validation scenarios", () => {
      it("should handle invalid credentials gracefully", async () => {
        // Arrange
        const job = createMockJob();
        mockConfigService.get.mockImplementation(() => undefined); // No credentials
        mockValidationService.validateCredentials.mockReturnValue({
          isValid: false,
          errors: ["Username not provided", "Password not provided"],
        });

        // Act
        await processor.enterScores(job);

        // Assert
        expect(mockValidationService.validateCredentials).toHaveBeenCalled();
        expect(mockRepository.getEncounterById).not.toHaveBeenCalled();
        expect(mockBrowserService.initializeBrowser).not.toHaveBeenCalled();
      });

      it("should handle encounter not found gracefully", async () => {
        // Arrange
        const job = createMockJob();
        mockValidationService.validateCredentials.mockReturnValue({ isValid: true, errors: [] });
        mockRepository.getEncounterById.mockResolvedValue(null);
        mockValidationService.validateEncounter.mockReturnValue({
          isValid: false,
          errors: ["Encounter not found"],
        });

        // Act
        await processor.enterScores(job);

        // Assert
        expect(mockRepository.getEncounterById).toHaveBeenCalledWith("encounter-123");
        expect(mockValidationService.validateEncounter).toHaveBeenCalledWith(null);
        expect(mockValidationService.logValidationResult).toHaveBeenCalled();
        expect(mockBrowserService.initializeBrowser).not.toHaveBeenCalled();
      });

      it("should handle invalid encounter data gracefully", async () => {
        // Arrange
        const job = createMockJob();
        const invalidEncounter = createMockEncounter({ visualCode: "" }); // Invalid encounter
        mockValidationService.validateCredentials.mockReturnValue({ isValid: true, errors: [] });
        mockRepository.getEncounterById.mockResolvedValue(invalidEncounter as any);
        mockValidationService.validateEncounter.mockReturnValue({
          isValid: false,
          errors: ["Visual code is required"],
        });

        // Act
        await processor.enterScores(job);

        // Assert
        expect(mockValidationService.validateEncounter).toHaveBeenCalledWith(invalidEncounter);
        expect(mockValidationService.logValidationResult).toHaveBeenCalled();
        expect(mockBrowserService.initializeBrowser).not.toHaveBeenCalled();
      });
    });

    describe("successful workflow scenarios", () => {
      let mockEncounter: MockEncounter;
      let job: Job<{ encounterId: string }>;

      beforeEach(() => {
        job = createMockJob();
        mockEncounter = createMockEncounter();

        // Setup successful validation
        mockValidationService.validateCredentials.mockReturnValue({ isValid: true, errors: [] });
        mockValidationService.validateEncounter.mockReturnValue({ isValid: true, errors: [] });
        mockRepository.getEncounterById.mockResolvedValue(mockEncounter as any);

        // Setup transaction manager
        mockTransactionManager.transaction.mockResolvedValue("tx-123");
        mockTransactionManager.getTransaction.mockResolvedValue({} as any);

        // Setup notification service
        mockNotificationService.shouldSendNotification.mockReturnValue(true);
        mockNotificationService.createDevRecipient.mockReturnValue({
          fullName: "Dev Team",
          email: "dev@example.com",
          slug: "dev",
        });
      });

      it("should execute complete workflow with all game types", async () => {
        // Arrange
        mockConfigService.get.mockImplementation((key) => {
          switch (key) {
            case "ENTER_SCORES_ENABLED":
              return true; // Enable saving
            case "DEV_EMAIL_DESTINATION":
              return "dev@example.com";
            default:
              return undefined;
          }
        });

        // Act
        await processor.enterScores(job);

        // Assert - Browser initialization
        expect(mockBrowserService.initializeBrowser).toHaveBeenCalledWith({
          headless: true,
          username: "testuser",
          password: "testpass",
          hangBeforeBrowserCleanup: false,
        });
        expect(mockBrowserService.acceptCookies).toHaveBeenCalled();
        expect(mockBrowserService.signIn).toHaveBeenCalledWith("testuser", "testpass");

        // Assert - Navigation and setup
        expect(mockBrowserService.enterEditMode).toHaveBeenCalledWith(mockEncounter);
        expect(mockBrowserService.clearFields).toHaveBeenCalled();

        // Assert - Game entry with transaction
        expect(mockTransactionManager.transaction).toHaveBeenCalled();
        expect(mockBrowserService.enterGames).toHaveBeenCalledWith(mockEncounter, {});
        expect(mockTransactionManager.commitTransaction).toHaveBeenCalledWith("tx-123");

        // Assert - Additional data entry
        expect(mockBrowserService.enterGameLeader).toHaveBeenCalledWith("Leader Person");
        expect(mockBrowserService.enterShuttle).toHaveBeenCalledWith("A1");
        expect(mockBrowserService.enterStartHour).toHaveBeenCalledWith("09:00");
        expect(mockBrowserService.enterEndHour).toHaveBeenCalledWith("11:00");

        // Assert - Validation and save
        expect(mockBrowserService.enableInputValidation).toHaveBeenCalled();
        expect(mockBrowserService.validateRowMessages).toHaveBeenCalled();
        expect(mockBrowserService.clickSaveButton).toHaveBeenCalled();

        // Assert - Success notification
        expect(mockNotificationService.sendSuccessNotification).toHaveBeenCalled();
        expect(mockBrowserService.cleanup).toHaveBeenCalledWith(false);
      });

      it("should handle encounter without optional fields", async () => {
        // Arrange
        const minimalEncounter = createMockEncounter({
          gameLeader: undefined as any,
          shuttle: "",
          startHour: "",
          endHour: "",
        });
        mockRepository.getEncounterById.mockResolvedValue(minimalEncounter as any);

        // Act
        await processor.enterScores(job);

        // Assert - Should not call methods for missing data
        expect(mockBrowserService.enterGameLeader).not.toHaveBeenCalled();
        expect(mockBrowserService.enterShuttle).not.toHaveBeenCalled();
        expect(mockBrowserService.enterStartHour).not.toHaveBeenCalled();
        expect(mockBrowserService.enterEndHour).not.toHaveBeenCalled();

        // Assert - Core workflow still executed
        expect(mockBrowserService.enterGames).toHaveBeenCalled();
        expect(mockBrowserService.enableInputValidation).toHaveBeenCalled();
      });

      it("should handle visual sync mode correctly", async () => {
        // Arrange
        mockConfigService.get.mockImplementation((key) => {
          switch (key) {
            case "VISUAL_SYNC_ENABLED":
              return true;
            case "HANG_BEFORE_BROWSER_CLEANUP":
              return true;
            default:
              return undefined;
          }
        });

        // Act
        await processor.enterScores(job);

        // Assert - Browser config should reflect visual mode
        expect(mockBrowserService.initializeBrowser).toHaveBeenCalledWith({
          headless: false, // Visual mode
          username: "testuser",
          password: "testpass",
          hangBeforeBrowserCleanup: true,
        });
        expect(mockBrowserService.cleanup).toHaveBeenCalledWith(true);
      });

      it("should skip saving in non-production without ENTER_SCORES_ENABLED", async () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";
        mockConfigService.get.mockImplementation((key) => {
          if (key === "ENTER_SCORES_ENABLED") return false;
          return undefined;
        });

        // Act
        await processor.enterScores(job);

        // Assert - Should not save
        expect(mockBrowserService.clickSaveButton).not.toHaveBeenCalled();
        expect(mockBrowserService.enableInputValidation).toHaveBeenCalled();
        expect(mockBrowserService.validateRowMessages).toHaveBeenCalled();

        // Cleanup
        process.env.NODE_ENV = originalEnv;
      });

      it("should skip notifications when not configured", async () => {
        // Arrange
        mockNotificationService.shouldSendNotification.mockReturnValue(false);

        // Act
        await processor.enterScores(job);

        // Assert
        expect(mockNotificationService.sendSuccessNotification).not.toHaveBeenCalled();
        expect(mockNotificationService.logNotificationSkipped).toHaveBeenCalled();
      });
    });

    describe("error handling scenarios", () => {
      let mockEncounter: MockEncounter;
      let job: Job<{ encounterId: string }>;

      beforeEach(() => {
        job = createMockJob();
        mockEncounter = createMockEncounter();

        mockValidationService.validateCredentials.mockReturnValue({ isValid: true, errors: [] });
        mockValidationService.validateEncounter.mockReturnValue({ isValid: true, errors: [] });
        mockRepository.getEncounterById.mockResolvedValue(mockEncounter as any);
        mockTransactionManager.transaction.mockResolvedValue("tx-123");
        mockTransactionManager.getTransaction.mockResolvedValue({} as any);
      });

      it("should handle browser initialization failure", async () => {
        // Arrange
        const browserError = new Error("Browser failed to start");
        mockBrowserService.initializeBrowser.mockRejectedValue(browserError);
        mockNotificationService.shouldSendNotification.mockReturnValue(true);
        mockNotificationService.createDevRecipient.mockReturnValue({
          fullName: "Dev Team",
          email: "dev@example.com",
          slug: "dev",
        });
        mockRepository.constructToernooiUrl.mockReturnValue(
          "https://www.toernooi.nl/sport/teammatch.aspx?id=EVT001&match=ENC001"
        );

        // Act & Assert
        await expect(processor.enterScores(job)).rejects.toThrow("Browser failed to start");
        expect(mockNotificationService.sendFailureNotification).toHaveBeenCalledWith(
          "encounter-123", // encounterId
          "Browser failed to start", // error message
          expect.objectContaining({ email: "dev@example.com" }), // recipient
          "ENC001", // encounter visual code
          "https://www.toernooi.nl/sport/teammatch.aspx?id=EVT001&match=ENC001" // toernooiUrl
        );
      });

      it("should handle transaction rollback on enterGames failure", async () => {
        // Arrange
        const gameError = new Error("Game entry failed");
        mockBrowserService.enterGames.mockRejectedValue(gameError);

        // Act & Assert
        await expect(processor.enterScores(job)).rejects.toThrow("Game entry failed");
        expect(mockTransactionManager.rollbackTransaction).toHaveBeenCalledWith("tx-123");
      });

      it("should handle timeout errors gracefully", async () => {
        // Arrange
        const timeoutError = new Error("Timeout waiting for element");
        mockBrowserService.enterEditMode.mockRejectedValue(timeoutError);
        mockValidationService.isTimeoutError.mockReturnValue(true);
        mockNotificationService.shouldSendNotification.mockReturnValue(true);
        mockNotificationService.createDevRecipient.mockReturnValue({
          fullName: "Dev Team",
          email: "dev@example.com",
          slug: "dev",
        });
        mockRepository.constructToernooiUrl.mockReturnValue(
          "https://www.toernooi.nl/sport/teammatch.aspx?id=EVT001&match=ENC001"
        );

        // Act & Assert
        await expect(processor.enterScores(job)).rejects.toThrow("Timeout waiting for element");
        expect(mockValidationService.isTimeoutError).toHaveBeenCalledWith(timeoutError);
        expect(mockNotificationService.sendFailureNotification).toHaveBeenCalledWith(
          "encounter-123", // encounterId
          "Timeout waiting for element", // error message
          expect.objectContaining({ email: "dev@example.com" }), // recipient
          "ENC001", // encounter visual code
          "https://www.toernooi.nl/sport/teammatch.aspx?id=EVT001&match=ENC001" // toernooiUrl
        );
        expect(mockBrowserService.cleanup).toHaveBeenCalledWith(false);
      });

      it("should always cleanup browser even on failure", async () => {
        // Arrange
        const error = new Error("Some error");
        mockBrowserService.enterEditMode.mockRejectedValue(error);
        mockNotificationService.shouldSendNotification.mockReturnValue(false);

        // Act & Assert
        await expect(processor.enterScores(job)).rejects.toThrow("Some error");
        expect(mockBrowserService.cleanup).toHaveBeenCalledWith(false);
      });
    });

    describe("edge cases", () => {
      it("should handle encounter with complex game structure", async () => {
        // Arrange
        const complexEncounter = createMockEncounter({
          games: [
            createMockGame({ gameType: "S", order: 1 }),
            createMockGame({ gameType: "S", order: 2 }),
            createMockGame({ gameType: "D", order: 3 }),
            createMockGame({ gameType: "D", order: 4 }),
            createMockGame({ gameType: "MX", order: 5 }),
            createMockGame({ gameType: "MX", order: 6 }),
          ],
        });

        mockValidationService.validateCredentials.mockReturnValue({ isValid: true, errors: [] });
        mockValidationService.validateEncounter.mockReturnValue({ isValid: true, errors: [] });
        mockRepository.getEncounterById.mockResolvedValue(complexEncounter as any);
        mockTransactionManager.transaction.mockResolvedValue("tx-123");
        mockTransactionManager.getTransaction.mockResolvedValue({} as any);
        mockNotificationService.shouldSendNotification.mockReturnValue(false);

        const job = createMockJob();

        // Act
        await processor.enterScores(job);

        // Assert
        expect(mockBrowserService.enterGames).toHaveBeenCalledWith(complexEncounter, {});
        expect(mockTransactionManager.commitTransaction).toHaveBeenCalled();
      });

      it("should handle production environment correctly", async () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        mockValidationService.validateCredentials.mockReturnValue({ isValid: true, errors: [] });
        mockValidationService.validateEncounter.mockReturnValue({ isValid: true, errors: [] });
        mockRepository.getEncounterById.mockResolvedValue(createMockEncounter() as any);
        mockTransactionManager.transaction.mockResolvedValue("tx-123");
        mockTransactionManager.getTransaction.mockResolvedValue({} as any);
        mockNotificationService.shouldSendNotification.mockReturnValue(false);

        const job = createMockJob();

        // Act
        await processor.enterScores(job);

        // Assert - Should save in production even without ENTER_SCORES_ENABLED
        expect(mockBrowserService.clickSaveButton).toHaveBeenCalled();

        // Cleanup
        process.env.NODE_ENV = originalEnv;
      });
    });
  });
});
