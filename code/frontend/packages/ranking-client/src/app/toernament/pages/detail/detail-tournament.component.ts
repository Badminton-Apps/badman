import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { EventService, SystemService, TournamentEvent } from 'app/_shared';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-tournament.component.html',
  styleUrls: ['./detail-tournament.component.scss'],
})
export class DetailTournamentComponent implements OnInit {
  event$: Observable<TournamentEvent>;

  update$ = new BehaviorSubject(0);

  constructor(
    private eventService: EventService,
    private systemService: SystemService,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.event$ = this.route.paramMap.pipe(
      switchMap((params) =>
        this.eventService.getTournamentEvent(params.get('id'))
      )
    );
  }
}
