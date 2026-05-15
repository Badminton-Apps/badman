import { HttpClient } from "../http";
import { TwizzitValidationError, TwizzitErrorContext } from "../errors";
import { ContactsResponseSchema } from "../schemas/contact";
import type { FederationContact } from "../federation";
import { paginate } from "../pagination";
import { ContactsQuery } from "../gateway";

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return { endpoint, occurredAt: new Date().toISOString(), attempts };
}

export interface ContactsQueryInternal extends ContactsQuery {
  /** Starting absolute offset (items). Passed to `paginate.startOffset`. */
  startOffset?: number;
}

export async function getContacts(
  http: HttpClient,
  opts?: ContactsQueryInternal
): Promise<FederationContact[]> {
  const endpoint = "GET /contacts";

  return paginate<FederationContact>({
    fetchPage: async (offset, limit) => {
      const params: Record<string, unknown> = { limit, offset };
      if (opts?.lastModified) {
        params["last-modified"] = opts.lastModified.toISOString();
      }

      const response = await http.get("/contacts", { params });
      const rawData: unknown = response.data;

      const result = ContactsResponseSchema.safeParse(rawData);
      if (!result.success) {
        const issue = result.error.issues[0];
        const path = issue ? issue.path.join(".") : "";
        const expectation = issue ? issue.message : "schema validation failed";
        throw new TwizzitValidationError(
          `Response validation failed for ${endpoint}: ${expectation}`,
          makeContext(endpoint, 1),
          path,
          expectation,
          JSON.stringify(rawData).slice(0, 200)
        );
      }

      return result.data;
    },
    pageSize: opts?.pageSize,
    maxPages: opts?.maxPages,
    startOffset: opts?.startOffset,
    endpointLabel: endpoint,
  });
}
