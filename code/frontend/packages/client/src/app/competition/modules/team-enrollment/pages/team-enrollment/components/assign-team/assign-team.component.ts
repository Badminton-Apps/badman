import { Apollo } from 'apollo-angular';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { TeamDialogComponent } from 'app/club/dialogs';
import { Club, CompetitionSubEvent, Team } from 'app/_shared';
import { map, switchMap } from 'rxjs/operators';
import * as teamQuery from '../../../../../../../_shared/graphql/teams/queries/GetTeamQuery.graphql';

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
  selector: 'app-assign-team',
  templateUrl: './assign-team.component.html',
  styleUrls: ['./assign-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignTeamComponent implements OnInit {
  @Input()
  teams!: Team[];

  @Input()
  club!: Club;

  @Input()
  subEvents!: CompetitionSubEvent[];

  @Input()
  type!: string;

  @Output()
  newSubEvent = new EventEmitter<{
    teamId: string;
    subEventId: string;
  }>();

  issues = {} as {
    [key: string]: Issues;
  };
  warnings = {} as { [key: string]: Warnings };

  ids: string[] = [];

  constructor(
    private dialog: MatDialog,
    private changeDetector: ChangeDetectorRef,
    private translation: TranslateService,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    this.ids = this.subEvents.map((s) => s.id!);
    this.subEvents = this.subEvents.sort((a, b) => a.level! - b.level!);
    this.initialPlacing();
  }

  drop(event: CdkDragDrop<Team[] | undefined, Team[]>, subEvent: CompetitionSubEvent): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data!, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data!, event.previousIndex, event.currentIndex);
      const team = subEvent.teams![event.currentIndex];
      this.validate(team, subEvent);

      this.newSubEvent.next({
        teamId: team.id!,
        subEventId: event.container.id,
      });
    }
  }

  editTeam(team: Team, subEvent: CompetitionSubEvent) {
    let dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { team, club: this.club, allowEditType: false, allowEditNumber: false },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap(() =>
          this.apollo.query<{ team: Team }>({
            query: teamQuery,
            variables: {
              id: team?.id,
            },
          })
        ),
        map((x) => new Team(x.data.team))
      )
      .subscribe((newTeam) => {
        const index = subEvent.teams!.findIndex((t) => t.id == team.id);
        this.validate(newTeam, subEvent);
        subEvent.teams![index] = newTeam;
      });
  }

  private async validate(team: Team, subEvent: CompetitionSubEvent) {
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

    if ((team.teamNumber ?? 0) > 1) {
      for (const player of team.players) {
        if (player?.lastRanking) {
          if (player.base) {
            if (player.lastRanking.single! < subEvent.maxLevel!) {
              issues.hasIssues = true;
              issues.level.push(
                this.translation.instant('competition.enrollment.errors.not-allowed', {
                  player: player.fullName,
                  type: 'single',
                  level: player.lastRanking.single,
                  max: subEvent.maxLevel,
                })
              );
            }
            if (player.lastRanking.double! < subEvent.maxLevel!) {
              issues.hasIssues = true;
              issues.level.push(
                this.translation.instant('competition.enrollment.errors.not-allowed', {
                  player: player.fullName,
                  type: 'double',
                  level: player.lastRanking.double,
                  max: subEvent.maxLevel,
                })
              );
            }
            if (subEvent.gameType == 'MX') {
              if (player.lastRanking.mix! < subEvent.maxLevel!) {
                issues.hasIssues = true;
                issues.level.push(
                  this.translation.instant('competition.enrollment.errors.not-allowed', {
                    player: player.fullName,
                    type: 'mix',
                    level: player.lastRanking.mix,
                    max: subEvent.maxLevel,
                  })
                );
              }
            }
          } else {
            if (player.lastRanking.single! < subEvent.maxLevel!) {
              warnings.hasIssues = true;
              warnings.level.push(
                this.translation.instant('competition.enrollment.errors.cant-play', {
                  player: player.fullName,
                  type: 'single',
                  level: player.lastRanking.single,
                  max: subEvent.maxLevel,
                })
              );
            }
            if (player.lastRanking.double! < subEvent.maxLevel!) {
              warnings.hasIssues = true;
              warnings.level.push(
                this.translation.instant('competition.enrollment.errors.cant-play', {
                  player: player.fullName,
                  type: 'double',
                  level: player.lastRanking.double,
                  max: subEvent.maxLevel,
                })
              );
            }
            if (subEvent.gameType == 'MX') {
              if (player.lastRanking.mix! < subEvent.maxLevel!) {
                warnings.hasIssues = true;
                warnings.level.push(
                  this.translation.instant('competition.enrollment.errors.cant-play', {
                    player: player.fullName,
                    type: 'mix',
                    level: player.lastRanking.mix,
                    max: subEvent.maxLevel,
                  })
                );
              }
            }
          }
        }
      }
    }

    let bestIndex = 0;

    if (team.type !== 'MX') {
      const bestPlayers = team.players
        .map((r) => r.index)
        .sort((a, b) => a! - b!)
        .slice(0, 4);

      bestIndex = bestPlayers.reduce((a, b) => a! + b!, 0)!;
    } else {
      const bestPlayers = [
        // 2 best male
        ...team.players
          .filter((p) => p.gender == 'M')
          .map((r) => r.index)
          .sort((a, b) => a! - b!)
          .slice(0, 2),
        // 2 best female
        ...team.players
          .filter((p) => p.gender == 'F')
          .map((r) => r.index)
          .sort((a, b) => a! - b!)
          .slice(0, 2),
      ];

      bestIndex = bestPlayers.reduce((a, b) => a! + b!, 0)!;
    }

    if (bestIndex < subEvent.minBaseIndex! && team.teamNumber! > 1) {
      warnings.hasIssues = true;
      warnings.base.push(this.translation.instant('competition.enrollment.errors.best-players').toPromise());
    }

    if (team.baseIndex! < subEvent.minBaseIndex!) {
      issues.hasIssues = true;
      issues.base.push(this.translation.instant('competition.enrollment.errors.base-min').toPromise());
    }

    if (team.baseIndex! > subEvent.maxBaseIndex!) {
      issues.hasIssues = true;
      issues.base.push(this.translation.instant('competition.enrollment.errors.base-max').toPromise());
    }

    if (team.captain == null) {
      issues.hasIssues = true;
      issues.base.push(this.translation.instant('competition.enrollment.errors.no-captain').toPromise());
    }

    if (team.locations == null || team.locations?.length == 0) {
      issues.hasIssues = true;
      issues.base.push(this.translation.instant('competition.enrollment.errors.no-location').toPromise());
    }

    if (team.preferredDay == null || team.preferredTime == null) {
      issues.hasIssues = true;
      issues.base.push(this.translation.instant('competition.enrollment.errors.no-prefferd').toPromise());
    }

    if (bestIndex > subEvent.maxBaseIndex!) {
      warnings.hasIssues = true;
      warnings.base.push(this.translation.instant('competition.enrollment.errors.best-max').toPromise());
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

    issues.class = issues.hasIssues ? 'issues' : warnings.hasIssues ? 'warnings' : '';

    this.issues[team.id!] = issues;
    this.changeDetector.detectChanges();
  }

  private initialPlacing() {
    // Because sort is in place, we create a local copy to not effect the original untill needed
    const localInstanceSubEvents = [...this.subEvents];
    const subEventsSorted = localInstanceSubEvents.sort((a, b) => b.level! - a.level!);
    for (const team of this.teams) {
      let subEvent = null;

      for (const tse of team.subEvents) {
        subEvent = subEventsSorted.find((s) => s.id === tse.id);
        if (subEvent) {
          break;
        }
      }

      if (!subEvent) {
        subEvent = subEventsSorted.find((subEvent) => team.baseIndex! > subEvent.minBaseIndex!);
      }

      if (!subEvent && subEventsSorted.length > 0) {
        subEventsSorted[0].teams?.push(team);
      } else {
        subEvent?.teams?.push(team);
        this.newSubEvent.next({
          teamId: team.id!,
          subEventId: subEvent!.id!,
        });
      }
      this.validate(team, subEvent!);
    }

    const natSubEvents = localInstanceSubEvents
      .filter((a) => a.levelType == 'NATIONAL')
      .sort((a, b) => a.level! - b.level!);
    const ligaSubEvents = localInstanceSubEvents
      .filter((a) => a.levelType == 'LIGA')
      .sort((a, b) => a.level! - b.level!);
    const provSubEvents = localInstanceSubEvents
      .filter((a) => a.levelType == 'PROV')
      .sort((a, b) => a.level! - b.level!);

    this.subEvents = [...natSubEvents, ...ligaSubEvents, ...provSubEvents];
  }
}
