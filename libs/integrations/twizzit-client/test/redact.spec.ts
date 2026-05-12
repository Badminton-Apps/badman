import { redact, redactExcerpt } from "../src/redact";

describe("redact", () => {
  const secrets = ["my-secret-token", "hunter2"];

  it("replaces token in a plain string", () => {
    expect(redact("Bearer my-secret-token here", secrets)).toBe("Bearer [REDACTED] here");
  });

  it("replaces token in a nested object", () => {
    const input = { Authorization: "Bearer my-secret-token", other: "safe" };
    const result = redact(input, secrets) as typeof input;
    expect(result.Authorization).toBe("Bearer [REDACTED]");
    expect(result.other).toBe("safe");
  });

  it("replaces password in JSON-stringified body", () => {
    const body = JSON.stringify({ username: "user", password: "hunter2" });
    const result = redact(body, secrets) as string;
    expect(result).not.toContain("hunter2");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts Authorization: Bearer header value", () => {
    const headerValue = "Authorization: Bearer my-secret-token";
    expect(redact(headerValue, secrets)).toBe("Authorization: Bearer [REDACTED]");
  });

  it("replaces in nested arrays", () => {
    const input = ["safe", "my-secret-token is here", { nested: "hunter2" }];
    const result = redact(input, secrets) as string[];
    expect(result[0]).toBe("safe");
    expect(result[1]).toBe("[REDACTED] is here");
    expect((result[2] as unknown as { nested: string }).nested).toBe("[REDACTED]");
  });

  it("passes through non-string primitives unchanged", () => {
    expect(redact(42, secrets)).toBe(42);
    expect(redact(true, secrets)).toBe(true);
    expect(redact(null, secrets)).toBe(null);
    expect(redact(undefined, secrets)).toBe(undefined);
  });

  it("handles empty secrets array", () => {
    expect(redact("my-secret-token", [])).toBe("my-secret-token");
  });

  it("handles empty secret string (skips)", () => {
    expect(redact("hello world", [""])).toBe("hello world");
  });
});

describe("redactExcerpt", () => {
  it("redacts and truncates long strings", () => {
    const body = "x".repeat(300);
    const result = redactExcerpt(body, []);
    expect(result.length).toBeLessThanOrEqual(202);
    expect(result).toContain("…");
  });

  it("does not truncate short strings", () => {
    const body = "short";
    expect(redactExcerpt(body, [])).toBe("short");
  });

  it("redacts before truncating", () => {
    const body = "prefix my-secret-token suffix " + "x".repeat(300);
    const result = redactExcerpt(body, ["my-secret-token"]);
    expect(result).not.toContain("my-secret-token");
    expect(result).toContain("[REDACTED]");
  });

  it("respects custom maxLen", () => {
    const body = "x".repeat(50);
    const result = redactExcerpt(body, [], 10);
    expect(result.length).toBeLessThanOrEqual(12);
  });
});
