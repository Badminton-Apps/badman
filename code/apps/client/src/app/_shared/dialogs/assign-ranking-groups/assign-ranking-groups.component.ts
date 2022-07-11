import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Apollo, gql, MutationResult } from 'apollo-angular';
import {
  BehaviorSubject,
  catchError,
  finalize,
  forkJoin,
  map,
  Observable,
  tap,
} from 'rxjs';
import { apolloCache } from '../../../graphql.module';
import {
  EventCompetition,
  RankingGroup,
  SubEvent,
  EventTournament,
  CompetitionSubEvent,
  TournamentSubEvent,
} from '../../models';

@Component({
  templateUrl: './assign-ranking-groups.component.html',
  styleUrls: ['./assign-ranking-groups.component.scss'],
})
export class AssignRankingGroupsComponent implements OnInit, AfterViewInit {
  dataSource!: MatTableDataSource<CompetitionSubEvent | TournamentSubEvent>;

  groups$!: Observable<RankingGroup[]>;
  useSame = true;
  selectedGroups: FormControl = new FormControl();
  selection = new Map<string, SelectionModel<SubEvent>>();
  staticColumns = ['name', 'eventType'];
  displayedColumns = this.staticColumns;

  viewLoaded$ = new BehaviorSubject(0);
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { event: EventCompetition | EventTournament },
    private dialogRef: MatDialogRef<AssignRankingGroupsComponent>,
    private snackbar: MatSnackBar,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    const subEvents =
      this.data.event instanceof EventCompetition
        ? this.data.event.subEventCompetitions
        : this.data.event.subEventTournaments;

    this.dataSource = new MatTableDataSource(subEvents);
    this.selectedGroups.valueChanges.subscribe((groups: RankingGroup[]) => {
      const groupNames = groups.map((g) => `group-${g.id}`);

      // Delete removed
      const removed = Object.keys(this.selection).filter((s) =>
        groupNames.includes(s)
      );
      removed.forEach((element) => this.selection.delete(element));

      // Initialize new
      groupNames.forEach((element) => {
        if (this.selection.has(element)) {
          this.selection.set(element, new SelectionModel<SubEvent>(true, []));
        }
      });

      this.displayedColumns = [...this.staticColumns, ...groupNames];
    });

    this.groups$ = this.apollo
      .query<{ rankingSystemGroup: RankingGroup[] }>({
        query: gql`
          query RankingSystemGroup {
            rankingSystemGroup {
              name
              id
            }
          }
        `,
      })
      .pipe(
        map((result) => result.data.rankingSystemGroup),
        tap((groups) => {
          const unique = [
            ...new Set(
              subEvents
                ?.map((s) => s.rankingGroups?.map((r: RankingGroup) => r.id))
                .flat()
            ),
          ];

          if (unique.length === 0) {
            // setting default to 'Adults'
            const adults = groups.find((r) => r.name == 'Adults');
            const key = `group-${adults?.id}`;
            this.selectedGroups.setValue([adults]);
            this.selection.set(key, new SelectionModel<SubEvent>(true, []));
            for (const subEvent of subEvents ?? []) {
              this.selection.get(key)?.select(subEvent);
            }
          } else {
            const initialGroups: RankingGroup[] = [];
            for (const subEvent of subEvents ?? []) {
              if (
                subEvent.rankingGroups &&
                (subEvent.rankingGroups ?? []).length > 0
              ) {
                for (const group of subEvent.rankingGroups) {
                  if (initialGroups.findIndex((g) => g.id == group.id) === -1) {
                    initialGroups.push(group);
                  }

                  const key = `group-${group.id}`;
                  if (this.selection.has(key)) {
                    this.selection.set(
                      key,
                      new SelectionModel<SubEvent>(true, [])
                    );
                  }
                  this.selection.get(key)?.select(subEvent);
                }
              } else {
                this.useSame = false;
              }
            }

            this.selectedGroups.setValue(initialGroups);
          }
        })
      );
  }

  ngAfterViewInit() {
    this.viewLoaded$.next(0);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(group: string) {
    const numSelected = this.selection.get(group)?.selected.length;
    const numRows = this.dataSource?.data.length ?? 0;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(group: string) {
    this.isAllSelected(group)
      ? this.selection.get(group)?.clear()
      : this.dataSource?.data.forEach((row) =>
          this.selection.get(group)?.select(row)
        );
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(groupId: string, row?: SubEvent): string {
    if (!row) {
      return `${this.isAllSelected(groupId) ? 'select' : 'deselect'} all`;
    }
    return `${
      this.selection.get(groupId)?.isSelected(row) ? 'deselect' : 'select'
    } row ${row.name}`;
  }

  async assignRankingGroups() {
    this.loading = true;
    const mutations: Observable<MutationResult>[] = [];

    for (const [groupKey, group] of this.selection) {
      const key = groupKey.replace('group-', '');
      const variables: { [key: string]: string[] | string } = {
        rankingSystemGroupId: key,
      };

      const removed: string[] = [];
      const added: string[] = [];

      for (const subEvent of this.dataSource.data ?? []) {
        const hasGroup =
          (subEvent.rankingGroups ?? []).find(
            (g: RankingGroup) => g.id == key
          ) == null;
        if (hasGroup) {
          if (group.selected?.map((r) => r.id).includes(subEvent.id)) {
            if (subEvent.id) {
              removed.push(subEvent.id);
            }
          }
        } else {
          if (group.selected?.map((r) => r.id).includes(subEvent.id)) {
            if (subEvent.id) {
              added.push(subEvent.id);
            }
          }
        }
      }

      if (removed.length > 0) {
        if (this.data.event instanceof EventTournament) {
          variables['tournaments'] = removed;
        }
        if (this.data.event instanceof EventCompetition) {
          variables['competitions'] = removed;
        }

        mutations.push(
          this.apollo.mutate({
            mutation: gql`
              mutation RemoveSubEventToRankingSystemGroup(
                $rankingSystemGroupId: ID
                $competitions: [ID]
                $tournaments: [ID]
              ) {
                removeSubEventToRankingSystemGroup(
                  rankingSystemGroupId: $rankingSystemGroupId
                  competitions: $competitions
                  tournaments: $tournaments
                ) {
                  name
                  id
                }
              }
            `,
            variables,
          })
        );
      }

      if (added.length > 0) {
        if (this.data.event instanceof EventTournament) {
          variables['tournaments'] = added;
        }
        if (this.data.event instanceof EventCompetition) {
          variables['competitions'] = added;
        }

        mutations.push(
          this.apollo.mutate({
            mutation: gql`
              mutation AddSubEventToRankingSystemGroup(
                $rankingSystemGroupId: ID
                $competitions: [ID]
                $tournaments: [ID]
              ) {
                addSubEventToRankingSystemGroup(
                  rankingSystemGroupId: $rankingSystemGroupId
                  competitions: $competitions
                  tournaments: $tournaments
                ) {
                  name
                  id
                }
              }
            `,
            variables,
          })
        );
      }
    }

    forkJoin(mutations)
      .pipe(
        catchError((err) => {
          console.error('error', err);
          this.snackbar.open(err.message, 'OK', { duration: 5000 });
          throw err;
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(() => {
        // Evict cache
        const normalizedIdCompetition = apolloCache.identify({
          id: this.data.event.id,
          __typename: 'EventCompetition',
        });
        const normalizedIdTournament = apolloCache.identify({
          id: this.data.event.id,
          __typename: 'EventTournament',
        });
        apolloCache.evict({ id: normalizedIdCompetition });
        apolloCache.evict({ id: normalizedIdTournament });
        apolloCache.gc();

        // Close dialog
        this.dialogRef.close();
      });
  }

  compareGroups = (a: RankingGroup, b: RankingGroup) => a.id == b.id;
}
