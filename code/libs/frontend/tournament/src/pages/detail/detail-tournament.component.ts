import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AssignRankingGroupsComponent } from '@badman/frontend/shared';
import {
  SubEventTournament,
  GameType,
  EventTournament,
} from '@badman/frontend/models';

@Component({
  templateUrl: './detail-tournament.component.html',
  styleUrls: ['./detail-tournament.component.scss'],
})
export class DetailTournamentComponent implements OnInit {
  event$!: Observable<EventTournament>;

  subEventsM_S$!: Observable<SubEventTournament[] | undefined>;
  subEventsF_S$!: Observable<SubEventTournament[] | undefined>;
  subEventsMX_S$!: Observable<SubEventTournament[] | undefined>;
  subEventsM_D$!: Observable<SubEventTournament[] | undefined>;
  subEventsF_D$!: Observable<SubEventTournament[] | undefined>;
  subEventsMX_D$!: Observable<SubEventTournament[] | undefined>;
  subEventsM_MX$!: Observable<SubEventTournament[] | undefined>;
  subEventsF_MX$!: Observable<SubEventTournament[] | undefined>;
  subEventsMX_MX$!: Observable<SubEventTournament[] | undefined>;

  update$ = new BehaviorSubject(0);

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.event$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      switchMap(([params]) => {
        const id = params.get('id');
        if (!id) {
          throw new Error('No id');
        }
        return this.apollo.query<{ eventTournament: EventTournament }>({
          query: gql`
            query GetTournamentDetails($id: ID!) {
              eventTournament(id: $id) {
                id
                slug
                name
                dates
                firstDay
                updatedAt
                subEventTournaments(
                  order: [{ field: "eventType", direction: "desc" }]
                ) {
                  id
                  name
                  eventType
                  level
                  eventType
                  gameType
                  rankingGroups {
                    id
                    name
                  }
                  drawTournaments(
                    order: [{ field: "name", direction: "desc" }]
                  ) {
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
      }),
      map(({ data }) => new EventTournament(data.eventTournament))
    );

    this.subEventsM_S$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
          (se) => se.eventType === 'M' && se.gameType === GameType.S
        )
      )
    );
    this.subEventsF_S$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
          (se) => se.eventType === 'F' && se.gameType === GameType.S
        )
      )
    );
    this.subEventsMX_S$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
          (se) => se.eventType === 'MX' && se.gameType === GameType.S
        )
      )
    );

    this.subEventsM_D$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
          (se) => se.eventType === 'M' && se.gameType === GameType.D
        )
      )
    );
    this.subEventsF_D$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
          (se) => se.eventType === 'F' && se.gameType === GameType.D
        )
      )
    );
    this.subEventsMX_D$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
          (se) => se.eventType === 'MX' && se.gameType === GameType.D
        )
      )
    );

    this.subEventsM_MX$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
          (se) => se.eventType === 'M' && se.gameType === GameType.MX
        )
      )
    );
    this.subEventsF_MX$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
          (se) => se.eventType === 'F' && se.gameType === GameType.MX
        )
      )
    );
    this.subEventsMX_MX$ = this.event$.pipe(
      map((event) =>
        event.subEventTournaments?.filter(
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
