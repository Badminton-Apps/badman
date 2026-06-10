import { ConfigService } from "@nestjs/config";
import { ResendProvider } from "./resend.provider";

const mockEmailsSend = jest.fn().mockResolvedValue({ data: { id: "msg-123" }, error: null });

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}));

function makeProvider(config: Record<string, string | undefined> = {}) {
  const defaults = { RESEND_API_KEY: "re_test_key" };
  const merged = { ...defaults, ...config };
  const configService = {
    get: jest.fn((key: string) => (merged as Record<string, string | undefined>)[key]),
  } as unknown as ConfigService;
  return new ResendProvider(configService);
}

describe("ResendProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailsSend.mockResolvedValue({ data: { id: "msg-123" }, error: null });
  });

  afterEach(() => jest.restoreAllMocks());

  it("calls resend.emails.send() with from, to, subject, html", async () => {
    const provider = makeProvider();
    await provider.send({ from: "f@b.com", to: "t@b.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "f@b.com", to: "t@b.com", subject: "Hi", html: "<p>Hi</p>" })
    );
  });

  it("includes cc when provided", async () => {
    const provider = makeProvider();
    await provider.send({
      from: "f@b.com",
      to: "t@b.com",
      cc: "cc@b.com",
      subject: "Hi",
      html: "<p/>",
    });
    expect(mockEmailsSend).toHaveBeenCalledWith(expect.objectContaining({ cc: "cc@b.com" }));
  });

  it("does not include cc when omitted", async () => {
    const provider = makeProvider();
    await provider.send({ from: "f@b.com", to: "t@b.com", subject: "Hi", html: "<p/>" });
    const call = mockEmailsSend.mock.calls[0][0];
    expect(call).not.toHaveProperty("cc");
  });

  it("does NOT call send() when RESEND_API_KEY is missing", async () => {
    const provider = makeProvider({ RESEND_API_KEY: undefined });
    await provider.send({ from: "f@b.com", to: "t@b.com", subject: "Hi", html: "<p/>" });
    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it("logs error and resolves when SDK returns { error: {...} }", async () => {
    mockEmailsSend.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key", name: "validation_error" },
    });
    const provider = makeProvider();
    await expect(
      provider.send({ from: "f@b.com", to: "t@b.com", subject: "Hi", html: "<p/>" })
    ).resolves.toBeUndefined();
  });

  it("resolves successfully when SDK returns { data: { id }, error: null }", async () => {
    mockEmailsSend.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    const provider = makeProvider();
    await expect(
      provider.send({ from: "f@b.com", to: "t@b.com", subject: "Hi", html: "<p/>" })
    ).resolves.toBeUndefined();
  });
});
