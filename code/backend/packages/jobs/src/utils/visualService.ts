import { logger, XmlResult, XmlTournament } from '@badvlasim/shared';
import axios from 'axios';
import { parse } from 'fast-xml-parser';
import * as rax from 'retry-axios';

export class VisualService {
  private _retries = 25;
  private _parseSettings = {
    attributeNamePrefix: '',
    ignoreAttributes: false,
    parseAttributeValue: true
  };

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
    return this._asArray(parsed.Match);
  }

  async getMatches(tourneyId: string, drawId: string | number) {
    const result = await this._getFromApi(
      `${process.env.VR_API}/Tournament/${tourneyId}/Draw/${drawId}/Match`
    );
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return this._asArray(parsed.TeamMatch);
  }

  async getDraws(tourneyId: string, eventId: string | number) {
    const result = await this._getFromApi(
      `${process.env.VR_API}/Tournament/${tourneyId}/Event/${eventId}/Draw`
    );
    const parsed = parse(result.data, this._parseSettings).Result as XmlResult;
    return this._asArray(parsed.TournamentDraw);
  }

  async getEvents(tourneyId: string | number) {
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
    logger.silly(`Getting from ${url}`);
    return axios.get(url, { 
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
      },
      timeout: 600000,
      raxConfig: {
        retry: this._retries,
        onRetryAttempt: err => {
          const cfg = rax.getConfig(err);
          if (cfg.currentRetryAttempt > this._retries * 0.75) {
            logger.warn(`Retry attempt #${cfg.currentRetryAttempt}`, err);
          } else {
            logger.debug(`Retry attempt #${cfg.currentRetryAttempt}`, err);
          }
        }
      },
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });
  }

  private _asArray(obj) {
    return Array.isArray(obj) ? obj : [obj];
  }
}
