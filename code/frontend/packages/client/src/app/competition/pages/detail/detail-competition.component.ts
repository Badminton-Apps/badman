import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { CompetitionEvent, EventService } from 'app/_shared';
import { AssignRankingGroupsComponent } from 'app/_shared/dialogs';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-competition.component.html',
  styleUrls: ['./detail-competition.component.scss'],
})
export class DetailCompetitionComponent implements OnInit {
  event$!: Observable<CompetitionEvent>;

  update$ = new BehaviorSubject(0);

  constructor(private eventService: EventService, private route: ActivatedRoute, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.event$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      switchMap(([params]) => this.eventService.getCompetitionEvent(params.get('id')!))
    );
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
