import axios, { AxiosInstance } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import axiosRetry from 'axios-retry';

import { performance } from 'perf_hooks';
import axiosRateLimit from 'axios-rate-limit';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import {
  XmlMatch,
  XmlResult,
  XmlTeamMatch,
  XmlTournament,
  XmlTournamentDraw,
  XmlTournamentEvent,
} from '../utils';
import { Moment } from 'moment';
import { ConfigService } from '@nestjs/config';
import moment from 'moment-timezone';

@Injectable()
export class VisualService {
  private static readonly logger = new Logger(VisualService.name);
  public static visualFormat = 'YYYY-MM-DDTHH:mm:ss';

  private _retries = 25;
  private http: AxiosInstance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static cache: Map<string, any> = new Map();
  private static lastSaveSize = -1;
  private parser: XMLParser;

  constructor(private configService: ConfigService) {
    this.http = axiosRateLimit(axios.create(), { maxRPS: 15 });
    axiosRetry(this.http, { retries: this._retries });
    this.parser = new XMLParser();
    VisualService.initializeCache();
  }

  static initializeCache() {
    if (existsSync('./visalCache.json')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      VisualService.cache = new Map<string, any>(
        JSON.parse(readFileSync('./visalCache.json', 'utf-8'))
      );
      this.logger.debug(`Loaded ${VisualService.cache.size} items from cache`);
    }

    setTimeout(this.writeCacheToDisk.bind(this), 5000);
  }

  static writeCacheToDisk() {
    if (this.lastSaveSize !== this.cache.size && this.cache.size > 0) {
      this.lastSaveSize = this.cache.size;

      writeFileSync(
        './visalCache.json',
        JSON.stringify([...VisualService.cache]),
        {
          encoding: 'utf-8',
          flag: 'w',
        }
      );
    }
    setTimeout(this.writeCacheToDisk.bind(this), 5000);
  }

  async getPlayers(tourneyId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this.configService.get('VR_API')}/Tournament/${tourneyId}/Player`,
      useCache
    );
    const parsed = this.parser.parse(result.data).Result as XmlResult;
    return this._asArray(parsed.Player);
  }

  async getMatch(tourneyId: string, matchId: string | number, useCache = true) {
    const result = await this._getFromApi(
      `${this.configService.get(
        'VR_API'
      )}/Tournament/${tourneyId}/TeamMatch/${matchId}`,
      useCache
    );
    const parsed = this.parser.parse(result.data).Result as XmlResult;
    if (parsed.Match) {
      return this._asArray(parsed.Match);
    }
    if (parsed.TeamMatch) {
      return this._asArray(parsed.TeamMatch);
    }

    VisualService.logger.warn('No matches');
    return [];
  }

  async getMatches(
    tourneyId: string,
    drawId: string | number,
    useCache = true
  ): Promise<(XmlTeamMatch | XmlMatch)[]> {
    const result = await this._getFromApi(
      `${this.configService.get(
        'VR_API'
      )}/Tournament/${tourneyId}/Draw/${drawId}/Match`,
      useCache
    );
    const parsed = this.parser.parse(result.data).Result as XmlResult;

    if (parsed.Match) {
      return this._asArray(parsed.Match);
    }
    if (parsed.TeamMatch) {
      return this._asArray(parsed.TeamMatch);
    }

    VisualService.logger.warn('No matches');
    return [];
  }

  async getDraws(
    tourneyId: string,
    eventId: string | number,
    useCache = true
  ): Promise<XmlTournamentDraw[]> {
    const result = await this._getFromApi(
      `${this.configService.get(
        'VR_API'
      )}/Tournament/${tourneyId}/Event/${eventId}/Draw`,
      useCache
    );
    const parsed = this.parser.parse(result.data).Result as XmlResult;
    return this._asArray(parsed.TournamentDraw);
  }

  async getDraw(
    tourneyId: string,
    drawId: string | number,
    useCache = true
  ): Promise<XmlTournamentDraw> {
    const result = await this._getFromApi(
      `${this.configService.get(
        'VR_API'
      )}/Tournament/${tourneyId}/Draw/${drawId}`,
      useCache
    );
    const parsed = this.parser.parse(result.data).Result as XmlResult;
    return parsed.TournamentDraw as XmlTournamentDraw;
  }

  async getEvents(
    tourneyId: string | number,
    useCache = true
  ): Promise<XmlTournamentEvent[]> {
    const result = await this._getFromApi(
      `${this.configService.get('VR_API')}/Tournament/${tourneyId}/Event`,
      useCache
    );
    const parsed = this.parser.parse(result.data).Result as XmlResult;
    return this._asArray(parsed.TournamentEvent);
  }

  async getTournament(tourneyId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this.configService.get('VR_API')}/Tournament/${tourneyId}`,
      useCache
    );
    const parsed = this.parser.parse(result.data).Result as XmlResult;
    return parsed.Tournament as XmlTournament;
  }

  async getChangeEvents(date: Moment, page = 0, pageSize = 100) {
    const url = `${this.configService.get(
      'VR_API'
    )}/Tournament?list=1&refdate=${date.format(
      'YYYY-MM-DD'
    )}&pagesize=${pageSize}&pageno=${page}`;

    VisualService.logger.debug(
      `Getting changes from ${url}, user: ${this.configService.get(
        'VR_API_USER'
      )}, pass: ${this.configService.get('VR_API_PASS')}`
    );

    const result = await axios.get(url, {
      withCredentials: true,
      auth: {
        username: `${this.configService.get('VR_API_USER')}`,
        password: `${this.configService.get('VR_API_PASS')}`,
      },
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml',
      },
    });

    if (result.status !== 200) {
      throw new Error(`Cannot get changed tournaments: ${result.status}`);
    }

    const body = this.parser.parse(result.data).Result as XmlResult;

    if (body.Tournament === undefined) {
      return [];
    }

    const tournaments = Array.isArray(body.Tournament)
      ? [...body.Tournament]
      : [body.Tournament];

    // TODO: Wait untill Visual fixes this
    // if (tournaments.length != 0) {
    //   tournaments.concat(await this._getChangeEvents(date, page + 1));
    // }

    return tournaments;
  }

  async getDate(tourneyId: string, encounterId: string, useCache = true) {
    const result = await this._getFromApi(
      `${this.configService.get(
        'VR_API'
      )}/Tournament/${tourneyId}/Match/${encounterId}/Date`,
      useCache
    );
    const parsed = this.parser.parse(result.data).Result as XmlResult;
    return parsed.TournamentMatch.MatchDate;
  }

  async changeDate(tourneyId: string, encounterId: string, newDate: Date) {
    const url = `${this.configService.get(
      'VR_API'
    )}/Tournament/${tourneyId}/Match/${encounterId}/Date`;

    const body = `
    <TournamentMatch>
        <TournamentID>${tourneyId}</TournamentID>
        <MatchID>${encounterId}</MatchID>
        <MatchDate>${moment(newDate)
          .tz('Europe/Brussels')
          .format(VisualService.visualFormat)}</MatchDate>
    </TournamentMatch>
  `;

    const options = {
      url,
      method: 'PUT',
      withCredentials: true,
      auth: {
        username: `${this.configService.get('VR_API_USER')}`,
        password: `${this.configService.get('VR_API_PASS')}`,
      },
      headers: { 'Content-Type': 'application/xml' },
      data: body,
    };

    if (this.configService.get('NODE_ENV') === 'production') {
      const resultPut = await axios(options);
      const parser = new XMLParser();

      const bodyPut = parser.parse(resultPut.data).Result as XmlResult;
      if (bodyPut.Error?.Code !== 0 || bodyPut.Error.Message !== 'Success.') {
        VisualService.logger.error(options);
        throw new Error(bodyPut.Error.Message);
      }
      VisualService.cache.delete(url);
    } else {
      VisualService.logger.debug(options);
    }
  }

  private _getFromApi(url: string, useCache = true) {
    if (useCache && VisualService.cache.has(url)) {
      return Promise.resolve({ data: VisualService.cache.get(url) });
    } else {
      const t0 = performance.now();
      // logger.silly(`Getting from ${url}, max requests per second: ${(this.http as any).getMaxRPS()}`);
      const request = this.http.get(url, {
        withCredentials: true,
        auth: {
          username: `${this.configService.get('VR_API_USER')}`,
          password: `${this.configService.get('VR_API_PASS')}`,
        },
        timeout: 1000000,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/xml',
        },
      });

      request.then(() => {
        const t1 = performance.now();
        VisualService.logger.verbose(
          `Got from ${url} in ${(t1 - t0).toFixed(2)}ms`
        );
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
