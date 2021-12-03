import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo, gql } from 'apollo-angular';
import { Club, Player } from 'app/_shared';
import { BehaviorSubject,  map, Observable, switchMap } from 'rxjs';
import { EditClubHistoryDialogComponent } from '../../dialogs';

@Component({
  selector: 'app-edit-club-history',
  templateUrl: './edit-club-history.component.html',
  styleUrls: ['./edit-club-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditClubHistoryComponent implements OnInit {
  update$ = new BehaviorSubject(null);

  @Input()
  player!: Player;

  clubs$!: Observable<Club[]>;

  fetchPlayer = gql`
    query ClubHistory($playerId: ID!) {
      player(id: $playerId) {
        id
        clubs {
          id
          fullName
          clubMembership {
            id
            start
            end
            active
          }
        }
      }
    }
  `;

  constructor(private appollo: Apollo, private dialog: MatDialog, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.clubs$ = this.update$.pipe(
      switchMap(() =>
        this.appollo.query<{ player: { clubs: Partial<Club>[] } }>({
          fetchPolicy: 'no-cache',
          query: this.fetchPlayer,
          variables: {
            playerId: this.player.id,
          },
        })
      ),
      map((r) => r?.data?.player?.clubs.map((c) => new Club(c))),
      map((r) =>
        r.sort((a, b) => (b?.clubMembership?.start?.getTime() ?? 0) - (a?.clubMembership?.start?.getTime() ?? 0))
      )
    );
  }

  editClubMembership(club?: Club) {
    this.dialog
      .open(EditClubHistoryDialogComponent, { data: { club } })
      .afterClosed()
      .subscribe((r) => {
        if (r?.action == 'update') {
          this.appollo
            .mutate<any>({
              mutation: gql`
                mutation UpdateClubMembership($clubMembership: ClubMembershipInput) {
                  updateClubMembership(clubMembership: $clubMembership) {
                    id
                  }
                }
              `,
              variables: {
                clubMembership: r.data,
              },
            })
            .subscribe((r) => {
              this.update$.next(null);
              this._snackBar.open('Saved', undefined, {
                duration: 1000,
                panelClass: 'success',
              });
            });
        } else if (r?.action == 'delete') {
          this.appollo
            .mutate<any>({
              mutation: gql`
                mutation DeleteClubMembership($clubMembershipId: ID!) {
                  deleteClubMembership(clubMembershipId: $clubMembershipId) {
                    id
                  }
                }
              `,
              variables: {
                clubMembershipId: r.data.id,
              },
            })
            .subscribe((r) => {
              this.update$.next(null);
              this._snackBar.open('removed', undefined, {
                duration: 1000,
                panelClass: 'success',
              });
            });
        } else if (r?.action == 'create') {
          this.appollo
            .mutate<any>({
              mutation: gql`
                mutation AddClubMembership($clubMembership: ClubMembershipInput!) {
                  addClubMembership(clubMembership: $clubMembership) {
                    id
                  }
                }
              `,
              variables: {
                clubMembership: { ...r.data, playerId: this.player.id },
              },
            })
            .subscribe((r) => {
              this.update$.next(null);
              this._snackBar.open('Created', undefined, {
                duration: 1000,
                panelClass: 'success',
              });
            });
        }
      });
  }
}
