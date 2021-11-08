import { map } from 'rxjs/operators';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { environment } from './../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SimulateService {
  private urlBase = `${environment.api}/${environment.apiVersion}/simulate`;
  constructor(private httpClient: HttpClient) {}

  calculateRanking(systems: string[], endDate: Date, startDate?: Date, startingRankings?: boolean) {
    if (systems.length <= 0) {
      return of();
    }

    let params: {
      [key: string]: any;
    } = {
      systems: `${systems.join(',')}`,
      endDate: endDate.toISOString(),
    };

    if (startDate) {
      params['startDate'] = startDate.toISOString();
    }
    if (startingRankings) {
      params['runningFromStart'] = startingRankings;
    }

    return this.httpClient.get(`${this.urlBase}/calculate`, { params });
  }

  resetRanking(systems: string[]) {
    if (systems.length <= 0) {
      return of();
    }
    return this.httpClient.post(`${this.urlBase}/reset`, {
      systems: `${systems.join(',')}`,
    });
  }
}
