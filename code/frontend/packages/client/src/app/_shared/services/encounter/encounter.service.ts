import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Encounter } from 'app/_shared';
import { map } from 'rxjs/operators';
const teamQuery = require('graphql-tag/loader!../../graphql/teams/queries/GetTeamQuery.graphql');

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
      .pipe(map((x: any) => x.data?.encounters.map(s => new Encounter(s))));
  }
}
