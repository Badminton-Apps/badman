import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CompileService } from "@badman/backend-compile";
import { of } from "rxjs";
import { MailingService } from "./mailing.service";
import { MAIL_TRANSPORT_TOKEN, IMailTransport } from "../../providers";

jest.mock("fs/promises", () => ({ writeFile: jest.fn().mockResolvedValue(undefined) }));

const { writeFile } = jest.requireMock("fs/promises") as { writeFile: jest.Mock };

function makeModule(overrides: {
  transport?: IMailTransport | null;
  config?: Record<string, unknown>;
}) {
  const compiledHtml = "<p>compiled</p>";
  const mockCompile = { toHtml: jest.fn().mockReturnValue(of(compiledHtml)) };

  const configMap: Record<string, unknown> = {
    MAIL_SUBJECT_PREFIX: "",
    NODE_ENV: "development",
    CLIENT_URL: "https://badman.app",
    DEV_EMAIL_DESTINATION: "dev@test.be",
    ...overrides.config,
  };
  const mockConfig = { get: jest.fn((key: string) => configMap[key]) };

  const transport =
    overrides.transport !== undefined
      ? overrides.transport
      : { send: jest.fn().mockResolvedValue(undefined) };

  return {
    compiledHtml,
    mockCompile,
    mockConfig,
    transport,
    build: () =>
      Test.createTestingModule({
        providers: [
          MailingService,
          { provide: CompileService, useValue: mockCompile },
          { provide: ConfigService, useValue: mockConfig },
          { provide: MAIL_TRANSPORT_TOKEN, useValue: transport },
        ],
      }).compile(),
  };
}

describe("MailingService", () => {
  afterEach(() => jest.restoreAllMocks());

  describe("_sendMail routing", () => {
    it("calls transport.send() with pre-compiled HTML", async () => {
      const { build, transport, compiledHtml } = makeModule({});
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      await service.sendTestMail();

      expect((transport as { send: jest.Mock }).send).toHaveBeenCalledWith(
        expect.objectContaining({ html: compiledHtml })
      );
    });

    it("does NOT pass template name to transport.send()", async () => {
      const { build, transport } = makeModule({});
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      await service.sendTestMail();

      const call = (transport as { send: jest.Mock }).send.mock.calls[0][0];
      expect(call).not.toHaveProperty("template");
    });

    it("prepends subject prefix when MAIL_SUBJECT_PREFIX is set", async () => {
      const { build, transport } = makeModule({ config: { MAIL_SUBJECT_PREFIX: "[TEST]" } });
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      await service.sendTestMail();

      const call = (transport as { send: jest.Mock }).send.mock.calls[0][0];
      expect(call.subject).toMatch(/^\[TEST\]/);
    });

    it("injects clientUrl into template context", async () => {
      const { build, mockCompile } = makeModule({ config: { CLIENT_URL: "https://example.com" } });
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      await service.sendTestMail();

      expect(mockCompile.toHtml).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          locals: expect.objectContaining({ clientUrl: "https://example.com" }),
        })
      );
    });
  });

  describe("dev email override", () => {
    it("replaces to with DEV_EMAIL_DESTINATION in non-production", async () => {
      const { build, transport } = makeModule({
        config: { NODE_ENV: "development", DEV_EMAIL_DESTINATION: "override@test.be" },
      });
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      await service.sendTestMail();

      const call = (transport as { send: jest.Mock }).send.mock.calls[0][0];
      expect(call.to).toEqual(["override@test.be"]);
    });

    it("does NOT append override info to subject in production", async () => {
      const { build, transport } = makeModule({ config: { NODE_ENV: "production" } });
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      await service.sendTestMail();

      const call = (transport as { send: jest.Mock }).send.mock.calls[0][0];
      expect(call.subject).not.toContain("overwritten email");
    });

    it("returns without sending when DEV_EMAIL_DESTINATION is absent in dev", async () => {
      const { build, transport } = makeModule({
        config: { NODE_ENV: "development", DEV_EMAIL_DESTINATION: undefined },
      });
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      await service.sendTestMail();

      expect((transport as { send: jest.Mock }).send).not.toHaveBeenCalled();
    });
  });

  describe("disabled path (transport is null)", () => {
    it("writes HTML to file in development when transport is null", async () => {
      const { build } = makeModule({ transport: null, config: { NODE_ENV: "development" } });
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      writeFile.mockClear();
      await service.sendTestMail();

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("test.html"),
        expect.any(String)
      );
    });

    it("does not write file in production when transport is null", async () => {
      const { build } = makeModule({ transport: null, config: { NODE_ENV: "production" } });
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      writeFile.mockClear();
      await service.sendTestMail();

      expect(writeFile).not.toHaveBeenCalled();
    });

    it("never calls transport.send() when transport is null", async () => {
      const { build } = makeModule({ transport: null, config: { NODE_ENV: "development" } });
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      // transport is null — no send method to call; just verify no crash
      await expect(service.sendTestMail()).resolves.toBeUndefined();
    });
  });

  describe("sendEnrollmentMail context shape", () => {
    it("passes club, locations, comments, settingsSlug to compileService", async () => {
      const { build, mockCompile } = makeModule({});
      const module: TestingModule = await build();
      const service = module.get(MailingService);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const club = { name: "Test Club", toJSON: () => ({ name: "Test Club" }) } as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const locations = [{ toJSON: () => ({ id: "loc1" }) }] as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comments = [{ toJSON: () => ({ id: "com1" }) }] as any[];
      const to = { fullName: "Captain", email: "cap@test.be", slug: "cap-slug" };

      await service.sendEnrollmentMail(to, club, locations, comments);

      expect(mockCompile.toHtml).toHaveBeenCalledWith(
        "clubenrollment",
        expect.objectContaining({
          locals: expect.objectContaining({
            club: expect.objectContaining({ name: "Test Club" }),
            locations: expect.any(Array),
            comments: expect.any(Array),
            settingsSlug: "cap-slug",
          }),
        })
      );
    });
  });
});
