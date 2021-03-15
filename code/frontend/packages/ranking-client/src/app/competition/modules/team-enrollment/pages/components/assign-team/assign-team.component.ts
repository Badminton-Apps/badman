import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { SubEvent, Team } from 'app/_shared';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-assign-team',
  templateUrl: './assign-team.component.html',
  styleUrls: ['./assign-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignTeamComponent implements OnInit {
  @Input()
  teams: Team[]

  @Input()
  subEvents: SubEvent[];

  @Input()
  type: string;

  ids = []

  ngOnInit(): void {
    this.ids = this.subEvents.map(s => s.id);
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
}
