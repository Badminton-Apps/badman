import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private appConfig: any;

  constructor(private http: HttpClient) {}

  loadAppConfig() {
    return this.http
      .get('/assets/config.json')
      .toPromise()
      .then((data) => {
        this.appConfig = data;
      });
  }

  // This is an example property ... you can make it however you want.
  get apiBaseUrl() {
    if (!this.appConfig) {
      throw Error('Config file not loaded!');
    }

    return `${this.appConfig.api}/api/${this.appConfig.apiVersion}`
  }

  get graphqlUrl() {
    if (!this.appConfig) {
      throw Error('Config file not loaded!');
    }

    return `${this.appConfig.api}/graphql`
  }

  get isProduction(){
    if (!this.appConfig) {
      throw Error('Config file not loaded!');
    }

    return this.appConfig.production == true 
  }
}
