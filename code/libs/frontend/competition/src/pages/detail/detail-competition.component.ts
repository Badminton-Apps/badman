import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { AssignRankingGroupsComponent } from '@badman/frontend-shared';
import { Title } from '@angular/platform-browser';

@Component({
  templateUrl: './detail-competition.component.html',
  styleUrls: ['./detail-competition.component.scss'],
})
export class DetailCompetitionComponent implements OnInit {
  event$!: Observable<EventCompetition>;

  subEventsM$!: Observable<SubEventCompetition[] | undefined>;
  subEventsF$!: Observable<SubEventCompetition[] | undefined>;
  subEventsMX$!: Observable<SubEventCompetition[] | undefined>;

  update$ = new BehaviorSubject(0);

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.event$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      switchMap(([params]) =>
        this.apollo.query<{ eventCompetition: EventCompetition }>({
          query: gql`
            query GetCompetitionDetails($id: ID!) {
              eventCompetition(id: $id) {
                id
                slug
                name
                startYear
                allowEnlisting
                started
                type
                updatedAt
                subEventCompetitions(
                  order: { field: "eventType", direction: "desc" }
                ) {
                  id
                  name
                  eventType
                  level
                  rankingGroups {
                    id
                    name
                  }
                  drawCompetitions(
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
            id: params.get('id'),
          },
        })
      ),
      map(({ data }) => new EventCompetition(data.eventCompetition)),
      tap((event) => {
        this.titleService.setTitle(event.name ?? 'Competition');
      })
    );

    this.subEventsM$ = this.event$.pipe(
      map((event) =>
        event.subEventCompetitions?.filter((se) => se.eventType === 'M')
      )
    );
    this.subEventsF$ = this.event$.pipe(
      map((event) =>
        event.subEventCompetitions?.filter((se) => se.eventType === 'F')
      )
    );
    this.subEventsMX$ = this.event$.pipe(
      map((event) =>
        event.subEventCompetitions?.filter((se) => se.eventType === 'MX')
      )
    );
  }

  assignRankingGroups(event: Partial<EventCompetition>) {
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
