import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import { XMLParser } from "fast-xml-parser";
import * as Sentry from "@sentry/nestjs";

import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axiosRateLimit from "axios-rate-limit";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { performance } from "perf_hooks";
import {
  XmlClub,
  XmlClubSchema,
  XmlMatch,
  XmlMatchSchema,
  XmlPlayer,
  XmlPlayerSchema,
  XmlRanking,
  XmlRankingCategory,
  XmlRankingCategorySchema,
  XmlRankingPublication,
  XmlRankingPublicationPoint,
  XmlRankingPublicationPointSchema,
  XmlRankingPublicationSchema,
  XmlRankingSchema,
  XmlResult,
  XmlTeam,
  XmlTeamMatch,
  XmlTeamMatchSchema,
  XmlTeamSchema,
  XmlTournament,
  XmlTournamentDraw,
  XmlTournamentDrawSchema,
  XmlTournamentEvent,
  XmlTournamentEventSchema,
  XmlTournamentMatch,
  XmlTournamentMatchSchema,
  XmlTournamentSchema,
  parseResponse,
  validateMany,
  validateManyLossy,
  validateOne,
} from "../utils";
import { z } from "zod";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { CACHE_TTL } from "@badman/backend-cache";
import { ConfigType } from "@badman/utils";

@Injectable()
export class VisualService {
  private readonly logger = new Logger(VisualService.name);
  public static visualFormat = "yyyy-MM-dd'T'HH:mm:ss";
  private static CACHE_KEY = "visual";

  private _retries = 25;
  private _http: AxiosInstance;
  private _parser: XMLParser;

  constructor(
    private _configService: ConfigService<ConfigType>,
    @Inject(CACHE_MANAGER) private _cacheManager: Cache
  ) {
    this._http = axiosRateLimit(axios.create(), { maxRPS: 15 });
    axiosRetry(this._http, { retries: this._retries });
    this._parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      parseAttributeValue: true,
    });
  }

  private _vr(): string {
    return `${this._configService.get("VR_API")}`;
  }

  async getPlayers(tourneyId: string, useCache = true): Promise<XmlPlayer[]> {
    // Lossy validation: Visual API sporadically returns Player rows without
    // a MemberID (Sentry #104397491). Such rows are useless downstream
    // (cannot be matched to a member record) so we drop them with a warn
    // log + a Sentry breadcrumb instead of killing the whole SyncEvents job.
    const url = `${this._vr()}/Tournament/${tourneyId}/Player`;
    const result = await this._getFromApi(url, useCache);
    const parsed = parseResponse(result, this._parser, this.logger) as XmlResult;
    return validateManyLossy<XmlPlayer>(
      parsed.Player,
      XmlPlayerSchema,
      "Player",
      this.logger,
      ({ index, payloadKey, error }) => {
        Sentry.withScope((scope) => {
          scope.setLevel("warning");
          scope.setTag("payload_key", payloadKey);
          scope.setTag("tournament_id", tourneyId);
          // Fingerprint by field path so all rows missing the same field
          // collapse to one Sentry issue across runs. validateManyLossy
          // validates each element separately, so issue.path already starts
          // at the field name (no array index to strip).
          const firstIssue = error.errors[0];
          const fieldPath = firstIssue?.path.join(".") || "unknown";
          scope.setFingerprint(["visual-lossy-drop", payloadKey, fieldPath]);
          scope.setContext("zodError", {
            index,
            fieldPath,
            message: error.message,
          });
          Sentry.captureMessage(
            `Visual API ${payloadKey} entry dropped: missing/invalid ${fieldPath}`
          );
        });
      }
    );
  }

  async getTeam(
    tourneyId: string,
    teamId: string | number,
    useCache = true
  ): Promise<XmlTeam | undefined> {
    return this._fetchOne<XmlTeam>(
      `${this._vr()}/Tournament/${tourneyId}/team/${teamId}`,
      "Team",
      XmlTeamSchema,
      useCache
    );
  }

  async getClubs(tourneyId: string, useCache = true): Promise<XmlClub[]> {
    return this._fetchMany<XmlClub>(
      `${this._vr()}/Tournament/${tourneyId}/Club`,
      "Club",
      XmlClubSchema,
      useCache
    );
  }

  /**
   * GET /Tournament/{tourneyId}/TeamMatch/{matchId}
   *
   * Fetches the individual games within a competition encounter (TeamMatch).
   *
   * **Use this for competition encounters.** Returns up to 8 individual
   * `XmlMatch` records (singles + doubles) — each with MatchOrder, MatchTypeID,
   * per-set scores, and player MemberIDs.
   */
  async getTeamMatch(
    tourneyId: string,
    matchId: string | number,
    useCache = true
  ): Promise<XmlMatch[]> {
    return this._fetchMany<XmlMatch>(
      `${this._vr()}/Tournament/${tourneyId}/TeamMatch/${matchId}`,
      "Match",
      XmlMatchSchema,
      useCache
    );
  }

  /**
   * GET /Tournament/{tourneyId}/MatchDetail/{matchId}
   *
   * Fetches a single game's detail. Note: byes do NOT appear in this endpoint —
   * use getGames or getTeamMatch at the parent level to see byes.
   *
   * The MatchDetail endpoint may return either a single match or an array
   * (XML quirk: 0/1/many sibling tags map to absent / object / array).
   * Always normalise to an array — downstream code shouldn't have to
   * branch on the shape.
   */
  async getGame(tourneyId: string, matchId: string | number, useCache = true): Promise<XmlMatch[]> {
    return this._fetchMany<XmlMatch>(
      `${this._vr()}/Tournament/${tourneyId}/MatchDetail/${matchId}`,
      "Match",
      XmlMatchSchema,
      useCache
    );
  }

  /**
   * GET /Tournament/{tourneyId}/Draw/{drawId}/Match
   *
   * Fetches the contents of a draw. Return shape depends on draw type:
   *
   * - **Competition draw (poule)** → `XmlTeamMatch[]` — one per encounter.
   *   Each item has `Code` (encounter code), `Team1`, `Team2`, `MatchTime`,
   *   `RoundName`, and `Sets.Set` = aggregate team score. No `MatchOrder`.
   * - **Tournament draw** (individual) → `XmlMatch[]` — individual games with
   *   `MatchOrder`, `MatchTypeID`, per-set scores, etc.
   *
   * **Do NOT** call this with a competition encounter code — the VR API will
   * treat it as a draw lookup and return the unrelated TeamMatches that happen
   * to share the numeric ID. For encounter-level game fetch use
   * {@link VisualService.getTeamMatch}.
   */
  async getGames(
    tourneyId: string,
    drawId: string | number,
    useCache = true
  ): Promise<(XmlTeamMatch | XmlMatch)[]> {
    const url = `${this._vr()}/Tournament/${tourneyId}/Draw/${drawId}/Match`;
    const result = await this._getFromApi(url, useCache);
    const parsed = parseResponse(result, this._parser, this.logger) as XmlResult;

    if (parsed.Match) {
      return validateMany<XmlMatch>(parsed.Match, XmlMatchSchema, "Match", this.logger);
    }
    if (parsed.TeamMatch) {
      return validateMany<XmlTeamMatch>(
        parsed.TeamMatch,
        XmlTeamMatchSchema,
        "TeamMatch",
        this.logger
      );
    }

    this.logger.warn("No matches");
    return [];
  }

  async getDraws(
    tourneyId: string,
    eventId: string | number,
    useCache = true
  ): Promise<XmlTournamentDraw[]> {
    return this._fetchMany<XmlTournamentDraw>(
      `${this._vr()}/Tournament/${tourneyId}/Event/${eventId}/Draw`,
      "TournamentDraw",
      XmlTournamentDrawSchema,
      useCache
    );
  }

  async getDraw(
    tourneyId: string,
    drawId: string | number,
    useCache = true
  ): Promise<XmlTournamentDraw | undefined> {
    return this._fetchOne<XmlTournamentDraw>(
      `${this._vr()}/Tournament/${tourneyId}/Draw/${drawId}`,
      "TournamentDraw",
      XmlTournamentDrawSchema,
      useCache
    );
  }

  async getSubEvents(eventCode: string | number, useCache = true): Promise<XmlTournamentEvent[]> {
    return this._fetchMany<XmlTournamentEvent>(
      `${this._vr()}/Tournament/${eventCode}/Event`,
      "TournamentEvent",
      XmlTournamentEventSchema,
      useCache
    );
  }

  async getSubEvent(
    eventCode: string | number,
    subEventCode: string | number,
    useCache = true
  ): Promise<XmlTournamentEvent | undefined> {
    return this._fetchOne<XmlTournamentEvent>(
      `${this._vr()}/Tournament/${eventCode}/Event/${subEventCode}`,
      "TournamentEvent",
      XmlTournamentEventSchema,
      useCache
    );
  }

  async getTournament(tourneyId: string, useCache = true): Promise<XmlTournament | undefined> {
    return this._fetchOne<XmlTournament>(
      `${this._vr()}/Tournament/${tourneyId}`,
      "Tournament",
      XmlTournamentSchema,
      useCache
    );
  }

  async searchEvents(query: string): Promise<XmlTournament[]> {
    return this._fetchMany<XmlTournament>(
      `${this._vr()}/Tournament?q=${query}`,
      "Tournament",
      XmlTournamentSchema,
      false
    );
  }

  async getEvent(code: string): Promise<XmlTournament[]> {
    return this._fetchMany<XmlTournament>(
      `${this._vr()}/Tournament/${code}`,
      "Tournament",
      XmlTournamentSchema,
      false
    );
  }

  async getChangeEvents(date: Date, page = 0, pageSize = 100): Promise<XmlTournament[]> {
    return this._fetchMany<XmlTournament>(
      `${this._vr()}/Tournament?list=1&refdate=${format(date, "yyyy-MM-dd")}&pagesize=${pageSize}&pageno=${page}`,
      "Tournament",
      XmlTournamentSchema,
      false
    );
  }

  async getDate(tourneyId: string, encounterId: string, useCache = true) {
    const tm = await this._fetchOne<XmlTournamentMatch>(
      `${this._vr()}/Tournament/${tourneyId}/Match/${encounterId}/Date`,
      "TournamentMatch",
      XmlTournamentMatchSchema,
      useCache
    );
    return tm?.MatchDate;
  }

  async changeDate(tourneyId: string, matchId: string, newDate: Date) {
    const url = `${this._configService.get("VR_API")}/Tournament/${tourneyId}/Match/${matchId}/Date`;

    const body = `
    <TournamentMatch>
        <TournamentID>${tourneyId}</TournamentID>
        <MatchID>${matchId}</MatchID>
        <MatchDate>${formatInTimeZone(newDate, "Europe/Brussels", VisualService.visualFormat)}</MatchDate>
    </TournamentMatch>
  `;

    const options = {
      url,
      method: "PUT",
      withCredentials: true,
      auth: {
        username: `${this._configService.get("VR_API_USER")}`,
        password: `${this._configService.get("VR_API_PASS")}`,
      },
      headers: { "Content-Type": "application/xml" },
      data: body,
    };
    if (this._configService.get("NODE_ENV") === "production") {
      const resultPut = await axios(options);

      const bodyPut = parseResponse(resultPut.data, this._parser, this.logger) as XmlResult;
      if (bodyPut.Error?.Code !== 0 || bodyPut.Error.Message !== "Success.") {
        this.logger.error(options);
        throw new Error(bodyPut.Error?.Message);
      }

      await this._cacheManager.del(`${VisualService.CACHE_KEY}:${url}`);
    } else {
      this.logger.debug(options);
    }
  }
  async getRanking(useCache = true): Promise<XmlRanking[]> {
    return this._fetchMany<XmlRanking>(
      `${this._vr()}/Ranking`,
      "Ranking",
      XmlRankingSchema,
      useCache
    );
  }

  async getCategories(rankingId: string, useCache = true): Promise<XmlRankingCategory[]> {
    return this._fetchMany<XmlRankingCategory>(
      `${this._vr()}/Ranking/${rankingId}/Category`,
      "RankingCategory",
      XmlRankingCategorySchema,
      useCache
    );
  }

  async getPublications(rankingId: string, useCache = true): Promise<XmlRankingPublication[]> {
    return this._fetchMany<XmlRankingPublication>(
      `${this._vr()}/Ranking/${rankingId}/Publication`,
      "RankingPublication",
      XmlRankingPublicationSchema,
      useCache
    );
  }

  async getPoints(
    rankingId: string,
    publicationId: string,
    categoryId: string,
    useCache = true
  ): Promise<XmlRankingPublicationPoint[]> {
    return this._fetchMany<XmlRankingPublicationPoint>(
      `${this._vr()}/Ranking/${rankingId}/Publication/${publicationId}/Category/${categoryId}`,
      "RankingPublicationPoints",
      XmlRankingPublicationPointSchema,
      useCache
    );
  }

  private async _getFromApi(url: string, useCache = true) {
    const t0 = performance.now();

    // Allow disabling cache in development by setting environment variable
    const disableCacheInDev = this._configService.get("VISUAL_FORCE_CACHE_DEV");

    if (this._configService.get("NODE_ENV") !== "production" && !disableCacheInDev) {
      useCache = true;
      this.logger.debug(`Always using cache on dev`);
    }

    if (useCache && this._cacheManager) {
      const cached = await this._cacheManager.get(`${VisualService.CACHE_KEY}:${url}`);
      if (cached) {
        const t1 = performance.now();
        this.logger.verbose(`Getting from (cache) ${url} took ${(t1 - t0).toFixed(2)}ms`);
        return cached;
      }
    }

    const result = await this._http.get(url, {
      withCredentials: true,
      auth: {
        username: `${this._configService.get("VR_API_USER")}`,
        password: `${this._configService.get("VR_API_PASS")}`,
      },
      timeout: 1000000,
      responseType: "text",
      headers: {
        Accept: "text/xml, application/xml, */*",
      },
    });

    // Store for 1 week
    await this._cacheManager.set(`${VisualService.CACHE_KEY}:${url}`, result.data, CACHE_TTL);

    const t1 = performance.now();
    this.logger.verbose(`Getting from ${url} took ${(t1 - t0).toFixed(2)}ms`);

    return result.data;
  }

  /**
   * Fetch + parse + validate a list-shaped Visual API response in one call.
   * Always returns an array (empty when the payload key is missing) so
   * downstream code doesn't need to branch on shape.
   */
  private async _fetchMany<TOut>(
    url: string,
    payloadKey: keyof XmlResult,
    schema: z.ZodTypeAny,
    useCache: boolean
  ): Promise<TOut[]> {
    const result = await this._getFromApi(url, useCache);
    const parsed = parseResponse(result, this._parser, this.logger) as XmlResult;
    return validateMany<TOut>(parsed[payloadKey], schema, String(payloadKey), this.logger);
  }

  /**
   * Fetch + parse + validate a single-object Visual API response. Returns
   * undefined when the payload key is missing; throws on shape mismatch.
   */
  private async _fetchOne<TOut>(
    url: string,
    payloadKey: keyof XmlResult,
    schema: z.ZodTypeAny,
    useCache: boolean
  ): Promise<TOut | undefined> {
    const result = await this._getFromApi(url, useCache);
    const parsed = parseResponse(result, this._parser, this.logger) as XmlResult;
    return validateOne<TOut>(parsed[payloadKey], schema, String(payloadKey), this.logger);
  }
}
