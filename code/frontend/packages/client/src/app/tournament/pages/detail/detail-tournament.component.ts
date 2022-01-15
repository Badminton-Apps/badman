import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { EventService, GameType, TournamentEvent, TournamentSubEvent } from 'app/_shared';
import { AssignRankingGroupsComponent } from 'app/_shared/dialogs';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-tournament.component.html',
  styleUrls: ['./detail-tournament.component.scss'],
})
export class DetailTournamentComponent implements OnInit {
  event$!: Observable<TournamentEvent>;

  subEventsM_S$!: Observable<TournamentSubEvent[]>;
  subEventsF_S$!: Observable<TournamentSubEvent[]>;
  subEventsMX_S$!: Observable<TournamentSubEvent[]>;
  subEventsM_D$!: Observable<TournamentSubEvent[]>;
  subEventsF_D$!: Observable<TournamentSubEvent[]>;
  subEventsMX_D$!: Observable<TournamentSubEvent[]>;
  subEventsM_MX$!: Observable<TournamentSubEvent[]>;
  subEventsF_MX$!: Observable<TournamentSubEvent[]>;
  subEventsMX_MX$!: Observable<TournamentSubEvent[]>;

  update$ = new BehaviorSubject(0);

  constructor(private apollo: Apollo, private route: ActivatedRoute, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.event$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      switchMap(([params]) =>
        this.apollo.query<{ tournamentEvent: TournamentEvent }>({
          query: gql`
            query GetTournamentDetails($id: ID!) {
              tournamentEvent(id: $id) {
                id
                slug
                name
                dates
                firstDay
                updatedAt
                subEvents(order: "eventType") {
                  id
                  name
                  eventType
                  level
                  eventType
                  gameType
                  groups {
                    id
                    name
                  }
                  draws(order: "name") {
                    id
                    name
                  }
                }
              }
            }
          `,
          variables: {
            id: params.get('id')!,
          },
        })
      ),
      map(({ data }) => new TournamentEvent(data.tournamentEvent))
    );

    this.subEventsM_S$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'M' && se.gameType === GameType.S)));
    this.subEventsF_S$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'F' && se.gameType === GameType.S)));
    this.subEventsMX_S$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'MX' && se.gameType === GameType.S)));
    
    this.subEventsM_D$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'M'&& se.gameType === GameType.D)));
    this.subEventsF_D$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'F'&& se.gameType === GameType.D)));
    this.subEventsMX_D$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'MX'&& se.gameType === GameType.D)));
    
    this.subEventsM_MX$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'M'&& se.gameType === GameType.MX)));
    this.subEventsF_MX$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'F'&& se.gameType === GameType.MX)));
    this.subEventsMX_MX$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'MX'&& se.gameType === GameType.MX)));
  }

  assignRankingGroups(event: Partial<TournamentEvent>) {
    this.dialog
      .open(AssignRankingGroupsComponent, {
        minWidth: '50vw',
        maxHeight: '80vh',
        data: {
          event,
        },
      })
      .afterClosed()
      .subscribe(() => {
        this.update$.next(0);
      });
  }
}
