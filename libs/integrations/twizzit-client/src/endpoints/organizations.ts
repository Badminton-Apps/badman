import { HttpClient } from "../http";
import { TwizzitValidationError, TwizzitErrorContext } from "../errors";
import { OrganizationsResponseSchema } from "../schemas/organization";
import type { FederationOrganization } from "../federation";

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return {
    endpoint,
    occurredAt: new Date().toISOString(),
    attempts,
  };
}

export async function getOrganizations(http: HttpClient): Promise<FederationOrganization[]> {
  const endpoint = "GET /organizations";

  const response = await http.get("/organizations");
  const rawData: unknown = response.data;

  const result = OrganizationsResponseSchema.safeParse(rawData);
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
}
