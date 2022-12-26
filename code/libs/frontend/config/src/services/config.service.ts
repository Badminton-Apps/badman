import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  public appConfig?: AppConfiguration;

  async loadAppConfig(config: AppConfiguration) {
    this.appConfig = config;
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

export type AppConfiguration = Readonly<{
  production: boolean;
  version: string;
  api: string;
  apiVersion: string;
  apmServer: string;
  adsense: {
    adClient: string;
    show: boolean;
  };
}>;
