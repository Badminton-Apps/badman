import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { InMemoryCache } from '@apollo/client/cache';
import { APOLLO_CACHE } from '@badman/frontend-graphql';
import {
  DrawCompetition,
  EventCompetition,
  SubEventCompetition,
} from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { BehaviorSubject, takeUntil, zip } from 'rxjs';

@Component({
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTableModule,
    MatInputModule,
    MatProgressSpinnerModule
],
  templateUrl: './set-risers-fallers.component.html',
  styleUrls: ['./set-risers-fallers.component.scss'],
  standalone: true,
})
export class RisersFallersDialogComponent implements OnInit {
  private destroy$ = injectDestroy();
  dataSource!: MatTableDataSource<DrawCompetition>;
  originalData!: DrawCompetition[];

  useSame = true;
  staticColumns = ['name', 'risers', 'fallers'];
  displayedColumns = this.staticColumns;

  viewLoaded$ = new BehaviorSubject(0);
  loading = false;

  constructor(
    @Inject(APOLLO_CACHE) private cache: InMemoryCache,
    public dialogRef: MatDialogRef<RisersFallersDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { event: EventCompetition },
    private apollo: Apollo,
  ) {}

  ngOnInit(): void {
    this.apollo
      .query<{
        subEventCompetitions: SubEventCompetition[];
      }>({
        query: gql`
          query GetSubEventsWithRisersAndFallers(
            $where: JSONObject!
            $order: [SortOrderType!]
          ) {
            subEventCompetitions(where: $where, order: $order) {
              id
              name
              eventType
              level
              drawCompetitions {
                id
                name
                risers
                fallers
              }
            }
          }
        `,
        variables: {
          where: {
            eventId: this.data.event.id,
          },
          order: [
            {
              direction: 'asc',
              field: 'eventType',
            },
            {
              direction: 'asc',
              field: 'level',
            },
          ],
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        const subEvents = result.data.subEventCompetitions?.map(
          (subEvent) => new SubEventCompetition(subEvent),
        );

        const drawCompetitions = subEvents
          .map((subEvent) => subEvent.drawCompetitions)
          .flat() as DrawCompetition[];

        this.dataSource = new MatTableDataSource(drawCompetitions);
        this.originalData = drawCompetitions.map(
          (drawCompetition) => ({ ...drawCompetition }) as DrawCompetition,
        );
      });
  }

  save() {
    this.loading = true;
    // find all draw competitions with changed risers/fallers
    const changedDrawCompetitions = this.dataSource.data.filter(
      (drawCompetition) => {
        const originalDrawCompetition = this.originalData.find(
          (originalDrawCompetition) =>
            originalDrawCompetition.id === drawCompetition.id,
        );

        return (
          originalDrawCompetition?.risers !== drawCompetition.risers ||
          originalDrawCompetition?.fallers !== drawCompetition.fallers
        );
      },
    );

    const obs = changedDrawCompetitions.map((drawCompetition) => {
      return this.apollo.mutate<{
        updateDrawCompetition: Partial<DrawCompetition>;
      }>({
        mutation: gql`
          mutation UpdateDrawCompetition($data: DrawCompetitionUpdateInput!) {
            updateDrawCompetition(data: $data) {
              id
              risers
              fallers
            }
          }
        `,
        variables: {
          data: {
            id: drawCompetition.id,
            risers: drawCompetition.risers,
            fallers: drawCompetition.fallers,
          },
        },
      });
    });

    if (obs.length === 0) {
      this.loading = false;
      this.dialogRef.close();
      return;
    }

    // wait for all observables to complete

    zip(...obs)
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        // update cache
        results.forEach((result) => {
          if (!result.data?.updateDrawCompetition) {
            return;
          }

          this.cache.modify({
            id: `DrawCompetition:${result.data.updateDrawCompetition.id}`,
            fields: {
              risers: () => result.data?.updateDrawCompetition.risers ?? 0,
              fallers: () => result.data?.updateDrawCompetition.fallers ?? 0,
            },
          });
        });

        this.loading = false;
        // close dialog
        this.dialogRef.close();
      });
  }
}
