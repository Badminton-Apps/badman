import {
  CdkDrag,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { CompetitionSubEvent, Team } from 'app/_shared';

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
  subEvents: CompetitionSubEvent[];

  @Input()
  type: string;

  ids = [];

  ngOnInit(): void {
    this.ids = this.subEvents.map((s) => s.id);
    this.initialPlacing();
  }

  drop(event: CdkDragDrop<Team[]>): void {
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
    }
  }

  private initialPlacing() {
    for (const team of this.teams) {
      const subEvent = this.subEvents.sort((a, b) => b.level - a.level).find(
        (subEvent) => team.baseIndex > subEvent.minBaseIndex
      );
      {
        (subEvent as any)?.teams?.push(team);
        continue;
      }
    }
    this.subEvents = this.subEvents.sort((a, b) => a.level - b.level);
  }


   sortPredicate(index: Team, item: CdkDrag<Team>) {
    return index.number > item.data.number;
  }
}
