import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  GameType,
  EventTournament,
  TournamentSubEvent,
} from '../../../_shared';
import { AssignRankingGroupsComponent } from '../../../_shared/dialogs';

@Component({
  templateUrl: './detail-tournament.component.html',
  styleUrls: ['./detail-tournament.component.scss'],
})
export class DetailTournamentComponent implements OnInit {
  event$!: Observable<EventTournament>;

  subEventsM_S$!: Observable<TournamentSubEvent[] | undefined>;
  subEventsF_S$!: Observable<TournamentSubEvent[] | undefined>;
  subEventsMX_S$!: Observable<TournamentSubEvent[] | undefined>;
  subEventsM_D$!: Observable<TournamentSubEvent[] | undefined>;
  subEventsF_D$!: Observable<TournamentSubEvent[] | undefined>;
  subEventsMX_D$!: Observable<TournamentSubEvent[] | undefined>;
  subEventsM_MX$!: Observable<TournamentSubEvent[] | undefined>;
  subEventsF_MX$!: Observable<TournamentSubEvent[] | undefined>;
  subEventsMX_MX$!: Observable<TournamentSubEvent[] | undefined>;

  update$ = new BehaviorSubject(0);

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.event$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      switchMap(([params]) =>
        {
          const id = params.get('id');
          if (!id) {
            throw new Error('No id');	
          }
          return this.apollo.query<{ tournamentEvent: EventTournament; }>({
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
              id,
            },
          });
        }
      ),
      map(({ data }) => new EventTournament(data.tournamentEvent))
    );

    this.subEventsM_S$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'M' && se.gameType === GameType.S
        )
      )
    );
    this.subEventsF_S$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'F' && se.gameType === GameType.S
        )
      )
    );
    this.subEventsMX_S$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'MX' && se.gameType === GameType.S
        )
      )
    );

    this.subEventsM_D$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'M' && se.gameType === GameType.D
        )
      )
    );
    this.subEventsF_D$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'F' && se.gameType === GameType.D
        )
      )
    );
    this.subEventsMX_D$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'MX' && se.gameType === GameType.D
        )
      )
    );

    this.subEventsM_MX$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'M' && se.gameType === GameType.MX
        )
      )
    );
    this.subEventsF_MX$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'F' && se.gameType === GameType.MX
        )
      )
    );
    this.subEventsMX_MX$ = this.event$.pipe(
      map((event) =>
        event.subEvents?.filter(
          (se) => se.eventType === 'MX' && se.gameType === GameType.MX
        )
      )
    );
  }

  assignRankingGroups(event: Partial<EventTournament>) {
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
