import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Club } from '@badman/frontend-models';
import saveAs from 'file-saver';
import { map, take } from 'rxjs';
import { ITwizzitConfig } from '../interfaces';
import { TWIZZIT_CONFIG } from '../twizzit.module';
@Injectable({
  providedIn: 'root',
})
export class TwizzitService {
  private httpClient = inject(HttpClient);
  private config = inject<ITwizzitConfig>(TWIZZIT_CONFIG);

  downloadTwizzit(club: Club, season: number) {
    return this.httpClient
      .get(`${this.config.api}/games`, {
        params: {
          clubId: club.id ?? '',
          year: `${season}`,
        },
        responseType: 'blob',
      })
      .pipe(
        take(1),
        map((result) => saveAs(result, `twizzit-${club.slug}-${season}.xlsx`)),
      );
  }
}
