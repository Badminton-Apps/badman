import { HttpClient } from "../http";
import { TwizzitValidationError, TwizzitErrorContext } from "../errors";
import { ExtraFieldsResponseSchema, ExtraField } from "../schemas/extra-field";

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return { endpoint, occurredAt: new Date().toISOString(), attempts };
}

export async function getExtraFields(http: HttpClient): Promise<ExtraField[]> {
  const endpoint = "GET /extra-fields";

  const response = await http.get("/extra-fields");
  const rawData: unknown = response.data;

  const result = ExtraFieldsResponseSchema.safeParse(rawData);
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
