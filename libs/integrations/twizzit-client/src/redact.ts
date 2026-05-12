const REDACTED = "[REDACTED]";
const MAX_EXCERPT_LEN = 200;

function redactString(value: string, secrets: ReadonlyArray<string>): string {
  let result = value;
  for (const secret of secrets) {
    if (secret.length === 0) continue;
    result = result.split(secret).join(REDACTED);
  }
  return result;
}

export function redact(value: unknown, secrets: ReadonlyArray<string>): unknown {
  if (typeof value === "string") {
    return redactString(value, secrets);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, secrets));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = redact(v, secrets);
    }
    return result;
  }
  return value;
}

export function redactExcerpt(
  body: string,
  secrets: ReadonlyArray<string>,
  maxLen: number = MAX_EXCERPT_LEN
): string {
  const redacted = redactString(body, secrets);
  if (redacted.length <= maxLen) return redacted;
  return redacted.slice(0, maxLen) + "…";
}
