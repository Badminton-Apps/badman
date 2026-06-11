/**
 * Thrown when navigation to toernooi.nl (e.g. cookiewall) fails due to
 * network/connection issues (unreachable, timeout, DNS, etc.).
 * Callers can use instanceof to treat this as site unreachable and retry later.
 */
export class ToernooiUnreachableError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ToernooiUnreachableError";
  }
}
