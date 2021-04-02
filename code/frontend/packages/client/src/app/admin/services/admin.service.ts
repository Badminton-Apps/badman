import { environment } from './../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private httpClient: HttpClient) {}

  import() {
    return this.httpClient.get(`${environment.api}/${environment.apiVersion}/import`);
  }
  cleanup() {
    return this.httpClient.get(`${environment.api}/${environment.apiVersion}/import/cleanup`);
  }
  sync(force: boolean = false) {
    return this.httpClient.get(`${environment.api}/${environment.apiVersion}/import/sync`, {
      params: { force: `${force}` }
    });
  }

  linkAccounts() {
    return this.httpClient.get(`${environment.api}/${environment.apiVersion}/request-link`);
  }

  linkAccount(ids: string, accept: boolean) {
    return this.httpClient.put(
      `${environment.api}/${environment.apiVersion}/request-link/${accept}/${ids}`,
      {}
    );
  }
}
