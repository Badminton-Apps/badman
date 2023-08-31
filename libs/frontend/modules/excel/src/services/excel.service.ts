import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { IExcelConfig } from '../interfaces';
import { EXCEL_CONFIG } from '../excel.module';
import { EventCompetition } from '@badman/frontend-models';
import saveAs from 'file-saver';
import { map, take } from 'rxjs/operators';
@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  constructor(
    private httpClient: HttpClient,
    @Inject(EXCEL_CONFIG)
    private config: IExcelConfig
  ) {}

  getBaseplayersEnrollment(event: EventCompetition) {
    if (!event?.id) {
      throw new Error('Event is not defined');
    }

    return this.httpClient
      .get(`${this.config.api}/enrollment`, {
        params: {
          eventId: event.id,
        },
        responseType: 'blob',
      })
      .pipe(
        take(1),
        map((result) => saveAs(result, `${event.name}.xlsx`))
      );
  }
}
