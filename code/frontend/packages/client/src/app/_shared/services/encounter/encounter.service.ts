import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { CompetitionEncounter } from 'app/_shared';
import { EncounterChange } from 'app/_shared/models';
import { map, tap } from 'rxjs/operators';
import * as encounterQuery from '../../graphql/encounters/queries/GetEncounterQuery.graphql';
import * as requestsQuery from '../../graphql/encounters/queries/GetRequests.graphql';

@Injectable({
  providedIn: 'root',
})
export class EncounterService {
  constructor(private apollo: Apollo) {}

  getEncounters(teamId: string) {
    return this.apollo
      .query<{
        encounterCompetitions: {
          total: number;
          edges: { cursor: string; node: CompetitionEncounter }[];
        };
      }>({
        query: encounterQuery,
        variables: {
          id: teamId,
          where: {
            date: { $between: ['2021-08-01', '2022-07-01'] },
          },
        },
      })
      .pipe(
        map((x) => {
          if (x.data.encounterCompetitions) {
            x.data.encounterCompetitions.edges = x.data.encounterCompetitions.edges.map((x) => {
              x.node = new CompetitionEncounter(x.node);
              return x;
            });
          }
          return x.data;
        })
      );
  }

  getRequests(encounterId: string) {
    return this.apollo
      .query<{
        encounterChange: EncounterChange;
      }>({
        query: requestsQuery,
        variables: {
          id: encounterId,
        },
      })
      .pipe(map((x) => new EncounterChange(x.data?.encounterChange)));
  }
}
