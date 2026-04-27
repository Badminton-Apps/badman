import { Logger } from "@nestjs/common";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

/**
 * Helpers shared by VisualService for parsing and validating responses
 * coming back from the Visual API. Extracted from visual.service.ts so the
 * service itself stays focused on orchestration.
 */

/**
 * Wrap a value in an array if it isn't one already. fast-xml-parser yields
 * a single element when the XML has one occurrence and an array when there
 * are many — `_asArray` collapses both into the array shape.
 */
export function asArray<T = unknown>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Recursively normalise enum / id fields the Visual API returns as strings
 * into proper numbers, while keeping MemberID a string. fast-xml-parser
 * sometimes returns numeric strings (especially for attributes) — coercing
 * them here means downstream code can rely on stable runtime types.
 */
export function normalizeTypes(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => normalizeTypes(item));
  }

  if (typeof data === "object") {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      switch (key) {
        case "GenderID":
        case "GameTypeID":
        case "TypeID":
        case "MatchTypeID":
        case "ScoreStatus":
        case "TournamentTypeID":
        case "DrawTypeID":
        case "LevelID":
        case "Winner":
        case "MatchOrder":
        case "Code":
        case "Size":
        case "Team1":
        case "Team2":
        case "Rank":
        case "Level":
        case "Totalpoints":
          if (typeof value === "string" && !isNaN(Number(value))) {
            normalized[key] = Number(value);
          } else if (typeof value === "number") {
            normalized[key] = value;
          } else {
            normalized[key] = normalizeTypes(value);
          }
          break;
        case "MemberID":
          normalized[key] = typeof value === "string" ? value : String(value);
          break;
        default:
          normalized[key] = normalizeTypes(value);
          break;
      }
    }

    return normalized;
  }

  return data;
}

/**
 * Parse a Visual API response. Handles both XML (the legacy format) and
 * JSON (added when toernooi.nl flipped some endpoints' content type) and
 * always runs the result through `normalizeTypes`.
 */
export function parseResponse(
  data: string | unknown,
  parser: XMLParser,
  logger: Logger
): unknown {
  // Already parsed (e.g. axios decoded JSON for us).
  if (typeof data !== "string") {
    logger.debug("Data is already parsed (not a string), processing for type corrections");
    if (data && typeof data === "object" && "Result" in data) {
      return normalizeTypes((data as { Result: unknown }).Result);
    }
    return normalizeTypes(data);
  }

  const trimmedData = data.trim();
  if (trimmedData.startsWith("<?xml") || trimmedData.startsWith("<")) {
    const parsed = parser.parse(data);
    return normalizeTypes(parsed.Result || parsed);
  }

  // JSON branch — fall back to XML parsing if JSON.parse fails (defensive).
  try {
    const jsonParsed = JSON.parse(data);
    return normalizeTypes(jsonParsed);
  } catch (error) {
    logger.error("Failed to parse response as JSON:", error);
    const parsed = parser.parse(data);
    return normalizeTypes(parsed.Result || parsed);
  }
}

/**
 * Validate a payload that the API may return as either a single object
 * (one element) or an array (multiple elements). Normalises via `asArray`
 * and throws a clear error if the response shape doesn't match the schema.
 *
 * Returns [] when the payload is missing — callers can decide whether to
 * surface that as an empty list or as undefined.
 */
export function validateMany<TOut>(
  value: unknown,
  schema: z.ZodTypeAny,
  payloadKey: string,
  logger: Logger
): TOut[] {
  if (value == null) return [];
  const candidates = asArray(value);
  const result = z.array(schema).safeParse(candidates);
  if (!result.success) {
    logger.error(
      `Visual API returned a malformed ${payloadKey} payload: ${result.error.message}`
    );
    throw new Error(
      `Invalid ${payloadKey} response from Visual API: ${result.error.message}`
    );
  }
  return result.data as TOut[];
}

/**
 * Validate a single-object payload from the API. Returns undefined when
 * the payload is missing; throws a clear error on shape mismatch.
 *
 * The output type is decoupled from the schema's inferred shape on purpose:
 * the schema represents the truthful runtime shape (date fields as strings,
 * etc.), while the consumer-facing types in visual-result.ts keep the
 * legacy contract (Date fields). The schema's job is the runtime sanity
 * check at the API boundary.
 */
export function validateOne<TOut>(
  value: unknown,
  schema: z.ZodTypeAny,
  payloadKey: string,
  logger: Logger
): TOut | undefined {
  if (value == null) return undefined;
  const result = schema.safeParse(value);
  if (!result.success) {
    logger.error(
      `Visual API returned a malformed ${payloadKey} payload: ${result.error.message}`
    );
    throw new Error(
      `Invalid ${payloadKey} response from Visual API: ${result.error.message}`
    );
  }
  return result.data as TOut;
}
