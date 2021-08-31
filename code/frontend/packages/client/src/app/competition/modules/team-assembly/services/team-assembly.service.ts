import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TeamAssemblyService {
  private urlBase = `${environment.api}/${environment.apiVersion}/pdf`;
  constructor(private httpClient: HttpClient) {}

  getPdf(input: {
    captainId: string;
    teamId: string;
    encounterId: string;
    team: {
      single: string[];
      double: string[][];
      subtitude: string[];
    };
  }) {
    return this.httpClient.post(`${this.urlBase}/team-assembly`, input, { responseType: 'blob' });
  }
} 
