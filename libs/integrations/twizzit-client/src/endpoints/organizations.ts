import { httpRequest, HttpRequestOptions } from "../http";
import { Logger } from "../logger";
import {
  TwizzitAuthError,
  TwizzitServerError,
  TwizzitClientError,
  TwizzitValidationError,
  TwizzitErrorContext,
} from "../errors";
import { OrganizationsResponseSchema, Organization } from "../schemas/organization";
import { redactExcerpt } from "../redact";

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return {
    endpoint,
    occurredAt: new Date().toISOString(),
    attempts,
  };
}

export async function getOrganizations(
  baseUrl: string,
  token: string,
  logger: Logger,
  fetchFn?: typeof fetch,
  extraSecrets: ReadonlyArray<string> = []
): Promise<Organization[]> {
  const endpoint = "GET /organizations";
  const secrets: ReadonlyArray<string> = [token, ...extraSecrets];

  const requestOpts: HttpRequestOptions = {
    url: `${baseUrl}/organizations`,
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    fetchFn,
  };

  const response = await httpRequest(requestOpts, secrets, logger);

  if (response.status === 401 || response.status === 403) {
    throw new TwizzitAuthError(
      `Unauthorized on ${endpoint} (${response.status})`,
      makeContext(endpoint, 1),
      response.status,
      secrets
    );
  }

  if (response.status >= 500) {
    throw new TwizzitServerError(
      `Server error on ${endpoint} (${response.status})`,
      makeContext(endpoint, 1),
      response.status,
      redactExcerpt(response.body, secrets),
      secrets
    );
  }

  if (response.status >= 400) {
    throw new TwizzitClientError(
      `Client error on ${endpoint} (${response.status})`,
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
    throw new TwizzitValidationError(
      `Invalid JSON from ${endpoint}`,
      makeContext(endpoint, 1),
      "",
      "expected valid JSON",
      redactExcerpt(response.body, secrets),
      secrets
    );
  }

  const result = OrganizationsResponseSchema.safeParse(parsed);
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

  logger.info("fetched organizations", { count: result.data.length });
  return result.data;
}
