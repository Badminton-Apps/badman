import { httpRequest } from "../http";
import { Logger } from "../logger";
import {
  TwizzitAuthError,
  TwizzitServerError,
  TwizzitClientError,
  TwizzitValidationError,
  TwizzitErrorContext,
} from "../errors";
import { ContactsResponseSchema, Contact } from "../schemas/contact";
import { redactExcerpt } from "../redact";
import { paginate } from "../pagination";
import { ContactsQuery } from "../seam";

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return { endpoint, occurredAt: new Date().toISOString(), attempts };
}

export async function getContacts(
  baseUrl: string,
  organizationId: number,
  token: string,
  opts: ContactsQuery | undefined,
  logger: Logger,
  fetchFn?: typeof fetch
): Promise<Contact[]> {
  const endpoint = "GET /contacts";
  const secrets: ReadonlyArray<string> = [token];

  return paginate<Contact>({
    fetchPage: async (offset, limit) => {
      let url = `${baseUrl}/contacts?organization-ids[]=${organizationId}&limit=${limit}&offset=${offset}`;
      if (opts?.lastModified) {
        url += `&last-modified=${opts.lastModified.toISOString()}`;
      }

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

      const result = ContactsResponseSchema.safeParse(parsed);
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

      return result.data;
    },
    pageSize: opts?.pageSize,
    maxPages: opts?.maxPages,
    endpointLabel: endpoint,
  });
}
