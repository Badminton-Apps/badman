import { map } from 'rxjs/operators';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of, lastValueFrom } from 'rxjs';
import { environment } from './../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RankingService {
  private urlBase = `${environment.api}/${environment.apiVersion}/ranking`;
  constructor(private httpClient: HttpClient) {}

  async downloadRankingAsync(systems: string[], type?: string) {
    if (systems.length <= 0) {
      return of();
    }
    const response = await lastValueFrom(
      this.httpClient.get(
        `${this.urlBase}/${
          type === 'visual' ? 'exportVisual' : type === 'visual-nonBVL_LFBB' ? 'exportNotVisual' : 'export'
        }`,
        {
          params: {
            systems: `${systems.join(',')}`,
          },
          responseType: 'blob',
          observe: 'response',
        }
      )
    );

    let fileName = 'file';

    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const fileNameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = fileNameRegex.exec(contentDisposition);
      if (matches != null && matches[1]) {
        fileName = matches[1].replace(/['"]/g, '');
      }
    }

    // IE doesn't allow using a blob object directly as link href
    // instead it is necessary to use msSaveOrOpenBlob
    if ((window.navigator as any)?.msSaveOrOpenBlob && response.body) {
      (window.navigator as any).msSaveOrOpenBlob(response.body, fileName);
      return of();;
    }

    // For other browsers:
    // Create a link pointing to the ObjectURL containing the blob.
    const downloadURL = URL.createObjectURL(response.body);

    const link = document.createElement('a');
    link.href = downloadURL;
    link.download = fileName;
    // this is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

    setTimeout((): void => {
      // For Firefox it is necessary to delay revoking the ObjectURL
      window.URL.revokeObjectURL(downloadURL);
      link.remove();
    }, 100);

    return of();;
    // const pwa = window.open(downloadURL);
    // if (!pwa || pwa.closed || typeof pwa.closed === 'undefined') {
    //   alert('Please disable your Pop-up blocker and try again.');
    // }
  }

  getStatisticUrl(systemId: string, playerId: string) {
    return `${this.urlBase}/statistics/${systemId}/${playerId}`;
  }
}
