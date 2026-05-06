import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { ExportController } from "./export.controller";
import { TeamsService } from "../services/export/teams.service";
import { Player } from "@badman/backend-database";
import { toCSV, toXlsx } from "@badman/backend-utils";

jest.mock("@badman/backend-utils", () => ({
  toXlsx: jest.fn(),
  toCSV: jest.fn(),
}));

const mockToXlsx = toXlsx as jest.Mock;
const mockToCSV = toCSV as jest.Mock;

// Valid UUID v4 that passes the IsUUID regex ([1-5] version, [89ab] variant)
const VALID_EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

const MOCK_HEADERS = [
  "Club ID",
  "Clubnaam",
  "Ploegnaam",
  "Voorkeur speelmoment (dag)",
  "Voorkeur speelmoment (tijdstip)",
] as const;

function mockUser(overrides: Partial<Player> = {}): Player {
  return {
    id: "user-1",
    hasAnyPermission: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as Player;
}

function mockRes() {
  return {
    header: jest.fn(),
    send: jest.fn(),
  } as any;
}

describe("ExportController", () => {
  let controller: ExportController;
  let teamsService: jest.Mocked<TeamsService>;

  beforeEach(async () => {
    mockToXlsx.mockReturnValue(Buffer.from("xlsx-data"));
    mockToCSV.mockReturnValue("csv-data");

    teamsService = {
      getTeams: jest.fn().mockResolvedValue({
        headers: MOCK_HEADERS,
        rows: [["club-001", "Club A", "Club A 1H", "Maandag", "09:00"]],
        eventName: "Test Competition 2025",
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [{ provide: TeamsService, useValue: teamsService }],
    }).compile();

    controller = module.get<ExportController>(ExportController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /export/teams — happy path", () => {
    it("returns XLSX content type by default (no format param)", async () => {
      const res = mockRes();

      await controller.getTeams(
        mockUser(),
        res,
        { eventId: VALID_EVENT_ID, format: undefined as any }
      );

      expect(res.header).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    });

    it("returns XLSX content type when format=xlsx", async () => {
      const res = mockRes();

      await controller.getTeams(
        mockUser(),
        res,
        { eventId: VALID_EVENT_ID, format: "xlsx" }
      );

      expect(res.header).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    });

    it("returns CSV content type when format=csv", async () => {
      const res = mockRes();

      await controller.getTeams(
        mockUser(),
        res,
        { eventId: VALID_EVENT_ID, format: "csv" }
      );

      expect(res.header).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    });

    it("sets Content-Disposition with eventName for XLSX", async () => {
      const res = mockRes();

      await controller.getTeams(
        mockUser(),
        res,
        { eventId: VALID_EVENT_ID, format: "xlsx" }
      );

      expect(res.header).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="Test Competition 2025.xlsx"'
      );
    });

    it("sets Content-Disposition with eventName for CSV", async () => {
      const res = mockRes();

      await controller.getTeams(
        mockUser(),
        res,
        { eventId: VALID_EVENT_ID, format: "csv" }
      );

      expect(res.header).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="Test Competition 2025.csv"'
      );
    });

    it("calls toXlsx with sheet name 'Teams'", async () => {
      const res = mockRes();

      await controller.getTeams(
        mockUser(),
        res,
        { eventId: VALID_EVENT_ID, format: "xlsx" }
      );

      expect(mockToXlsx).toHaveBeenCalledWith("Teams", MOCK_HEADERS, expect.any(Array));
    });

    it("calls res.send with the xlsx buffer", async () => {
      const xlsxBuffer = Buffer.from("xlsx-data");
      mockToXlsx.mockReturnValue(xlsxBuffer);
      const res = mockRes();

      await controller.getTeams(
        mockUser(),
        res,
        { eventId: VALID_EVENT_ID, format: "xlsx" }
      );

      expect(res.send).toHaveBeenCalledWith(xlsxBuffer);
    });
  });

  describe("GET /export/teams — auth", () => {
    it("throws UnauthorizedException when user has no id", async () => {
      const res = mockRes();

      await expect(
        controller.getTeams(
          { id: undefined } as unknown as Player,
          res,
          { eventId: VALID_EVENT_ID, format: "xlsx" }
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(teamsService.getTeams).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when user lacks edit:competition", async () => {
      const res = mockRes();

      await expect(
        controller.getTeams(
          mockUser({ hasAnyPermission: jest.fn().mockResolvedValue(false) } as any),
          res,
          { eventId: VALID_EVENT_ID, format: "xlsx" }
        )
      ).rejects.toThrow(ForbiddenException);

      expect(teamsService.getTeams).not.toHaveBeenCalled();
    });
  });

  describe("GET /export/teams — validation", () => {
    it("throws BadRequestException for invalid format", async () => {
      const res = mockRes();

      await expect(
        controller.getTeams(
          mockUser(),
          res,
          { eventId: VALID_EVENT_ID, format: "pdf" as any }
        )
      ).rejects.toThrow(BadRequestException);

      expect(teamsService.getTeams).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when eventId is missing", async () => {
      const res = mockRes();

      await expect(
        controller.getTeams(
          mockUser(),
          res,
          { eventId: "", format: "xlsx" }
        )
      ).rejects.toThrow(BadRequestException);

      expect(teamsService.getTeams).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when eventId is not a UUID", async () => {
      const res = mockRes();

      await expect(
        controller.getTeams(
          mockUser(),
          res,
          { eventId: "not-a-uuid", format: "xlsx" }
        )
      ).rejects.toThrow(BadRequestException);

      expect(teamsService.getTeams).not.toHaveBeenCalled();
    });
  });
});
