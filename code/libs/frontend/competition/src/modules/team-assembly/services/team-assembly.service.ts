import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from '@badman/frontend-config';

@Injectable({
  providedIn: 'root',
})
export class TeamAssemblyService {
  constructor(
    private httpClient: HttpClient,
    private configService: ConfigService
  ) {}

  getTeamAssembly(input: {
    systemId: string;
    captainId: string;
    teamId: string;
    encounterId: string;
    team: {
      single: string[];
      double: string[][];
      subtitude: string[];
    };
  }) {
    return this.httpClient.post(
      `${this.configService.apiBaseUrl}/pdf/team-assembly`,
      input,
      {
        responseType: 'text',
      }
    );
  }
}
