import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EventCompetition, Player } from "@badman/backend-database";
import { EnrollmentController } from "./excel.controller";
import { ExcelService } from "../services/excel.services";

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const mockRes = () => ({
  header: jest.fn(),
  send: jest.fn(),
});

const mockPlayer = (id: string | null, hasPermission: boolean) =>
  ({
    id,
    hasAnyPermission: jest.fn().mockResolvedValue(hasPermission),
  }) as unknown as Player;

describe("EnrollmentController", () => {
  let controller: EnrollmentController;
  let excelService: jest.Mocked<Pick<ExcelService, "GetEnrollment">>;

  beforeEach(async () => {
    excelService = {
      GetEnrollment: jest.fn().mockResolvedValue({
        buffer: Buffer.from("xlsx"),
        event: { name: "Test Event" },
      }),
    };

    jest
      .spyOn(EventCompetition, "findByPk")
      .mockResolvedValue({ name: "Test Event" } as EventCompetition);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentController],
      providers: [{ provide: ExcelService, useValue: excelService }],
    }).compile();

    controller = module.get(EnrollmentController);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("auth", () => {
    it("throws 401 when no user is present", async () => {
      const user = mockPlayer(null, false);
      await expect(
        controller.getBaseplayersEnrollment(user, mockRes() as any, { eventId: "some-id" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws 403 when user lacks edit:competition permission", async () => {
      const user = mockPlayer("user-1", false);
      await expect(
        controller.getBaseplayersEnrollment(user, mockRes() as any, { eventId: "some-id" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("proceeds to service call when user has permission", async () => {
      const user = mockPlayer("user-1", true);
      const res = mockRes();
      await controller.getBaseplayersEnrollment(user, res as any, { eventId: VALID_UUID });
      expect(excelService.GetEnrollment).toHaveBeenCalledWith(VALID_UUID);
    });

    it("sends the buffer as a response when authorized", async () => {
      const user = mockPlayer("user-1", true);
      const res = mockRes();
      await controller.getBaseplayersEnrollment(user, res as any, { eventId: VALID_UUID });
      expect(res.send).toHaveBeenCalledWith(Buffer.from("xlsx"));
    });
  });

  describe("validation", () => {
    let authorizedUser: Player;

    beforeEach(() => {
      authorizedUser = mockPlayer("user-1", true);
    });

    it("throws 400 when eventId is missing", async () => {
      await expect(
        controller.getBaseplayersEnrollment(authorizedUser, mockRes() as any, { eventId: "" })
      ).rejects.toThrow(BadRequestException);
    });

    it("throws 400 when eventId is not a valid UUID", async () => {
      await expect(
        controller.getBaseplayersEnrollment(authorizedUser, mockRes() as any, {
          eventId: "not-a-uuid",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("throws 404 when eventId UUID does not match a competition", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);
      await expect(
        controller.getBaseplayersEnrollment(authorizedUser, mockRes() as any, {
          eventId: VALID_UUID,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it("proceeds to service call when UUID is valid and competition exists", async () => {
      await controller.getBaseplayersEnrollment(authorizedUser, mockRes() as any, {
        eventId: VALID_UUID,
      });
      expect(excelService.GetEnrollment).toHaveBeenCalledWith(VALID_UUID);
    });
  });
});
