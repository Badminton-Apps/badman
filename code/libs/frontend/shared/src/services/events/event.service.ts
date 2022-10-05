import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ConfigService } from '@badman/frontend/config';
import { Club } from '@badman/frontend/models';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  constructor(
    private httpClient: HttpClient,
    private configService: ConfigService
  ) {}

  finishEnrollment(club: Club, year: number) {
    return this.httpClient.post(
      `${this.configService.apiBaseUrl}/enrollment/finish/${club.id}/${year}`,
      null
    );
  }
}
