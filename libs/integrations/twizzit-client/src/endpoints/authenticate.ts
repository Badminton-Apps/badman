import { httpRequest, HttpRequestOptions } from "../http";
import { Logger } from "../logger";
import { TwizzitAuthError, TwizzitValidationError, TwizzitErrorContext } from "../errors";
import { AuthenticateResponseSchema, AuthenticateResponse } from "../schemas/authenticate";
import { redactExcerpt } from "../redact";

export interface Credentials {
  username: string;
  password: string;
}

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return {
    endpoint,
    occurredAt: new Date().toISOString(),
    attempts,
  };
}

export async function authenticate(
  baseUrl: string,
  credentials: Credentials,
  logger: Logger,
  fetchFn?: typeof fetch
): Promise<AuthenticateResponse> {
  const endpoint = "POST /authenticate";
  const secrets: ReadonlyArray<string> = [credentials.password];

  const requestOpts: HttpRequestOptions = {
    url: `${baseUrl}/authenticate`,
    method: "POST",
    body: JSON.stringify({ username: credentials.username, password: credentials.password }),
    fetchFn,
  };

  const response = await httpRequest(requestOpts, secrets, logger);

  if (response.status === 401 || response.status === 403) {
    throw new TwizzitAuthError(
      `Authentication failed (${response.status})`,
      makeContext(endpoint, 1),
      response.status,
      secrets
    );
  }

  if (response.status >= 400) {
    const { TwizzitClientError } = await import("../errors");
    throw new TwizzitClientError(
      `Unexpected status ${response.status} from ${endpoint}`,
      makeContext(endpoint, 1),
      response.status,
      redactExcerpt(response.body, secrets),
      undefined,
      secrets
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    const { TwizzitValidationError: TVE } = await import("../errors");
    throw new TVE(
      `Invalid JSON from ${endpoint}`,
      makeContext(endpoint, 1),
      "",
      "expected valid JSON",
      redactExcerpt(response.body, secrets),
      secrets
    );
  }

  const result = AuthenticateResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue ? issue.path.join(".") : "";
    const expectation = issue ? issue.message : "schema validation failed";
    throw new TwizzitValidationError(
      `Response validation failed for ${endpoint}: ${expectation}`,
      makeContext(endpoint, 1),
      path,
      expectation,
      redactExcerpt(JSON.stringify(parsed), secrets),
      secrets
    );
  }

  logger.info("authenticated", { endpoint });
  return result.data;
}
