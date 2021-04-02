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
  OnInit,
  Output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TeamDialogComponent } from 'app/club/dialogs';
import { Club, CompetitionSubEvent, Team } from 'app/_shared';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-assign-team',
  templateUrl: './assign-team.component.html',
  styleUrls: ['./assign-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignTeamComponent implements OnInit {
  @Input()
  teams: Team[];

  @Input()
  club: Club;

  @Input()
  subEvents: CompetitionSubEvent[];

  @Input()
  type: string;

  @Output()
  onChange = new EventEmitter<{
    teamId: string;
    oldSubEventId: string;
    newSubEventId: string;
  }>();

  issues = {};

  ids = [];

  constructor(
    private dialog: MatDialog,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.ids = this.subEvents.map((s) => s.id);
    this.initialPlacing();
  }

  drop(
    event: CdkDragDrop<Team[], Team[]>,
    subEvent: CompetitionSubEvent
  ): void {
    console.log(event.container);

    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      const team = subEvent.teams[event.currentIndex];
      this.validate(team, subEvent);

      this.onChange.next({
        teamId: team.id,
        oldSubEventId: event.previousContainer.id,
        newSubEventId: event.container.id,
      });
    }
  }

  editTeam(team: Team, subEvent: CompetitionSubEvent) {
    let dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { team, club: this.club },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((result) => !!result))
      .subscribe((newTeam) => {
        const index = subEvent.teams.findIndex((t) => t.id == team.id);
        this.validate(newTeam, subEvent);
        subEvent.teams[index] = newTeam;
        this.changeDetector.detectChanges();
      });
  }

  private validate(team: Team, subEvent: CompetitionSubEvent) {
    const issues = {
      level: [],
      base: [],
      hasIssues: false,
      message: '',
    };
    for (const player of team.players.filter((p) => p.base)) {
      if (player?.rankingPlaces && player?.rankingPlaces?.length > 0) {
        const rankingPlace = player?.rankingPlaces[0];
        if (rankingPlace.single < subEvent.maxLevel) {
          issues.hasIssues = true;
          issues.level.push(
            `${player.fullName} is ${rankingPlace.single} in single while max ${subEvent.maxLevel} is allowed`
          );
        }
        if (rankingPlace.double < subEvent.maxLevel) {
          issues.hasIssues = true;
          issues.level.push(
            `${player.fullName} is ${rankingPlace.double} in double while max ${subEvent.maxLevel} is allowed`
          );
        }
        if (subEvent.gameType == 'MX') {
          if (rankingPlace.mix < subEvent.maxLevel) {
            issues.hasIssues = true;
            issues.level.push(
              `${player.fullName} is ${rankingPlace.mix} in mix while max ${subEvent.maxLevel} is allowed`
            );
          }
        }
      }
    }

    if (team.baseIndex < subEvent.minBaseIndex) {
      issues.hasIssues = true;
      issues.base.push('Team base index is to strong');
    }

    if (issues.hasIssues) {
      issues.message += issues.base.join('\n\r');
      if (issues.base.length > 0 && issues.level.length > 0) {
        issues.message += '\n\r';
      }
      issues.message += issues.level.join('\n\r');
    }

    this.issues[team.id] = issues;
  }

  private initialPlacing() {
    const subEventsSorted = this.subEvents.sort((a, b) => b.level - a.level);
    for (const team of this.teams) {
      let subEvent = null;
      let wasAlreadyAssigned = false;

      for (const tse of team.subEvents) {
        subEvent = subEventsSorted.find((s) => s.id === tse.id);
        if (subEvent) {
          wasAlreadyAssigned = true;
          break;
        }
      }

      if (!subEvent) {
        subEvent = subEventsSorted.find(
          (subEvent) => team.baseIndex > subEvent.minBaseIndex
        );
      }

      if (!subEvent && subEventsSorted.length > 0) {
        subEventsSorted[0].teams?.push(team);
      } else {
        subEvent?.teams?.push(team);
        if (!wasAlreadyAssigned) {
          this.onChange.next({
            teamId: team.id,
            oldSubEventId: null,
            newSubEventId: subEvent.id,
          });
        }
      }
      this.validate(team, subEvent);
    }

    const natSubEvents = this.subEvents
      .filter((a) => a.levelType == 'NATIONAL')
      .sort((a, b) => a.level - b.level);
    const ligaSubEvents = this.subEvents
      .filter((a) => a.levelType == 'LIGA')
      .sort((a, b) => a.level - b.level);
    const provSubEvents = this.subEvents
      .filter((a) => a.levelType == 'PROV')
      .sort((a, b) => a.level - b.level);

    this.subEvents = [...natSubEvents, ...ligaSubEvents, ...provSubEvents];
  }
}
