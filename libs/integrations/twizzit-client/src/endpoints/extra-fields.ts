import { httpRequest } from "../http";
import { Logger } from "../logger";
import {
  TwizzitAuthError,
  TwizzitServerError,
  TwizzitClientError,
  TwizzitValidationError,
  TwizzitErrorContext,
} from "../errors";
import { ExtraFieldsResponseSchema, ExtraField } from "../schemas/extra-field";
import { redactExcerpt } from "../redact";

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return { endpoint, occurredAt: new Date().toISOString(), attempts };
}

export async function getExtraFields(
  baseUrl: string,
  organizationId: number,
  token: string,
  logger: Logger,
  fetchFn?: typeof fetch
): Promise<ExtraField[]> {
  const endpoint = "GET /extra-fields";
  const secrets: ReadonlyArray<string> = [token];

  const url = `${baseUrl}/extra-fields?organization-ids[]=${organizationId}`;

  const response = await httpRequest(
    { url, method: "GET", headers: { Authorization: `Bearer ${token}` }, fetchFn },
    secrets,
    logger
  );

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

  const result = ExtraFieldsResponseSchema.safeParse(parsed);
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

  logger.info("fetched extra-fields", { count: result.data.length });
  return result.data;
}
