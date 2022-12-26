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

    single1?: string;
    single2?: string;
    single3?: string;
    single4?: string;

    double1?: string[];
    double2?: string[];
    double3?: string[];
    double4?: string[];

    subtitudes: string[];
  }) {
    console.log(input);

    return this.httpClient.post(
      `${this.configService.apiBaseUrl}/pdf/team-assembly`,
      input,
      {
        responseType: 'text',
      }
    );
  }
}
