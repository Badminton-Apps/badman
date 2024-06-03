import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EventCompetition } from '@badman/frontend-models';
import saveAs from 'file-saver';
import { map, take } from 'rxjs/operators';
import { EXCEL_CONFIG } from '../excel.module';
import { IExcelConfig } from '../interfaces';
@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  private httpClient = inject(HttpClient);
  private config = inject<IExcelConfig>(EXCEL_CONFIG);

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
        map((result) => saveAs(result, `${event.name}.xlsx`)),
      );
  }
}
