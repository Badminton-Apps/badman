import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, map, take } from 'rxjs/operators';
import { environment } from './../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RankingService {
  private urlBase = `${environment.api}/api/${environment.apiVersion}/ranking`;
  constructor(private httpClient: HttpClient) {}

  downloadRankingAsync(systems: string[], type?: string) {
    if (systems.length <= 0) {
      throw Error('No systems selected');
    }

    return this.httpClient
      .get<Blob>(
        `${this.urlBase}/${
          type === 'visual'
            ? 'exportVisual'
            : type === 'visual-nonBVL_LFBB'
            ? 'exportNotVisual'
            : 'export'
        }`,
        {
          params: {
            systems: `${systems.join(',')}`,
          },
          observe: 'response',
          responseType: 'blob' as 'json',
        }
      )
      .pipe(
        take(1),
        map((response) => {
          let fileName = 'file';

          const contentDisposition = response.headers.get(
            'Content-Disposition'
          );
          if (contentDisposition) {
            const fileNameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = fileNameRegex.exec(contentDisposition);
            if (matches != null && matches[1]) {
              fileName = matches[1].replace(/['"]/g, '');
            }
          }

          // IE doesn't allow using a blob object directly as link href
          // instead it is necessary to use msSaveOrOpenBlob
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window.navigator as any)?.msSaveOrOpenBlob && response.body) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window.navigator as any).msSaveOrOpenBlob(response.body, fileName);
            return null;
          }

          if (response.body == null){
            throw Error('No data');
          }

          // For other browsers:
          // Create a link pointing to the ObjectURL containing the blob.
          const downloadURL = URL.createObjectURL(response.body);

          const link = document.createElement('a');
          link.href = downloadURL;
          link.download = fileName;
          // this is necessary as link.click() does not work on the latest firefox
          link.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );

          return { link, downloadURL };

          // const pwa = window.open(downloadURL);
          // if (!pwa || pwa.closed || typeof pwa.closed === 'undefined') {
          //   alert('Please disable your Pop-up blocker and try again.');
          // }
        }),
        delay(100),
        // For Firefox it is necessary to delay revoking the ObjectURL
        map((cleanup) => {
          if (cleanup) {
            const { link, downloadURL } = cleanup;
            window.URL.revokeObjectURL(downloadURL);
            link.remove();
          }
        })
      );
  }

  getStatisticUrl(systemId: string, playerId: string) {
    return `${this.urlBase}/statistics/${systemId}/${playerId}`;
  }
}
