import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { CompetitionEncounter } from 'app/_shared';
import { map } from 'rxjs/operators';
import * as teamQuery from '../../graphql/teams/queries/GetTeamQuery.graphql';

@Injectable({
  providedIn: 'root',
})
export class EncounterService {
  constructor(private apollo: Apollo) {}

  getEncounters(teamId: string) {
    return this.apollo
      .query({
        query: teamQuery,
        variables: {
          id: teamId,
        },
      })
      .pipe(map((x: any) => x.data?.encounters.map(s => new CompetitionEncounter(s))));
  }
}
