import { HttpClient } from "../http";
import { TwizzitAuthError, TwizzitValidationError, TwizzitErrorContext } from "../errors";
import { AuthenticateResponseSchema, AuthenticateResponse } from "../schemas/authenticate";

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
  http: HttpClient,
  credentials: Credentials
): Promise<AuthenticateResponse> {
  const endpoint = "POST /authenticate";

  let rawData: unknown;
  try {
    const response = await http.post("/authenticate", {
      username: credentials.username,
      password: credentials.password,
    });
    rawData = response.data;
  } catch (err: unknown) {
    // Re-throw TwizzitErrors from interceptors unchanged
    if (err instanceof TwizzitAuthError || err instanceof TwizzitValidationError) {
      throw err;
    }
    // Any other error (TwizzitNetworkError, TwizzitClientError) bubbles up from the interceptor
    throw err;
  }

  const result = AuthenticateResponseSchema.safeParse(rawData);
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
