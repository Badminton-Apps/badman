import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Imported } from 'app/_shared';
import { Event, EventType } from 'app/_shared/models';
import { environment } from 'environments/environment';
import { BehaviorSubject, concat } from 'rxjs';
import { map, share, tap, toArray } from 'rxjs/operators';
const getEventsQuery = require('graphql-tag/loader!../../graphql/events/queries/GetEvents.graphql');

const addEventMutation = require('graphql-tag/loader!../../graphql/events/mutations/addEvent.graphql');
const deleteEventMutation = require('graphql-tag/loader!../../graphql/importedEvents/mutations/DeleteImportedEvent.graphql');

const importedQuery = require('graphql-tag/loader!../../graphql/importedEvents/queries/GetImported.graphql');

@Injectable({
  providedIn: 'root',
})
export class EventService {
  public importStatus$ = new BehaviorSubject<{
    completed: boolean;
    finished: number;
    total: number;
  }>({ completed: true, finished: 0, total: 0 });

  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  getEvents(
    order: string,
    first: number,
    after: string,
    type: EventType,
    query: any
  ) {
    let where = undefined;
    if (query) {
      where = {
        name: {
          $iLike: `%${query}%`,
        },
      };
    }

    return this.apollo
      .query<{
        events: {
          total: number;
          edges: { cursor: string; node: Event }[];
        };
      }>({
        query: getEventsQuery,
        variables: {
          type,
          order,
          first,
          after,
          where,
        },
      })
      .pipe(
        map((x) => {
          if (x.data.events) {
            x.data.events.edges = x.data.events.edges.map((x) => {
              x.node = new Event(x.node);
              return x;
            });
          }

          return x.data;
        })
      );
  }

  getImported(order: string, first: number, after: string) {
    return this.apollo
      .query<{
        imported: {
          total: number;
          edges: { cursor: string; node: Imported }[];
        };
      }>({
        query: importedQuery,
        variables: {
          order,
          first,
          after,
        },
      })
      .pipe(
        map((x) => {
          if (x.data.imported) {
            x.data.imported.edges = x.data.imported.edges.map((x) => {
              x.node = new Imported(x.node);
              return x;
            });
          }
          return x.data;
        })
      );
  }

  startImport(imported: Imported) {
    return this.httpClient.put(
      `${environment.api}/${environment.apiVersion}/import/start/${imported.id}/${imported.event.id}`,
      null
    );
  }

  findEvent(name: string, uniCode: string) {
    return this.apollo
      .query<{
        events: {
          total: number;
          edges: { cursor: string; node: Event }[];
        };
      }>({
        query: getEventsQuery,
        variables: {
          where: {
            $or: [
              {
                name: name,
              },
              {
                uniCode: uniCode ?? '',
              },
            ],
          },
        },
      })
      .pipe(
        map((x) => {
          if (x.data.events) {
            x.data.events.edges = x.data.events.edges.map((e) => {
              e.node = new Event(e.node);
              return e;
            });
            return x.data.events.edges.map((x) => x.node);
          } else {
            return null;
          }
        })
      );
  }

  addEvent(event: Event) {
    return this.apollo
      .mutate<{ addEvent: Event }>({
        mutation: addEventMutation,
        variables: {
          event,
        },
      })
      .pipe(map((x) => new Event(x.data.addEvent)));
  }

  upload(files: FileList) {
    this.importStatus$.next({
      completed: false,
      finished: 0,
      total: files.length,
    });
    const fileArray = [];
    const requests = [];

    // copy to usable array
    for (let i = 0; i < files.length; i++) {
      fileArray.push(files[i]);
    }

    // process chunked
    while (fileArray.length > 0) {
      var chunk = fileArray.splice(0, 5);
      console.log(chunk);

      let formData = new FormData();
      chunk.forEach((file) => {
        formData.append('upload', file);
      });

      let params = new HttpParams();

      const options = {
        params: params,
        reportProgress: true,
      };

      const req = new HttpRequest(
        'POST',
        `${environment.api}/${environment.apiVersion}/import/file`,
        formData,
        options
      );

      requests.push(
        this.httpClient.request(req).pipe(
          share(),
          tap((r) => {
            console.log(this.importStatus$.value, r);
            const finished = this.importStatus$.value.finished + 1;
            this.importStatus$.next({
              total: this.importStatus$.value.total,
              finished: finished,
              completed: finished > this.importStatus$.value.total,
            });
          })
        )
      );
    }

    return concat(...requests).pipe(toArray());
  }

  deleteImportedEvent(event: { id: number }) {
    return this.apollo.mutate({
      mutation: deleteEventMutation,
      variables: {
        event,
      },
    });
  }
}
