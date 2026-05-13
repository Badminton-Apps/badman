import { HttpClient } from "../http";
import { TwizzitValidationError, TwizzitErrorContext } from "../errors";
import { MembershipsResponseSchema, Membership } from "../schemas/membership";
import { paginate } from "../pagination";
import { MembershipsQuery } from "../seam";

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return { endpoint, occurredAt: new Date().toISOString(), attempts };
}

export async function getMemberships(
  http: HttpClient,
  opts?: MembershipsQuery
): Promise<Membership[]> {
  const endpoint = "GET /memberships";

  return paginate<Membership>({
    fetchPage: async (offset, limit) => {
      const params: Record<string, unknown> = { limit, offset };
      if (opts?.lastModified) {
        params["last-modified"] = opts.lastModified.toISOString();
      }
      if (opts?.clubId !== undefined) {
        params["club-id"] = opts.clubId;
      }

      const response = await http.get("/memberships", { params });
      const rawData: unknown = response.data;

      const result = MembershipsResponseSchema.safeParse(rawData);
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
