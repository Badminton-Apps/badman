import { Test, TestingModule } from "@nestjs/testing";
import { InjectQueue } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { GlobalConsumer } from "../global";
import { SyncQueue } from "@badman/backend-queue";
import { Job, Queue } from "bull";

jest.mock("@sentry/nestjs", () => ({
  setTag: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback: (scope: { setFingerprint: () => void; setTag: () => void; setContext: () => void }) => void) => {
    callback({
      setFingerprint: jest.fn(),
      setTag: jest.fn(),
      setContext: jest.fn(),
    });
  }),
}));

describe("GlobalConsumer", () => {
  let consumer: GlobalConsumer;
  let mockQueue: Partial<Queue>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockQueue = {
      getJob: jest.fn(),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalConsumer,
        {
          provide: `BullQueue_${SyncQueue}`,
          useValue: mockQueue,
        },
      ],
    }).compile();

    consumer = module.get<GlobalConsumer>(GlobalConsumer);
    loggerErrorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("onError", () => {
    it("logs job failure with job details when job exists", async () => {
      const mockJob = {
        id: "job-123",
        name: "enter-scores",
        data: { encounterId: "enc-1" },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Partial<Job>;

      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);

      const error = new Error("Test error message");
      await consumer.onError("job-123", error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("job-123"),
        expect.anything()
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("enter-scores"),
        expect.anything()
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Test error message"),
        expect.anything()
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("0/3"),
        expect.anything()
      );
    });

    it("handles missing job gracefully", async () => {
      (mockQueue.getJob as jest.Mock).mockResolvedValue(null);

      const error = new Error("Test error");
      await consumer.onError("job-123", error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("job-123"),
        expect.anything()
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("unavailable"),
        expect.anything()
      );
    });

    it("handles circular references in job data", async () => {
      const circularObj = { a: 1 } as any;
      circularObj.self = circularObj; // Create circular reference

      const mockJob = {
        id: "job-123",
        name: "enter-scores",
        data: circularObj,
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as Partial<Job>;

      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);

      const error = new Error("Circular ref error");
      await consumer.onError("job-123", error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("unable to serialize"),
        expect.anything()
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Circular ref error"),
        expect.anything()
      );
    });

    it("handles error when fetching job from queue", async () => {
      (mockQueue.getJob as jest.Mock).mockRejectedValue(
        new Error("Redis connection error")
      );

      const error = new Error("Original error");
      await consumer.onError("job-123", error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("job-123"),
        expect.anything()
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("could not fetch job details"),
        expect.anything()
      );
    });

    it("logs attempt count when job has attempts info", async () => {
      const mockJob = {
        id: "job-456",
        name: "check-encounters",
        data: { eventId: "evt-1" },
        attemptsMade: 2,
        opts: { attempts: 3 },
      } as Partial<Job>;

      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);

      const error = new Error("Final attempt failed");
      await consumer.onError("job-456", error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("2/3"),
        expect.anything()
      );
    });

    it("uses unknown for missing job name", async () => {
      const mockJob = {
        id: "job-789",
        data: { data: "test" },
        attemptsMade: 0,
      } as Partial<Job>;

      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);

      const error = new Error("Test");
      await consumer.onError("job-789", error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("unknown"),
        expect.anything()
      );
    });

    it("handles undefined error (e.g. Bull timeout or unhandled rejection)", async () => {
      const mockJob = {
        id: "job-6914",
        name: "EnterScores",
        data: { encounterId: "0953c888-ef13-4cc3-9239-923dfc716521" },
        attemptsMade: 1,
        opts: { attempts: 1 },
      } as Partial<Job>;

      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);

      await consumer.onError("job-6914", undefined);

      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      const [message, stack] = loggerErrorSpy.mock.calls[0];
      expect(message).toContain("unknown error");
      expect(message).toContain("EnterScores");
      expect(message).toContain("job-6914");
      expect(stack).toBeUndefined();
    });
  });

  describe("onModuleInit", () => {
    it("registers stalled event listener", () => {
      consumer.onModuleInit();

      expect(mockQueue.on).toHaveBeenCalledWith("stalled", expect.any(Function));
    });

    it("logs when job stalls", () => {
      consumer.onModuleInit();

      const stalledHandler = (mockQueue.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "stalled"
      )?.[1];

      if (!stalledHandler) throw new Error("stalled handler not registered");

      const mockStalledJob = {
        id: "stalled-job",
        name: "sync-events",
      } as Partial<Job>;

      const loggerWarnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
      stalledHandler(mockStalledJob);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("stalled-job")
      );
      loggerWarnSpy.mockRestore();
    });
  });
});
