import { Test, TestingModule } from "@nestjs/testing";
import { UploadGuard } from "@badman/backend-utils";
import { MultipartFile, MultipartValue } from "@fastify/multipart";
import { FastifyReply } from "fastify";
import { TransferLoanController } from "./transfer-loan.controller";
import { TransferService } from "../services/transfers.service";
import { LoansService } from "../services/loans.service.ts";

describe("TransferLoanController", () => {
  let controller: TransferLoanController;
  let transferService: jest.Mocked<Pick<TransferService, "process">>;
  let loansService: jest.Mocked<Pick<LoansService, "process">>;

  beforeEach(async () => {
    transferService = { process: jest.fn().mockResolvedValue(undefined) };
    loansService = { process: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferLoanController],
      providers: [
        { provide: TransferService, useValue: transferService },
        { provide: LoansService, useValue: loansService },
      ],
    })
      .overrideGuard(UploadGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransferLoanController>(TransferLoanController);
  });

  afterEach(() => jest.restoreAllMocks());

  function makeFile(transferOrLoan: string, season: string | number): MultipartFile {
    return {
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("test")),
      fields: {
        transferOrLoan: { value: transferOrLoan } as MultipartValue,
        season: { value: `${season}` } as MultipartValue,
      },
    } as unknown as MultipartFile;
  }

  function makeRes(): FastifyReply {
    return { send: jest.fn() } as unknown as FastifyReply;
  }

  describe("POST process", () => {
    it("routes to TransferService when transferOrLoan=transfer", async () => {
      const res = makeRes();
      await controller.process(makeFile("transfer", 2025), res);
      expect(transferService.process).toHaveBeenCalledWith(expect.any(Buffer), 2025);
      expect(loansService.process).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith({ message: true });
    });

    it("routes to LoansService when transferOrLoan=loan", async () => {
      const res = makeRes();
      await controller.process(makeFile("loan", 2025), res);
      expect(loansService.process).toHaveBeenCalledWith(expect.any(Buffer), 2025);
      expect(transferService.process).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith({ message: true });
    });

    it("sends { message: false } for unknown transferOrLoan value", async () => {
      const res = makeRes();
      await controller.process(makeFile("unknown", 2025), res);
      expect(transferService.process).not.toHaveBeenCalled();
      expect(loansService.process).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith({ message: false });
    });

    it("sends { message: false } for non-numeric season", async () => {
      const res = makeRes();
      await controller.process(makeFile("unknown", "not-a-number"), res);
      expect(res.send).toHaveBeenCalledWith({ message: false });
    });

    it("parses season as integer before passing to service", async () => {
      const res = makeRes();
      await controller.process(makeFile("transfer", "2024"), res);
      expect(transferService.process).toHaveBeenCalledWith(expect.any(Buffer), 2024);
    });
  });
});
