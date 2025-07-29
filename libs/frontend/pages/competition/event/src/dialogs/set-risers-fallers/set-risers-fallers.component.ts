
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { InMemoryCache } from '@apollo/client/cache';
import { APOLLO_CACHE } from '@badman/frontend-graphql';
import { DrawCompetition, EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { BehaviorSubject, takeUntil, zip } from 'rxjs';

@Component({
  imports: [
    TranslatePipe,
    ReactiveFormsModule,
    FormsModule,
    TranslatePipe,
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
})
export class RisersFallersDialogComponent implements OnInit {
  private cache = inject<InMemoryCache>(APOLLO_CACHE);
  public dialogRef = inject<MatDialogRef<RisersFallersDialogComponent>>(
    MatDialogRef<RisersFallersDialogComponent>,
  );
  public data = inject<{ event: EventCompetition }>(MAT_DIALOG_DATA);
  private apollo = inject(Apollo);
  private destroy$ = injectDestroy();
  dataSource!: MatTableDataSource<DrawCompetition>;
  originalData!: DrawCompetition[];

  useSame = true;
  staticColumns = ['name', 'risers', 'fallers'];
  displayedColumns = this.staticColumns;

  viewLoaded$ = new BehaviorSubject(0);
  loading = false;

  ngOnInit(): void {
    this.apollo
      .query<{
        subEventCompetitions: SubEventCompetition[];
      }>({
        query: gql`
          query GetSubEventsWithRisersAndFallers($where: JSONObject!, $order: [SortOrderType!]) {
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
    const changedDrawCompetitions = this.dataSource.data.filter((drawCompetition) => {
      const originalDrawCompetition = this.originalData.find(
        (originalDrawCompetition) => originalDrawCompetition.id === drawCompetition.id,
      );

      return (
        originalDrawCompetition?.risers !== drawCompetition.risers ||
        originalDrawCompetition?.fallers !== drawCompetition.fallers
      );
    });

    if (changedDrawCompetitions.length === 0) {
      this.loading = false;
      this.dialogRef.close();
      return;
    }

    this.apollo
      .mutate<{
        updateDrawCompetitions: Partial<DrawCompetition>[];
      }>({
        mutation: gql`
          mutation UpdateDrawCompetitions($data: [DrawCompetitionUpdateInput!]!) {
            updateDrawCompetitions(data: $data) {
              id
              risers
              fallers
            }
          }
        `,
        variables: {
          data: changedDrawCompetitions.map((drawCompetition) => ({
            id: drawCompetition.id,
            risers: drawCompetition.risers,
            fallers: drawCompetition.fallers,
          })),
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        // update cache
        result.data?.updateDrawCompetitions.forEach((updatedDrawCompetition) => {
          this.cache.modify({
            id: `DrawCompetition:${updatedDrawCompetition.id}`,
            fields: {
              risers: () => updatedDrawCompetition.risers ?? 0,
              fallers: () => updatedDrawCompetition.fallers ?? 0,
            },
          });
        });

        this.loading = false;
        // close dialog
        this.dialogRef.close();
      });
  }
}
