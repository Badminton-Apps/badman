import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map, switchMap } from 'rxjs/operators';
import {
  Club,
  CompetitionSubEvent,
  LevelType,
  SystemService,
  Team,
} from '@badman/frontend/shared';
import { combineLatest } from 'rxjs';
import { TeamDialogComponent } from '@badman/frontend/team';

interface Issues {
  level: string[];
  base: string[];
  hasIssues: boolean;
  message: string;
  class: string;
}

interface Warnings {
  base: string[];
  level: string[];
  hasIssues: boolean;
}

@Component({
  selector: 'badman-assign-team',
  templateUrl: './assign-team.component.html',
  styleUrls: ['./assign-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignTeamComponent implements OnChanges {
  @Input()
  teams!: Team[];

  @Input()
  club!: Club;

  @Input()
  subEvents!: CompetitionSubEvent[];

  @Input()
  type!: string;

  @Output()
  newSubEventAssignmentForTeam = new EventEmitter<{
    team: Team;
    subEventId: string;
  }>();

  issues = {} as {
    [key: string]: Issues;
  };
  warnings = {} as { [key: string]: Warnings };

  constructor(
    private dialog: MatDialog,
    private changeDetector: ChangeDetectorRef,
    private translation: TranslateService,
    private apollo: Apollo,
    private systemService: SystemService
  ) {}

  ngOnChanges(): void {
    this.subEvents = this.subEvents.sort((a, b) => {
      if (!a.eventCompetition || !b.eventCompetition) {
        return 0;
      }

      // Sort by type:
      //  1. NAT
      //  2. LIGA
      //  3. PROV
      // If equal sort by level
      if (a.eventCompetition.type === b.eventCompetition.type) {
        return (a.level ?? 0) - (b.level ?? 0);
      }

      if (a.eventCompetition.type == LevelType.NATIONAL) {
        return -1;
      }

      if (b.eventCompetition.type == LevelType.NATIONAL) {
        return 1;
      }

      if (a.eventCompetition.type == LevelType.PROV) {
        return 1;
      }

      if (b.eventCompetition.type == LevelType.PROV) {
        return -1;
      }
      return 0;
    });
    this.initialPlacing();
  }

  async drop(
    event: CdkDragDrop<CompetitionSubEvent, CompetitionSubEvent, Team>
  ) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data?.teams ?? [],
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data?.teams ?? [],
        event.container.data?.teams ?? [],
        event.previousIndex,
        event.currentIndex
      );
      await this.validate(event.item.data, event.container.data);
      this.newSubEventAssignmentForTeam.next({
        team: event.item.data,
        subEventId: event.container.data.id ?? '',
      });
    }
  }

  editTeam(team: Team, subEvent: CompetitionSubEvent) {
    const dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { team, club: this.club, allowEditType: false },
    });

    combineLatest([
      dialogRef.afterClosed(),
      this.systemService.getPrimarySystemId(),
    ])
      .pipe(
        switchMap(([, systemId]) =>
          this.apollo.query<{ team: Team }>({
            query: gql`
              query GetTeamQuery($id: ID!, $systemId: ID!) {
                team(id: $id) {
                  id
                  name
                  teamNumber
                  abbreviation
                  type
                  preferredTime
                  preferredDay
                  active
                  captain {
                    id
                    fullName
                  }
                  locations {
                    id
                    name
                  }
                  players {
                    id
                    slug
                    firstName
                    lastName
                    competitionPlayer
                    base
                    gender
                    rankingLastPlaces(take: 1, where: { systemId: $systemId }) {
                      id
                      single
                      double
                      mix
                    }
                  }
                }
              }
            `,
            variables: {
              id: team?.id,
              systemId: systemId,
            },
          })
        ),
        map((x) => new Team(x.data.team))
      )
      .subscribe(async (newTeam) => {
        let index = subEvent.teams?.findIndex((t) => t.id == team.id);

        if (!subEvent.teams) {
          subEvent.teams = [];
          index = 0;
        }

        if (index == -1 || index == undefined) {
          throw new Error('Team not found in subEvent');
        }

        await this.validate(newTeam, subEvent);
        subEvent.teams[index] = newTeam;
        this.changeDetector.detectChanges();
      });
  }

  private async validate(team: Team, subEvent: CompetitionSubEvent) {
    if (
      !subEvent?.maxLevel ||
      !subEvent?.maxBaseIndex ||
      !subEvent?.minBaseIndex
    ) {
      throw new Error("SubEvent doesn't have all the info");
    }

    if (!team.id || !team.teamNumber || !team.baseIndex) {
      throw new Error("Team doesn't have all the info");
    }

    const issues = {
      level: [],
      base: [],
      hasIssues: false,
      message: '',
      class: '',
    } as Issues;
    const warnings = {
      base: [],
      level: [],
      hasIssues: false,
    } as Warnings;

    for (const player of team.players) {
      if (player?.lastRanking) {
        if (player.base) {
          if (
            player.lastRanking.single &&
            player.lastRanking.single < subEvent.maxLevel
          ) {
            issues.hasIssues = true;
            issues.level.push(
              this.translation.instant(
                'competition.enrollment.errors.not-allowed',
                {
                  player: player.fullName,
                  type: 'single',
                  level: player.lastRanking.single,
                  max: subEvent.maxLevel,
                }
              )
            );
          }
          if (
            player.lastRanking.double &&
            player.lastRanking.double < subEvent.maxLevel
          ) {
            issues.hasIssues = true;
            issues.level.push(
              this.translation.instant(
                'competition.enrollment.errors.not-allowed',
                {
                  player: player.fullName,
                  type: 'double',
                  level: player.lastRanking.double,
                  max: subEvent.maxLevel,
                }
              )
            );
          }
          if (subEvent.eventType == 'MX') {
            if (
              player.lastRanking.mix &&
              player.lastRanking.mix < subEvent.maxLevel
            ) {
              issues.hasIssues = true;
              issues.level.push(
                this.translation.instant(
                  'competition.enrollment.errors.not-allowed',
                  {
                    player: player.fullName,
                    type: 'mix',
                    level: player.lastRanking.mix,
                    max: subEvent.maxLevel,
                  }
                )
              );
            }
          }
        } else {
          if (
            player.lastRanking.single &&
            player.lastRanking.single < subEvent.maxLevel
          ) {
            warnings.hasIssues = true;
            warnings.level.push(
              this.translation.instant(
                'competition.enrollment.errors.cant-play',
                {
                  player: player.fullName,
                  type: 'single',
                  level: player.lastRanking.single,
                  max: subEvent.maxLevel,
                }
              )
            );
          }
          if (
            player.lastRanking.double &&
            player.lastRanking.double < subEvent.maxLevel
          ) {
            warnings.hasIssues = true;
            warnings.level.push(
              this.translation.instant(
                'competition.enrollment.errors.cant-play',
                {
                  player: player.fullName,
                  type: 'double',
                  level: player.lastRanking.double,
                  max: subEvent.maxLevel,
                }
              )
            );
          }
          if (subEvent.eventType == 'MX') {
            if (
              player.lastRanking.mix &&
              player.lastRanking.mix < subEvent.maxLevel
            ) {
              warnings.hasIssues = true;
              warnings.level.push(
                this.translation.instant(
                  'competition.enrollment.errors.cant-play',
                  {
                    player: player.fullName,
                    type: 'mix',
                    level: player.lastRanking.mix,
                    max: subEvent.maxLevel,
                  }
                )
              );
            }
          }
        }
      }
    }

    let bestIndex = 0;

    if (team.type == 'MX') {
      const bestPlayers = team.players
        .map((r) => r.index ?? 0)
        .sort((a, b) => a - b)
        .slice(0, 4);

      bestIndex = bestPlayers.reduce((a, b) => a + b, 0);
    } else {
      const bestPlayers = [
        // 2 best male
        ...team.players
          .filter((p) => p.gender == 'M')
          .map((r) => r.index ?? 0)
          .sort((a, b) => a - b)
          .slice(0, 2),
        // 2 best female
        ...team.players
          .filter((p) => p.gender == 'F')
          .map((r) => r.index ?? 0)
          .sort((a, b) => a - b)
          .slice(0, 2),
      ];

      bestIndex = bestPlayers.reduce((a, b) => a + b, 0);
    }

    if (bestIndex < subEvent.minBaseIndex && team.teamNumber > 1) {
      warnings.hasIssues = true;
      warnings.base.push(
        this.translation.instant('competition.enrollment.errors.best-players')
      );
    }

    if (team.baseIndex < subEvent.minBaseIndex) {
      issues.hasIssues = true;
      issues.base.push(
        this.translation.instant('competition.enrollment.errors.base-min')
      );
    }

    if (team.baseIndex > subEvent.maxBaseIndex) {
      issues.hasIssues = true;
      issues.base.push(
        this.translation.instant('competition.enrollment.errors.base-max')
      );
    }

    if (team.captain == null) {
      issues.hasIssues = true;
      issues.base.push(
        this.translation.instant('competition.enrollment.errors.no-captain')
      );
    }

    if (team.locations == null || team.locations?.length == 0) {
      issues.hasIssues = true;
      issues.base.push(
        this.translation.instant('competition.enrollment.errors.no-location')
      );
    }

    if (team.preferredDay == null || team.preferredTime == null) {
      issues.hasIssues = true;
      issues.base.push(
        this.translation.instant('competition.enrollment.errors.no-prefferd')
      );
    }

    if (bestIndex > subEvent.maxBaseIndex) {
      warnings.hasIssues = true;
      warnings.base.push(
        this.translation.instant('competition.enrollment.errors.best-max')
      );
    }

    if (issues.hasIssues) {
      issues.message += issues.base.join('\n\r');
      if (issues.base.length > 0 && issues.level.length > 0) {
        issues.message += '\n\r';
      }
      issues.message += issues.level.join('\n\r');
    }

    if (issues.hasIssues && warnings.hasIssues) {
      issues.message += '\n\r';
    }

    if (warnings.hasIssues) {
      issues.message += warnings.base.join('\n\r');
      if (warnings.base.length > 0 && warnings.level.length > 0) {
        issues.message += '\n\r';
      }
      issues.message += warnings.level.join('\n\r');
    }

    issues.class = issues.hasIssues
      ? 'issues'
      : warnings.hasIssues
      ? 'warnings'
      : '';

    // If there are issues or warnings, show the message
    issues.hasIssues = issues.hasIssues || warnings.hasIssues;

    this.issues[team.id] = issues;
    this.changeDetector.detectChanges();
  }

  private async initialPlacing() {
    // Because sort is in place, we create a local copy to not effect the original untill needed
    const localInstanceSubEvents = [...this.subEvents];
    const subEventsSorted = localInstanceSubEvents.sort((a, b) => {
      if (!a.minBaseIndex || !b.minBaseIndex) {
        return 0;
      }
      return a.minBaseIndex - b.minBaseIndex;
    });
    for (const team of this.teams) {
      let subEventIndex = -1;

      for (const tse of team.entries ?? []) {
        subEventIndex = subEventsSorted.findIndex(
          (s) => s.id === tse.competitionSubEvent?.id
        );
        if (subEventIndex >= 0) {
          break;
        }
      }

      // We couldn't find any assign based on index
      if (subEventIndex < 0) {
        // subEventIndex = subEventsSorted.findIndex((subEvent) => team.baseIndex > subEvent.minBaseIndex);
        subEventIndex = subEventsSorted.findIndex(
          (subEvent) => (subEvent.maxBaseIndex ?? 0) > (team.baseIndex ?? 0)
        );

        if (subEventIndex < 0) {
          subEventIndex = subEventsSorted.length - 1;
        }

        const subEventId = subEventsSorted[subEventIndex].id;
        if (!subEventId) {
          throw new Error('No subEventId');
        }

        this.newSubEventAssignmentForTeam.next({
          team: team,
          subEventId,
        });
      }

      localInstanceSubEvents[subEventIndex]?.teams?.push(team);

      await this.validate(team, localInstanceSubEvents[subEventIndex]);
    }

    const natSubEvents = localInstanceSubEvents
      .filter((a) => a.eventCompetition?.type == 'NATIONAL')
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    const ligaSubEvents = localInstanceSubEvents
      .filter((a) => a.eventCompetition?.type == 'LIGA')
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    const provSubEvents = localInstanceSubEvents
      .filter((a) => a.eventCompetition?.type == 'PROV')
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

    this.subEvents = [...natSubEvents, ...ligaSubEvents, ...provSubEvents];
  }
}
