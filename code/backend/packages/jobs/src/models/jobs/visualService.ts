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

export class VisualService {
  private _retries = 25;
  private _parseSettings = {
    attributeNamePrefix: '',
    ignoreAttributes: false,
    parseAttributeValue: true
  }; 
  private http: AxiosInstance;

  constructor() {
    this.http = rateLimit(axios.create(), { maxRPS: 10 });
    rax.attach();
  }

  async getPlayers(tourneyId: string) {
    const result = await this._getFromApi(`${process.env.VR_API}/Tournament/${tourneyId}/Player`);
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return this._asArray(parsed.Player);
  }

  async getMatch(tourneyId: string, matchId: string | number) {
    const result = await this._getFromApi(
      `${process.env.VR_API}/Tournament/${tourneyId}/TeamMatch/${matchId}`
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
    drawId: string | number
  ): Promise<(XmlTeamMatch | XmlMatch)[]> {
    const result = await this._getFromApi(
      `${process.env.VR_API}/Tournament/${tourneyId}/Draw/${drawId}/Match`
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

  async getDraws(tourneyId: string, eventId: string | number): Promise<XmlTournamentDraw[]> {
    const result = await this._getFromApi(
      `${process.env.VR_API}/Tournament/${tourneyId}/Event/${eventId}/Draw`
    );
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return this._asArray(parsed.TournamentDraw);
  }

  async getEvents(tourneyId: string | number): Promise<XmlTournamentEvent[]> {
    const result = await this._getFromApi(`${process.env.VR_API}/Tournament/${tourneyId}/Event`);
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return this._asArray(parsed.TournamentEvent);
  }

  async getTournament(tourneyId: string) {
    const result = await this._getFromApi(`${process.env.VR_API}/Tournament/${tourneyId}`);
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return parsed.Tournament as XmlTournament;
  }

  private _getFromApi(url) {
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

    return request;
  }

  private _asArray(obj) {
    return Array.isArray(obj) ? obj : [obj];
  }
}
