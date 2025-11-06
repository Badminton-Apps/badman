import { Test, TestingModule } from "@nestjs/testing";
import { EnterScoresValidationService } from "./validation.service";

describe("EnterScoresValidationService", () => {
  let service: EnterScoresValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnterScoresValidationService],
    }).compile();

    service = module.get<EnterScoresValidationService>(EnterScoresValidationService);
  });

  describe("validateCredentials", () => {
    it("should return valid result when both username and password are provided", () => {
      const result = service.validateCredentials("testuser", "testpass");

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return invalid result when username is missing", () => {
      const result = service.validateCredentials(undefined, "testpass");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Username not provided");
    });

    it("should return invalid result when password is missing", () => {
      const result = service.validateCredentials("testuser", undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password not provided");
    });

    it("should return invalid result when both credentials are missing", () => {
      const result = service.validateCredentials();

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(["Username not provided", "Password not provided"]);
    });
  });

  describe("validateEncounter", () => {
    it("should return invalid result when encounter is null", () => {
      const result = service.validateEncounter(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Encounter not found");
    });

    it("should return invalid result when encounter is missing visual code", () => {
      const mockEncounter = {
        id: "test-id",
        visualCode: "",
        drawCompetition: {
          subEventCompetition: {
            eventCompetition: {
              visualCode: "EVENT001",
            },
          },
        },
        games: [{ id: "game1" }],
      } as any;

      const result = service.validateEncounter(mockEncounter);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Encounter missing visual code");
    });

    it("should return invalid result when encounter is missing event visual code", () => {
      const mockEncounter = {
        id: "test-id",
        visualCode: "ENC001",
        drawCompetition: null,
        games: [{ id: "game1" }],
      } as any;

      const result = service.validateEncounter(mockEncounter);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Encounter missing event visual code");
    });

    it("should return invalid result when encounter has no games", () => {
      const mockEncounter = {
        id: "test-id",
        visualCode: "ENC001",
        drawCompetition: {
          subEventCompetition: {
            eventCompetition: {
              visualCode: "EVENT001",
            },
          },
        },
        games: [],
      } as any;

      const result = service.validateEncounter(mockEncounter);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Encounter has no games");
    });

    it("should return valid result for complete encounter", () => {
      const mockEncounter = {
        id: "test-id",
        visualCode: "ENC001",
        drawCompetition: {
          subEventCompetition: {
            eventCompetition: {
              visualCode: "EVENT001",
            },
          },
        },
        games: [{ id: "game1" }, { id: "game2" }],
      } as any;

      const result = service.validateEncounter(mockEncounter);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("isTimeoutError", () => {
    it("should return true for timeout errors", () => {
      const timeoutError = new Error("Navigation timeout exceeded");

      expect(service.isTimeoutError(timeoutError)).toBe(true);
    });

    it("should return true for TimeoutError", () => {
      const timeoutError = { name: "TimeoutError", message: "Timeout" };

      expect(service.isTimeoutError(timeoutError)).toBe(true);
    });

    it("should return false for non-timeout errors", () => {
      const regularError = new Error("Some other error");

      expect(service.isTimeoutError(regularError)).toBe(false);
    });
  });

  describe("shouldRetryJob", () => {
    it("should return true for any error (current implementation)", () => {
      const error = new Error("Any error");

      expect(service.shouldRetryJob(error)).toBe(true);
    });
  });
});
