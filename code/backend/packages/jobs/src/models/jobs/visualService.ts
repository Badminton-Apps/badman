import {
  logger,
  XmlMatch,
  XmlResult,
  XmlTeamMatch,
  XmlTournament,
  XmlTournamentDraw,
  XmlTournamentEvent
} from '@badvlasim/shared';
import axios, { AxiosInstance } from 'axios';
import { parse } from 'fast-xml-parser';
import * as rax from 'retry-axios';
import { performance } from 'perf_hooks';
import rateLimit from 'axios-rate-limit';
import { existsSync, readFileSync, writeFileSync } from 'fs';

export class VisualService {
  private _retries = 25;
  private _parseSettings = {
    attributeNamePrefix: '',
    ignoreAttributes: false,
    parseAttributeValue: true
  };
  private http: AxiosInstance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static cache: Map<string, any> = new Map();
  private static lastSaveSize = -1;

  constructor() {
    this.http = rateLimit(axios.create(), { maxRPS: 15 });
    rax.attach();
  }

  static initializeCache() {
    if (existsSync('./visalCache.json')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      VisualService.cache = new Map<string, any>(
        JSON.parse(readFileSync('./visalCache.json', 'utf-8'))
      );
      logger.debug(`Loaded ${VisualService.cache.size} items from cache`);
    }

    setTimeout(this.writeCacheToDisk.bind(this), 5000);
  }

  static writeCacheToDisk() {
    if (this.lastSaveSize !== this.cache.size && this.cache.size > 0) {
      this.lastSaveSize = this.cache.size;

      writeFileSync('./visalCache.json', JSON.stringify([...VisualService.cache]), {
        encoding: 'utf-8',
        flag: 'w'
      });
    }
    setTimeout(this.writeCacheToDisk.bind(this), 5000);
  }

  async getPlayers(tourneyId: string, useCache = true) {
    const result = await this._getFromApi(`${process.env.VR_API}/Tournament/${tourneyId}/Player`, useCache);
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return this._asArray(parsed.Player);
  }

  async getMatch(tourneyId: string, matchId: string | number, useCache = true) {
    const result = await this._getFromApi(
      `${process.env.VR_API}/Tournament/${tourneyId}/TeamMatch/${matchId}`,
      useCache
    );
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    if (parsed.Match) {
      return this._asArray(parsed.Match);
    }
    if (parsed.TeamMatch) {
      return this._asArray(parsed.TeamMatch);
    }

    logger.warn('No matches');
    return [];
  }

  async getMatches(
    tourneyId: string,
    drawId: string | number,
    useCache = true
  ): Promise<(XmlTeamMatch | XmlMatch)[]> {
    const result = await this._getFromApi(
      `${process.env.VR_API}/Tournament/${tourneyId}/Draw/${drawId}/Match`,
      useCache
    );
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;

    if (parsed.Match) {
      return this._asArray(parsed.Match);
    }
    if (parsed.TeamMatch) {
      return this._asArray(parsed.TeamMatch);
    }

    logger.warn('No matches');
    return [];
  }

  async getDraws(
    tourneyId: string,
    eventId: string | number,
    useCache = true
  ): Promise<XmlTournamentDraw[]> {
    const result = await this._getFromApi(
      `${process.env.VR_API}/Tournament/${tourneyId}/Event/${eventId}/Draw`,
      useCache
    );
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return this._asArray(parsed.TournamentDraw);
  }

  async getEvents(tourneyId: string | number, useCache = true): Promise<XmlTournamentEvent[]> {
    const result = await this._getFromApi(`${process.env.VR_API}/Tournament/${tourneyId}/Event`, useCache);
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return this._asArray(parsed.TournamentEvent);
  }

  async getTournament(tourneyId: string, useCache = true) {
    const result = await this._getFromApi(`${process.env.VR_API}/Tournament/${tourneyId}`);
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return parsed.Tournament as XmlTournament;
  }

  private _getFromApi(url, useCache = true) {
    if (useCache && VisualService.cache.has(url)) {
      return Promise.resolve({ data: VisualService.cache.get(url) });
    } else {
      const t0 = performance.now();
      // logger.silly(`Getting from ${url}, max requests per second: ${(this.http as any).getMaxRPS()}`);
      const request = this.http.get(url, {
        withCredentials: true,
        auth: {
          username: `${process.env.VR_API_USER}`,
          password: `${process.env.VR_API_PASS}`
        },
        timeout: 1000000,
        raxConfig: {
          statusCodesToRetry: [
            [100, 199],
            [429, 429],
            [500, 599]
          ],
          retry: this._retries,
          noResponseRetries: this._retries / 2,
          onRetryAttempt: (error) => {
            const cfg = rax.getConfig(error);
            if (cfg.currentRetryAttempt > this._retries * 0.75) {
              logger.warn(`Retry attempt #${cfg.currentRetryAttempt}`, error);
            } else {
              logger.debug(`Retry attempt #${cfg.currentRetryAttempt}`, error);
            }
          }
        },
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/xml'
        }
      });

      request.then(() => {
        const t1 = performance.now();
        logger.silly(`Got from ${url} in ${(t1 - t0).toFixed(2)}ms`);
      });

      request.then((r) => {
        VisualService.cache.set(url, r.data);
      });
      return request;
    }
  }

  private _asArray(obj) {
    return Array.isArray(obj) ? obj : [obj];
  }
}
