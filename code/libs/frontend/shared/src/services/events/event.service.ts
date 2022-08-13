import { Apollo } from 'apollo-angular';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BehaviorSubject, concat } from 'rxjs';
import { map, share, tap, toArray } from 'rxjs/operators';
import * as getCompetitionEventQuery from '../../graphql/events/queries/GetCompetition.graphql';
import * as getTournamentEventQuery from '../../graphql/events/queries/GetTournament.graphql';

import * as getCompetitionEventsQuery from '../../graphql/events/queries/GetCompetitions.graphql';
import * as getTournamentEventsQuery from '../../graphql/events/queries/GetTournaments.graphql';

import * as importedQuery from '../../graphql/importedEvents/queries/GetImported.graphql';

import * as addEventMutation from '../../graphql/events/mutations/addEvent.graphql';
import * as deleteEventMutation from '../../graphql/importedEvents/mutations/DeleteImportedEvent.graphql';

import * as updateCompetitionEvent from '../../graphql/events/mutations/UpdateCompetitionEvent.graphql';
import {
  Club,
  EventCompetition,
  EventType,
  Imported,
  EventTournament,
  Event,
} from '../../models';
import { ConfigService } from '@badman/frontend/config';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  public importStatus$ = new BehaviorSubject<{
    completed: boolean;
    finished: number;
    total: number;
  }>({ completed: true, finished: 0, total: 0 });

  constructor(
    private apollo: Apollo,
    private httpClient: HttpClient,
    private configService: ConfigService
  ) {}

  getEvents(args?: {
    type?: EventType;
    first?: number;
    after?: string;
    includeSubEvents?: boolean;
    includeComments?: boolean;
    clubId?: string;
    where?: { [key: string]: unknown };
  }) {
    args = {
      includeSubEvents: false,
      includeComments: false,
      ...args,
    };

    return this.apollo
      .query<{
        competitionEvents?: {
          total: number;
          edges: { cursor: string; node: EventCompetition }[];
        };
        tournamentEvents?: {
          total: number;
          edges: { cursor: string; node: EventTournament }[];
        };
      }>({
        query:
          args.type == EventType.TOURNAMENT
            ? getTournamentEventsQuery
            : getCompetitionEventsQuery,
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
          if (x.data.competitionEvents) {
            return {
              total: x.data.competitionEvents.total,
              events: x.data.competitionEvents.edges?.map((e) => {
                return {
                  cursor: e.cursor,
                  node: new EventCompetition(e.node),
                };
              }),
            };
          }
          if (x.data.tournamentEvents) {
            return {
              total: x.data.tournamentEvents.total,
              events: x.data.tournamentEvents.edges?.map((e) => {
                return {
                  cursor: e.cursor,
                  node: new EventTournament(e.node),
                };
              }),
            };
          }

          return;
        })
      );
  }

  getCompetitionEvent(
    id: string,
    args?: { clubId: string; includeComments: boolean }
  ) {
    return this.apollo
      .query<{
        competitionEvent: EventCompetition;
      }>({
        query: getCompetitionEventQuery,
        variables: {
          id,
          includeComments:
            (args?.includeComments ?? false) && args?.clubId != null,
          clubId: args?.clubId,
        },
      })
      .pipe(map((x) => new EventCompetition(x.data.competitionEvent)));
  }

  getTournamentEvent(id: string) {
    return this.apollo
      .query<{
        tournamentEvent: EventTournament;
      }>({
        query: getTournamentEventQuery,
        variables: {
          id,
        },
      })
      .pipe(map((x) => new EventTournament(x.data.tournamentEvent)));
  }

  updateCompetitionEvent(event: Partial<EventCompetition>) {
    return this.apollo
      .mutate<{
        updateEventCompetition: EventCompetition;
      }>({
        mutation: updateCompetitionEvent,
        variables: {
          event,
        },
      })
      .pipe(
        map((x) => {
          if (!x.data?.updateEventCompetition) {
            return;
          }

          return new EventCompetition(x.data.updateEventCompetition);
        })
      );
  }

  getImported(order: string, first: number, after?: string) {
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
      `${this.configService.apiBaseUrl}/import/start/${imported.id}/${imported.event?.id}`,
      null
    );
  }

  findEvent(name: string, uniCode: string, type: EventType) {
    return this.apollo
      .query<{
        competitionEvents?: {
          total: number;
          edges?: { cursor: string; node: Event }[];
        };
        tournamentEvents?: {
          total: number;
          edges?: { cursor: string; node: Event }[];
        };
      }>({
        query:
          type == EventType.TOURNAMENT
            ? getTournamentEventsQuery
            : getCompetitionEventsQuery,
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
          const events: (EventCompetition | EventTournament)[] = [];
          if (x.data.competitionEvents) {
            events.push(
              ...(x.data.competitionEvents.edges?.map(
                (e) => new EventCompetition(e.node)
              ) ?? [])
            );
          }

          if (x.data.tournamentEvents) {
            events.push(
              ...(x.data.tournamentEvents.edges?.map(
                (e) => new EventTournament(e.node)
              ) ?? [])
            );
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
      .pipe(
        map((x) => {
          if (!x.data?.addEvent) {
            return;
          }
          return new Event(x.data.addEvent);
        })
      );
  }

  upload(files: FileList) {
    this.importStatus$.next({
      completed: false,
      finished: 0,
      total: files.length,
    });
    const fileArray: File[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requests: any[] = [];

    // copy to usable array
    for (let i = 0; i < files.length; i++) {
      fileArray.push(files[i]);
    }

    // process chunked
    while (fileArray.length > 0) {
      const chunk = fileArray.splice(0, 5);

      const formData = new FormData();
      chunk.forEach((file: File) => {
        formData.append('upload', file);
      });

      const params = new HttpParams();

      const options = {
        params: params,
        reportProgress: true,
      };

      const req = new HttpRequest(
        'POST',
        `${this.configService.apiBaseUrl}/import/file`,
        formData,
        options
      );

      requests.push(
        this.httpClient.request(req).pipe(
          share(),
          tap(() => {
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
      `${this.configService.apiBaseUrl}/enrollment/finish/${club.id}/${year}`,
      null
    );
  }
}
