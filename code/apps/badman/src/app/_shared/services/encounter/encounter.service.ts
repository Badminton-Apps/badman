import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { CompetitionEncounter } from 'app/_shared';
import { EncounterChange } from 'app/_shared/models';
import { map } from 'rxjs/operators';
import * as changeEncounterRequestMutation from '../../graphql/encounters/mutations/ChangeEncounterRequest.graphql';
import * as encounterQuery from '../../graphql/encounters/queries/GetEncounterQuery.graphql';
import * as encountersQuery from '../../graphql/encounters/queries/GetEncountersQuery.graphql';
import * as requestsQuery from '../../graphql/encounters/queries/GetRequests.graphql';


@Injectable({
  providedIn: 'root',
})
export class EncounterService {
  constructor(private apollo: Apollo) {}

  getEncounters(teamId: string, between: string []) {
    return this.apollo
      .query<{
        competitionEncounters: {
          total: number;
          edges: { cursor: string; node: CompetitionEncounter }[];
        };
      }>({
        query: encountersQuery,
        variables: {
          id: teamId,
          where: {
            date: { $between: between },
          },
        },
      })
      .pipe(
        map((x) => {
          return {
            total: x.data.competitionEncounters?.total,
            encounters: x.data.competitionEncounters?.edges?.map((e) => {
              return {
                cursor: e.cursor,
                node: new CompetitionEncounter(e.node),
              };
            }),
          };
        })
      );
  }

  getEncounter(encounterId: string) {
    return this.apollo
      .query<{
        competitionEncounter: CompetitionEncounter;
      }>({
        query: encounterQuery,
        variables: {
          id: encounterId,
        },
      })
      .pipe(
        map((x) => {
          return new CompetitionEncounter(x.data.competitionEncounter);
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

  addEncounterChange(encounterChange: EncounterChange, home: boolean) {
    return this.apollo
      .mutate<{
        addChangeEncounter: EncounterChange;
      }>({
        mutation: changeEncounterRequestMutation,
        variables: {
          change: {
            accepted: encounterChange.accepted,
            encounterId: encounterChange.encounter!.id,
            home,
            dates: encounterChange.dates,
            comment: {
              message: home ? encounterChange.homeComment!.message : encounterChange.awayComment!.message,
            },
          },
        },
      })
      .pipe(map((x) => new EncounterChange(x.data?.addChangeEncounter)));
  }
}
