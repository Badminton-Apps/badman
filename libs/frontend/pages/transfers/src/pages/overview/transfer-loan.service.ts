import { HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { ClubMembership } from "@badman/frontend-models";
import { endOfSeason, getSeason, startOfSeason } from "@badman/utils";
import { Apollo, gql } from "apollo-angular";
import { Socket } from "ngx-socket-io";
import { signalSlice } from "ngxtension/signal-slice";
import { EMPTY, Observable, Subject, merge } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";

export interface TransferLoanState {
  transferAndLoans: ClubMembership[];
  filtered: ClubMembership[];
  error: string | null;
  loaded: boolean;
  season: number;
  confirmed: boolean | null;
}

@Injectable({
  providedIn: "root",
})
export class TransferLoanService {
  socket = inject(Socket);
  apollo = inject(Apollo);

  initialState: TransferLoanState = {
    transferAndLoans: [],
    filtered: [],
    error: null,
    loaded: false,
    season: getSeason(),
    confirmed: false,
  };

  // selectors

  // sources
  private error$ = new Subject<string | null>();

  sources$ = merge(
    this._loadTransfersAndLoans(this.initialState.season, this.initialState.confirmed).pipe(
      map((transferAndLoans) => ({
        transferAndLoans,
        filtered: transferAndLoans,
        loaded: true,
      }))
    ),
    this.error$.pipe(map((error) => ({ error })))
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
            this._loadTransfersAndLoans(_state().season, _state().confirmed).pipe(
              map((transferAndLoans) => ({
                transferAndLoans,
                filtered: transferAndLoans,
                loading: false,
              }))
            )
          )
        ),
      deleteMembership: (_state, action$: Observable<Partial<ClubMembership>>) =>
        action$.pipe(
          switchMap((event) => this._deleteTransferOrLoan(event)),
          // load the default system
          switchMap(() =>
            this._loadTransfersAndLoans(_state().season, _state().confirmed).pipe(
              map((transferAndLoans) => ({
                transferAndLoans,
                filtered: transferAndLoans,
                loading: false,
              }))
            )
          )
        ),
      reload: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() =>
            this._loadTransfersAndLoans(_state().season, _state().confirmed).pipe(
              map((transferAndLoans) => ({
                transferAndLoans,
                filtered: transferAndLoans,
                loading: false,
              }))
            )
          )
        ),

      setSeason: (_state, action$: Observable<number>) =>
        action$.pipe(
          switchMap((season) =>
            this._loadTransfersAndLoans(season, _state().confirmed).pipe(
              map((transferAndLoans) => ({
                transferAndLoans,
                filtered: transferAndLoans,
                season,
                loading: false,
              }))
            )
          )
        ),
      setConfirmed: (_state, action$: Observable<boolean | null>) =>
        action$.pipe(
          switchMap((confirmed) =>
            this._loadTransfersAndLoans(_state().season, confirmed).pipe(
              map((transferAndLoans) => ({
                transferAndLoans,
                filtered: transferAndLoans,
                confirmed,
                loading: false,
              }))
            )
          )
        ),
      setFilter: (
        _state,
        action$: Observable<{
          search: string;
          newClubs: string[];
          currentClubs: string[];
        }>
      ) =>
        action$.pipe(
          map((filter) => {
            const { search, newClubs, currentClubs } = filter;

            let filtered = _state().transferAndLoans;

            if (search?.length > 0) {
              filtered = filtered.filter((t) => {
                return (
                  t.player?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
                  t.club?.name?.toLowerCase().includes(search.toLowerCase())
                );
              });
            }

            if (newClubs?.length > 0) {
              filtered = filtered.filter((t) => {
                return t.club?.id && newClubs.includes(t.club.id);
              });
            }

            if (currentClubs?.length > 0) {
              filtered = filtered.filter((t) => {
                return t.player?.clubs?.some((club) => currentClubs.includes(club.id));
              });
            }

            return {
              filtered,
            };
          })
        ),
    },
  });

  private _loadTransfersAndLoans(season: number, confirmed?: boolean | null) {
    console.log("Loading transfers and loans for season", season, "confirmed:", confirmed);

    return this.apollo
      .query<{
        clubPlayerMemberships: { rows: ClubMembership[] };
      }>({
        fetchPolicy: "network-only",
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
            confirmed: confirmed == null ? undefined : confirmed,
            start: {
              $gte: startOfSeason(season),
              $lte: endOfSeason(season),
            },
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
            result.data.clubPlayerMemberships.rows?.map((r) => new ClubMembership(r)) ?? []
        )
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
        })
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
        })
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
