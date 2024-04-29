import { Injectable, inject } from '@angular/core';
import { ClubMembership } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { Socket } from 'ngx-socket-io';
import { signalSlice } from 'ngxtension/signal-slice';
import { merge } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface TransferState {
  transfers: ClubMembership[];
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TransferService {
  socket = inject(Socket);
  apollo = inject(Apollo);

  initialState: TransferState = {
    transfers: [],
    loaded: false,
  };

  // sources
  private servicesLoaded$ = this.apollo
    .query<{
      clubPlayerMemberships: { rows: ClubMembership[] };
    }>({
      fetchPolicy: 'network-only',
      query: gql`
        query LoansAndTransfers($where: JSONObject) {
          clubPlayerMemberships(where: $where) {
            rows {
              id
              start
              end
              membershipType
              player {
                id
                fullName
                clubs {
                  id
                  name
                  clubMembership {
                    id
                    active
                  }
                }
              }
              club {
                id
                name
              }
            }
            count
          }
        }
      `,
      variables: {
        where: {
          confirmed: false,
        },
      },
    })
    .pipe(
      map(
        (result) => result.data.clubPlayerMemberships.rows?.map((r) => new ClubMembership(r)) ?? [],
      ),
      tap((transfers) => console.log(transfers)),
    );

  sources$ = merge(
    this.servicesLoaded$.pipe(
      map((transfers) => ({
        transfers,
        loaded: true,
      })),
    ),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {},
  });
}
