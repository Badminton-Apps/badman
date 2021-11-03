import {Apollo} from 'apollo-angular';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Imported } from 'app/_shared';
import {
  Club,
  CompetitionEvent,
  CompetitionSubEvent,
  Event,
  EventType,
  SubEvent,
  TournamentEvent,
  TournamentSubEvent,
} from 'app/_shared/models';
import { environment } from 'environments/environment';
import { BehaviorSubject, concat, of } from 'rxjs';
import { map, share, tap, toArray } from 'rxjs/operators';
import * as getCompetitionEventQuery from '../../graphql/events/queries/GetCompetition.graphql';
import * as getTournamentEventQuery from '../../graphql/events/queries/GetTournament.graphql';

import * as getCompetitionEventsQuery from '../../graphql/events/queries/GetCompetitions.graphql';
import * as getSubEvents from '../../graphql/events/queries/GetSubEventsCompetition.graphql';
import * as getTournamentEventsQuery from '../../graphql/events/queries/GetTournaments.graphql';

import * as importedQuery from '../../graphql/importedEvents/queries/GetImported.graphql';

import * as addEventMutation from '../../graphql/events/mutations/addEvent.graphql';
import * as deleteEventMutation from '../../graphql/importedEvents/mutations/DeleteImportedEvent.graphql';

import * as updateCompetitionEvent from '../../graphql/events/mutations/UpdateCompetitionEvent.graphql';

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

  getEvents(args?: {
    type: EventType;
    first?: number;
    after?: string;
    includeSubEvents?: boolean;
    includeComments?: boolean;
    clubId?: string;
    where?: { [key: string]: any };
  }) {
    args = {
      includeSubEvents: false,
      includeComments: false,
      ...args,
    };

    return this.apollo
      .query<{
        eventCompetitions?: {
          total: number;
          edges: { cursor: string; node: CompetitionEvent }[];
        };
        eventTournaments?: {
          total: number;
          edges: { cursor: string; node: TournamentEvent }[];
        };
      }>({
        query: args.type == EventType.TOURNAMENT ? getTournamentEventsQuery : getCompetitionEventsQuery,
        variables: {
          first: args.first,
          after: args.after,
          where: args.where,
          clubId: args?.clubId,
          includeSubEvents: args.includeSubEvents,
          includeComments: args.includeComments,
        },
      })
      .pipe(
        map((x) => {
          if (x.data.eventCompetitions) {
            x.data.eventCompetitions.edges = x.data.eventCompetitions.edges.map((x) => {
              x.node = new CompetitionEvent(x.node);
              return x;
            });
          }
          if (x.data.eventTournaments) {
            x.data.eventTournaments.edges = x.data.eventTournaments.edges.map((x) => {
              x.node = new TournamentEvent(x.node);
              return x;
            });
          }

          return x.data;
        })
      );
  }

  getCompetitionEvent(id: string, args?: { clubId: string; includeComments: boolean }) {
    args = {
      includeComments: false,
      ...args,
    };
    return this.apollo
      .query<{
        eventCompetition: CompetitionEvent;
      }>({
        query: getCompetitionEventQuery,
        variables: {
          id,
          includeComments: args.includeComments && args?.clubId != null,
          clubId: args?.clubId,
        },
      })
      .pipe(map((x) => new CompetitionEvent(x.data.eventCompetition)));
  }

  getSubEventsCompetition(year: number) {
    return this.apollo
      .query<{
        eventCompetitions?: {
          total: number;
          edges: { cursor: string; node: CompetitionEvent }[];
        };
      }>({
        query: getSubEvents,
        variables: {
          year,
        },
      })
      .pipe(
        map((x) =>
          x?.data?.eventCompetitions?.edges.map((x) => new CompetitionEvent(x.node))
        )
      );
  }

  getTournamentEvent(id: string, args?: {}) {
    return this.apollo
      .query<{
        eventTournament: TournamentEvent;
      }>({
        query: getTournamentEventQuery,
        variables: {
          id,
        },
      })
      .pipe(map((x) => new TournamentEvent(x.data.eventTournament)));
  }

  updateCompetitionEvent(event: Partial<CompetitionEvent>) {
    return this.apollo
      .mutate<{
        updateEventCompetition: CompetitionEvent;
      }>({
        mutation: updateCompetitionEvent,
        variables: {
          event,
        },
      })
      .pipe(map((x) => new CompetitionEvent(x.data.updateEventCompetition)));
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
      `${environment.api}/${environment.apiVersion}/import/start/${imported.id}/${imported.event?.id}`,
      null
    );
  }

  findEvent(name: string, uniCode: string, type: EventType) {
    return this.apollo
      .query<{
        eventCompetitions?: {
          total: number;
          edges?: { cursor: string; node: Event }[];
        };
        eventTournaments?: {
          total: number;
          edges?: { cursor: string; node: Event }[];
        };
      }>({
        query: type == EventType.TOURNAMENT ? getTournamentEventsQuery : getCompetitionEventsQuery,
        variables: {
          includeSubEvents: true,
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
          const events = [];
          if (x.data.eventCompetitions) {
            events.push(...x.data.eventCompetitions?.edges?.map((e) => new CompetitionEvent(e.node)));
          }

          if (x.data.eventTournaments) {
            events.push(...x.data.eventTournaments?.edges?.map((e) => new TournamentEvent(e.node)));
          }

          return events;
        })
      );
  }

  addEvent(event: Event) {
    return this.apollo
      .mutate<{ addEvent: Event }>({
        mutation: addEventMutation,
        variables: {
          event: {
            ...event,
            id: -1,
          },
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
      let chunk = fileArray.splice(0, 5);

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

  deleteImportedEvent(event: { id: string }) {
    return this.apollo.mutate({
      mutation: deleteEventMutation,
      variables: {
        event,
      },
    });
  }

  finishEnrollment(club: Club, year: number) {
    return this.httpClient.post(
      `${environment.api}/${environment.apiVersion}/enrollment/finish/${club.id}/${year}`,
      null
    );
  }
}
