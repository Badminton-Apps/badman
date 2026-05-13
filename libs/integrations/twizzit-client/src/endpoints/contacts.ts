import { HttpClient } from "../http";
import { TwizzitValidationError, TwizzitErrorContext } from "../errors";
import { ContactsResponseSchema, Contact } from "../schemas/contact";
import { paginate } from "../pagination";
import { ContactsQuery } from "../seam";

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return { endpoint, occurredAt: new Date().toISOString(), attempts };
}

export async function getContacts(http: HttpClient, opts?: ContactsQuery): Promise<Contact[]> {
  const endpoint = "GET /contacts";

  return paginate<Contact>({
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
    endpointLabel: endpoint,
  });
}
