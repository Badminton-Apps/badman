import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { SelectionModel } from '@angular/cdk/collections';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  ViewChild
} from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Event as CompEvent, EventService, EventType } from 'app/_shared';
import { BehaviorSubject, merge, of as observableOf } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-toernaments-data',
  templateUrl: './toernaments-data.component.html',
  styleUrls: ['./toernaments-data.component.scss'],
  
})
export class ToernamentsDataComponent {
  @Input()
  data: Event
}
