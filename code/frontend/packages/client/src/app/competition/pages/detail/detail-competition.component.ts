import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { CompetitionDraw, CompetitionEvent, CompetitionSubEvent, EventService } from 'app/_shared';
import { AssignRankingGroupsComponent } from 'app/_shared/dialogs';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-competition.component.html',
  styleUrls: ['./detail-competition.component.scss'],
})
export class DetailCompetitionComponent implements OnInit {
  event$!: Observable<CompetitionEvent>;

  subEventsM$!: Observable<CompetitionSubEvent[]>;
  subEventsF$!: Observable<CompetitionSubEvent[]>;
  subEventsMX$!: Observable<CompetitionSubEvent[]>;

  update$ = new BehaviorSubject(0);

  constructor(private apollo: Apollo, private route: ActivatedRoute, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.event$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      switchMap(([params]) =>
        this.apollo.query<{ competitionEvent: CompetitionEvent }>({
          query: gql`
            query GetCompetitionDetails($id: ID!) {
              competitionEvent(id: $id) {
                id
                slug
                name
                startYear
                allowEnlisting
                started
                type
                updatedAt
                subEvents(order: "eventType") {
                  id
                  name
                  eventType
                  level
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
      map(({ data }) => new CompetitionEvent(data.competitionEvent))
    );

    this.subEventsM$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'M')));
    this.subEventsF$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'F')));
    this.subEventsMX$ = this.event$.pipe(map((event) => event.subEvents!.filter((se) => se.eventType === 'MX')));
  }

  assignRankingGroups(event: Partial<CompetitionEvent>) {
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
