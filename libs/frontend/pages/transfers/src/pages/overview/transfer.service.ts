import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ClubMembership } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { Socket } from 'ngx-socket-io';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Observable, Subject, merge } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface TransferState {
  transfers: ClubMembership[];
  error: string | null;
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
    error: null,
    loaded: false,
  };

  // selectors

  // sources
  private error$ = new Subject<string | null>();

  sources$ = merge(
    this._loadTransfersAndLoans().pipe(
      map((transfers) => ({
        transfers,
        loaded: true,
      })),
    ),
    this.error$.pipe(map((error) => ({ error }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      updateMembership: (_state, action$: Observable<Partial<ClubMembership>>) =>
        action$.pipe(
          switchMap((event) => this._updateTransferOrLoan(event)),
          // load the default system
          switchMap(() =>
            this._loadTransfersAndLoans().pipe(map((transfers) => ({ transfers, loading: false }))),
          ),
        ),
      deleteMembership: (_state, action$: Observable<Partial<ClubMembership>>) =>
        action$.pipe(
          switchMap((event) => this._deleteTransferOrLoan(event)),
          // load the default system
          switchMap(() =>
            this._loadTransfersAndLoans().pipe(map((transfers) => ({ transfers, loading: false }))),
          ),
        ),
      reload: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() =>
            this._loadTransfersAndLoans().pipe(map((transfers) => ({ transfers, loading: false }))),
          ),
        ),
    },
  });

  private _loadTransfersAndLoans() {
    return this.apollo
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
                      start
                      end
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
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map(
          (result) =>
            result.data.clubPlayerMemberships.rows?.map((r) => new ClubMembership(r)) ?? [],
        ),
      );
  }

  private _updateTransferOrLoan(event: Partial<ClubMembership>) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateClubPlayerMembership($data: ClubPlayerMembershipUpdateInput!) {
            updateClubPlayerMembership(data: $data)
          }
        `,
        variables: {
          data: event,
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
      );
  }

  private _deleteTransferOrLoan(event: Partial<ClubMembership>) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation RemovePlayerFromClub($removePlayerFromClubId: ID!) {
            removePlayerFromClub(id: $removePlayerFromClubId)
          }
        `,
        variables: {
          removePlayerFromClubId: event.id,
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load games`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }
}
