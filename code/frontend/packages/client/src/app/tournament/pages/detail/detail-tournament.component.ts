import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { EventService, TournamentEvent } from 'app/_shared';
import { AssignRankingGroupsComponent } from 'app/_shared/dialogs';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-tournament.component.html',
  styleUrls: ['./detail-tournament.component.scss'],
})
export class DetailTournamentComponent implements OnInit {
  event$!: Observable<TournamentEvent>;

  update$ = new BehaviorSubject(0);

  constructor(private eventService: EventService, private route: ActivatedRoute, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.event$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      switchMap(([params]) => this.eventService.getTournamentEvent(params.get('id')!))
    );
  }

  assignRankingGroups(event: Partial<TournamentEvent>) {
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
