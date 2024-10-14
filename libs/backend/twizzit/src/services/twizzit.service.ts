import { ConfigType } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import axiosRateLimit from 'axios-rate-limit';
import axiosRetry from 'axios-retry';

@Injectable()
export class TwizzitService {
  private readonly logger = new Logger(TwizzitService.name);
  private _retries = 25;
  private _http: AxiosInstance;

  constructor(private _configService: ConfigService<ConfigType>) {
    this._http = axiosRateLimit(
      axios.create({
        baseURL: this._configService.get('TWIZZIT_API'),
      }),
      { maxRPS: 15 },
    );
    axiosRetry(this._http, { retries: this._retries });

    // add debug logging
    this._http.interceptors.request.use((request) => {
      this.logger.debug(
        `Request: ${request.method} ${request.url}, ${JSON.stringify(request.params)}}`,
      );
      return request;
    });
  }

  setHeaders(token: string) {
    this._http.defaults.headers.common = {
      Authorization: `Bearer ${token}`,
    };
  }

  getLogin() {
    return this._http.post(`/v2/api/authenticate`, {
      username: this._configService.get('TWIZZIT_API_USER'),
      password: this._configService.get('TWIZZIT_API_PASS'),
    });
  }

  getOrganisations() {
    return this._http.get(`/v2/api/organizations`);
  }

  getSeasons(organisationIds: number[]) {
    return this._http.get(`/v2/api/seasons`, {
      params: {
        'organization-ids': organisationIds,
        'is-current-season': true,
      },
    });
  }

  getContacts(organisationIds: number[], contactIds: number[], limit: number, offset: number) {
    return this._http.get(`/v2/api/contacts`, {
      params: {
        'organization-ids': organisationIds,
        'contact-ids': contactIds,
        limit,
        offset,
      },
    });
  }

  getMemberships(
    types: number[],
    orgIds: number[],
    seasonIds: number[],
    limit: number,
    offset: number,
  ) {
    return this._http.get(`/v2/api/memberships`, {
      params: {
        'membership-type-ids': types,
        'organization-ids': orgIds,
        'season-ids': seasonIds,
        limit,
        offset,
      },
    });
  }

  getMembershipTypes(orgIds: number[]) {
    return this._http.get(`/v2/api/membership-types`, {
      params: {
        'organization-ids': orgIds,
      },
    });
  }
}
