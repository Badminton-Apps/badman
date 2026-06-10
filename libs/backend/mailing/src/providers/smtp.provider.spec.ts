import { ConfigService } from "@nestjs/config";
import { SmtpProvider } from "./smtp.provider";

const mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
const mockVerify = jest.fn().mockResolvedValue(true);
const mockTransporter = { sendMail: mockSendMail, verify: mockVerify };

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => mockTransporter),
}));

import nodemailer from "nodemailer";

function makeProvider(config: Record<string, string | undefined> = {}) {
  const defaults = { MAIL_HOST: "smtp.test.com", MAIL_USER: "user@test.com", MAIL_PASS: "secret" };
  const merged = { ...defaults, ...config };
  const configService = {
    get: jest.fn((key: string) => (merged as Record<string, string | undefined>)[key]),
  } as unknown as ConfigService;
  return new SmtpProvider(configService);
}

describe("SmtpProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue(true);
    mockSendMail.mockResolvedValue({ messageId: "test-id" });
  });

  afterEach(() => jest.restoreAllMocks());

  it("creates nodemailer transporter with MAIL_HOST, MAIL_USER, MAIL_PASS", () => {
    makeProvider();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.test.com",
        auth: { user: "user@test.com", pass: "secret" },
      })
    );
  });

  it("does NOT call verify() during construction", () => {
    makeProvider();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("calls verify() on first send()", async () => {
    const provider = makeProvider();
    await provider.send({ from: "a@b.com", to: "c@d.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it("does NOT call verify() on subsequent sends", async () => {
    const provider = makeProvider();
    await provider.send({ from: "a@b.com", to: "c@d.com", subject: "Hi", html: "<p>Hi</p>" });
    await provider.send({ from: "a@b.com", to: "c@d.com", subject: "Hi2", html: "<p>Hi2</p>" });
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it("calls sendMail() with from, to, subject, html", async () => {
    const provider = makeProvider();
    await provider.send({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Subj",
      html: "<b>body</b>",
    });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "from@test.com",
        to: "to@test.com",
        subject: "Subj",
        html: "<b>body</b>",
      })
    );
  });

  it("passes cc when provided", async () => {
    const provider = makeProvider();
    await provider.send({
      from: "f@t.com",
      to: "t@t.com",
      cc: "cc@t.com",
      subject: "S",
      html: "<p/>",
    });
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ cc: "cc@t.com" }));
  });

  it("does not error when cc is omitted", async () => {
    const provider = makeProvider();
    await expect(
      provider.send({ from: "f@t.com", to: "t@t.com", subject: "S", html: "<p/>" })
    ).resolves.toBeUndefined();
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("logs warning and no-ops on subsequent sends when verify() returns false", async () => {
    mockVerify.mockResolvedValue(false);
    const provider = makeProvider();
    await provider.send({ from: "f@t.com", to: "t@t.com", subject: "S", html: "<p/>" });
    await provider.send({ from: "f@t.com", to: "t@t.com", subject: "S2", html: "<p/>" });
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it("logs warning and no-ops when verify() throws", async () => {
    mockVerify.mockRejectedValue(new Error("ECONNREFUSED"));
    const provider = makeProvider();
    await provider.send({ from: "f@t.com", to: "t@t.com", subject: "S", html: "<p/>" });
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
