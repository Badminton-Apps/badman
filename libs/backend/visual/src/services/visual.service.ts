import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { XMLParser } from 'fast-xml-parser';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axiosRateLimit from 'axios-rate-limit';
import { Moment } from 'moment';
import moment from 'moment-timezone';
import { performance } from 'perf_hooks';
import {
  XmlMatch,
  XmlResult,
  XmlTeam,
  XmlTeamMatch,
  XmlTournament,
  XmlTournamentDraw,
  XmlTournamentEvent,
} from '../utils';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CACHE_TTL } from '@badman/backend-cache';
import { ConfigType } from '@badman/utils';

@Injectable()
export class VisualService {
  private readonly logger = new Logger(VisualService.name);
  public static visualFormat = 'YYYY-MM-DDTHH:mm:ss';
  private static CACHE_KEY = 'visual';

  private _retries = 25;
  private _http: AxiosInstance;
  private _parser: XMLParser;

  constructor(
    private _configService: ConfigService<ConfigType>,
    @Inject(CACHE_MANAGER) private _cacheManager: Cache,
  ) {
    this._http = axiosRateLimit(axios.create(), { maxRPS: 15 });
    axiosRetry(this._http, { retries: this._retries });
    this._parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
    });
  }
  async getPlayers(tourneyId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}/Player`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return this._asArray(parsed.Player);
  }
  async getTeam(tourneyId: string, teamId: string | number, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}/team/${teamId}`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed.Team as XmlTeam;
  }
  async getTeamMatch(tourneyId: string, matchId: string | number, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}/TeamMatch/${matchId}`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return this._asArray(parsed.Match) as XmlMatch[];
  }
  async getGame(tourneyId: string, matchId: string | number, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}/MatchDetail/${matchId}`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed.Match;
  }
  async getGames(
    tourneyId: string,
    drawId: string | number,
    useCache = true,
  ): Promise<(XmlTeamMatch | XmlMatch)[]> {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}/Draw/${drawId}/Match`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;

    if (parsed.Match) {
      return this._asArray(parsed.Match);
    }
    if (parsed.TeamMatch) {
      return this._asArray(parsed.TeamMatch);
    }

    this.logger.warn('No matches');
    return [];
  }
  async getDraws(
    tourneyId: string,
    eventId: string | number,
    useCache = true,
  ): Promise<XmlTournamentDraw[]> {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}/Event/${eventId}/Draw`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return this._asArray(parsed.TournamentDraw);
  }
  async getDraw(
    tourneyId: string,
    drawId: string | number,
    useCache = true,
  ): Promise<XmlTournamentDraw> {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}/Draw/${drawId}`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed.TournamentDraw as XmlTournamentDraw;
  }
  async getSubEvents(eventCode: string | number, useCache = true): Promise<XmlTournamentEvent[]> {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${eventCode}/Event`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return this._asArray(parsed.TournamentEvent);
  }
  async getSubEvent(
    eventCode: string | number,
    subEventCode: string | number,
    useCache = true,
  ): Promise<XmlTournamentEvent> {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${eventCode}/Event/${subEventCode}`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed?.TournamentEvent as XmlTournamentEvent;
  }
  async getTournament(tourneyId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed?.Tournament as XmlTournament;
  }
  async searchEvents(query: string) {
    const url = `${this._configService.get('VR_API')}/Tournament?q=${query}`;

    const result = await this._getFromApi(url, false);
    const body = this._parseResponse(result) as XmlResult;

    if (body?.Tournament === undefined) {
      return [];
    }

    const tournaments = Array.isArray(body.Tournament) ? [...body.Tournament] : [body.Tournament];

    // TODO: Wait untill Visual fixes this
    // if (tournaments.length != 0) {
    //   tournaments.concat(await this._getChangeEvents(date, page + 1));
    // }

    return tournaments;
  }
  async getEvent(code: string) {
    const url = `${this._configService.get('VR_API')}/Tournament/${code}`;

    const result = await this._getFromApi(url, false);
    const body = this._parseResponse(result) as XmlResult;

    if (body?.Tournament === undefined) {
      return [];
    }

    const tournaments = Array.isArray(body.Tournament) ? [...body.Tournament] : [body.Tournament];

    return tournaments;
  }
  async getChangeEvents(date: Moment, page = 0, pageSize = 100) {
    const url = `${this._configService.get('VR_API')}/Tournament?list=1&refdate=${date.format(
      'YYYY-MM-DD',
    )}&pagesize=${pageSize}&pageno=${page}`;

    const result = await this._getFromApi(url, false);
    const body = this._parseResponse(result) as XmlResult;

    if (body?.Tournament === undefined) {
      return [];
    }

    const tournaments = Array.isArray(body.Tournament) ? [...body.Tournament] : [body.Tournament];

    return tournaments;
  }
  async getDate(tourneyId: string, encounterId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Tournament/${tourneyId}/Match/${encounterId}/Date`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed.TournamentMatch?.MatchDate;
  }

  async changeDate(tourneyId: string, matchId: string, newDate: Date) {
    const url = `${this._configService.get('VR_API')}/Tournament/${tourneyId}/Match/${matchId}/Date`;

    const body = `
    <TournamentMatch>
        <TournamentID>${tourneyId}</TournamentID>
        <MatchID>${matchId}</MatchID>
        <MatchDate>${moment(newDate).tz('Europe/Brussels').format(VisualService.visualFormat)}</MatchDate>
    </TournamentMatch>
  `;

    const options = {
      url,
      method: 'PUT',
      withCredentials: true,
      auth: {
        username: `${this._configService.get('VR_API_USER')}`,
        password: `${this._configService.get('VR_API_PASS')}`,
      },
      headers: { 'Content-Type': 'application/xml' },
      data: body,
    };
    if (this._configService.get('NODE_ENV') === 'production') {
      const resultPut = await axios(options);

      const bodyPut = this._parseResponse(resultPut.data) as XmlResult;
      if (bodyPut.Error?.Code !== 0 || bodyPut.Error.Message !== 'Success.') {
        this.logger.error(options);
        throw new Error(bodyPut.Error?.Message);
      }

      await this._cacheManager.del(`${VisualService.CACHE_KEY}:${url}`);
    } else {
      this.logger.debug(options);
    }
  }
  async getRanking(useCache = true) {
    const result = await this._getFromApi(`${this._configService.get('VR_API')}/Ranking`, useCache);
    const parsed = this._parseResponse(result) as XmlResult;
    return this._asArray(parsed.Ranking);
  }
  async getCategories(rankingId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Ranking/${rankingId}/Category`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed.RankingCategory;
  }
  async getPublications(rankingId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Ranking/${rankingId}/Publication`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed.RankingPublication;
  }
  async getPoints(rankingId: string, publicationId: string, categoryId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this._configService.get('VR_API')}/Ranking/${rankingId}/Publication/${publicationId}/Category/${categoryId}`,
      useCache,
    );
    const parsed = this._parseResponse(result) as XmlResult;
    return parsed.RankingPublicationPoints;
  }

  private async _getFromApi(url: string, useCache = true) {
    const t0 = performance.now();

    if (this._configService.get('NODE_ENV') !== 'production') {
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
        username: `${this._configService.get('VR_API_USER')}`,
        password: `${this._configService.get('VR_API_PASS')}`,
      },
      timeout: 1000000,
      responseType: 'text',
      headers: {
        Accept: 'text/xml, application/xml, */*',
      },
    });

    // Store for 1 week
    await this._cacheManager.set(`${VisualService.CACHE_KEY}:${url}`, result.data, CACHE_TTL);

    const t1 = performance.now();
    this.logger.verbose(`Getting from ${url} took ${(t1 - t0).toFixed(2)}ms`);

    return result.data;
  }

  private _asArray(obj: unknown | unknown[]) {
    return Array.isArray(obj) ? obj : [obj];
  }
  private _parseResponse(data: string | unknown): XmlResult | unknown {
    // If data is not a string, it's likely already parsed JSON
    if (typeof data !== 'string') {
      this.logger.debug('Data is already parsed (not a string), processing for type corrections');
      if (data && typeof data === 'object' && 'Result' in data) {
        // Extract the Result and ensure proper typing
        return this._normalizeTypes((data as { Result: unknown }).Result);
      }
      // Apply type normalization to the parsed JSON data
      return this._normalizeTypes(data);
    }

    // Check if the response is XML by looking for XML-like content
    const trimmedData = data.trim(); // Check for XML declaration or XML tags
    if (trimmedData.startsWith('<?xml') || trimmedData.startsWith('<')) {
      // It's XML, parse with XML parser
      const parsed = this._parser.parse(data);
      return this._normalizeTypes(parsed.Result || parsed);
    } else {
      // Assume it's JSON, parse as JSON
      try {
        const jsonParsed = JSON.parse(data);
        return this._normalizeTypes(jsonParsed);
      } catch (error) {
        this.logger.error('Failed to parse response as JSON:', error);
        // Fallback to XML parsing if JSON parsing fails
        const parsed = this._parser.parse(data);
        return this._normalizeTypes(parsed.Result || parsed);
      }
    }
  }

  /**
   * Normalizes data types to ensure enums are properly typed as numbers
   */
  private _normalizeTypes(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this._normalizeTypes(item));
    }

    if (typeof data === 'object') {
      const normalized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(data)) {
        // Convert enum fields to numbers
        switch (key) {
          case 'GenderID':
          case 'GameTypeID':
          case 'TypeID':
          case 'MatchTypeID':
          case 'ScoreStatus':
          case 'TournamentTypeID':
          case 'DrawTypeID':
          case 'LevelID':
          case 'Winner':
          case 'MatchOrder':
          case 'Code':
          case 'Size':
          case 'Team1':
          case 'Team2':
          case 'Rank':
          case 'Level':
          case 'Totalpoints':
            // Convert to number if it's a string representation of a number
            if (typeof value === 'string' && !isNaN(Number(value))) {
              normalized[key] = Number(value);
            } else if (typeof value === 'number') {
              normalized[key] = value;
            } else {
              normalized[key] = this._normalizeTypes(value);
            }
            break;
          case 'MemberID':
            // MemberID should remain a string but ensure it's properly typed
            normalized[key] = typeof value === 'string' ? value : String(value);
            break;
          default:
            // Recursively normalize nested objects
            normalized[key] = this._normalizeTypes(value);
            break;
        }
      }

      return normalized;
    }

    return data;
  }
}
