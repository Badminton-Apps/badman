import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { CompetitionEvent, EventService, SystemService } from 'app/_shared';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-competition.component.html',
  styleUrls: ['./detail-competition.component.scss'],
})
export class DetailCompetitionComponent implements OnInit {
  event$: Observable<CompetitionEvent>;

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
        this.eventService.getCompetitionEvent(params.get('id'))
      )
    );
  }
}
