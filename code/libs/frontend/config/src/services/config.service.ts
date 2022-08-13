import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  public appConfig?: AppConfig;

  constructor(private http: HttpClient) {}

  async loadAppConfig() {
    const data = await lastValueFrom(this.http.get('/assets/config.json'));
    this.appConfig = data as AppConfig;
  }

  // This is an example property ... you can make it however you want.
  get apiBaseUrl() {
    if (!this.appConfig) {
      throw Error('Config file not loaded!');
    }

    return `${this.appConfig.api}/api/${this.appConfig.apiVersion}`;
  }

  get graphqlUrl() {
    if (!this.appConfig) {
      throw Error('Config file not loaded!');
    }

    return `${this.appConfig.api}/graphql`;
  }

  get socketUrl() {
    if (!this.appConfig) {
      throw Error('Config file not loaded!');
    }

    return `${this.appConfig.api}/socket.io`;
  }

  get isProduction() {
    if (!this.appConfig) {
      throw Error('Config file not loaded!');
    }

    return this.appConfig.production == true;
  }
}

export interface Adsense {
  adClient: string;
  show: boolean;
}

export interface AppConfig {
  production: boolean;
  version: string;
  api: string;
  apiVersion: string;
  apmServer: string;
  adsense: Adsense;
}
