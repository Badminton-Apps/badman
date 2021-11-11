import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EventService, Player, TeamService } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import * as moment from 'moment';
import { lastValueFrom, withLatestFrom } from 'rxjs';
import { TeamAssemblyService } from '../../services/team-assembly.service';

@Component({
  templateUrl: './team-assembly.component.html',
  styleUrls: ['./team-assembly.component.scss'],
})
export class TeamAssemblyComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});
  loaded: boolean = false;

  constructor(
    private assemblyService: TeamAssemblyService,
    private eventService: EventService,
    private encoutnerService: EncounterService,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    const today = moment();
    const year =
      parseInt(this.activatedRoute.snapshot.queryParams['year'], 10) ??
      (today.month() >= 6 ? today.year() : today.year() - 1);

    this.formGroup.addControl('year', new FormControl(year));
    this.formGroup.addControl('mayRankingDate', new FormControl(moment(`${year}-05-15`).toDate()));

    // This can later allow multiple competition years
    this.eventService.getSubEventsCompetition(year).subscribe((subEvents) => {
      this.formGroup.addControl(
        'subEvents',
        new FormControl(subEvents?.map((s) => s.subEvents?.map((r) => r.id)).flat())
      );
      this.loaded = true;
    });
  }

  async download() {
    const encounterId = this.formGroup.get('encounter')?.value;

    const response = await lastValueFrom(
      this.assemblyService.getPdf({
        captainId: this.formGroup.get('captain')?.value,
        teamId: this.formGroup.get('team')?.value,
        encounterId: encounterId,
        team: {
          double: [
            this.formGroup.get('double1')?.value?.map((r: Player) => r.id),
            this.formGroup.get('double2')?.value?.map((r: Player) => r.id),
            this.formGroup.get('double3')?.value?.map((r: Player) => r.id),
            this.formGroup.get('double4')?.value?.map((r: Player) => r.id),
          ],
          single: [
            this.formGroup.get('single1')?.value?.id,
            this.formGroup.get('single2')?.value?.id,
            this.formGroup.get('single3')?.value?.id,
            this.formGroup.get('single4')?.value?.id,
          ],
          subtitude: this.formGroup.get('substitude')?.value?.map((r: Player) => r?.id) ?? [],
        },
      })
    );

    // const blob = new Blob([response], { type: 'application/pdf' });
    var downloadURL = window.URL.createObjectURL(response);
    var link = document.createElement('a');
    var encounter = await lastValueFrom(this.encoutnerService.getEncounter(encounterId));
    link.href = downloadURL;
    link.download = `${moment(encounter?.date).format('YYYY-MM-DD HH:mm')} - ${encounter?.home?.name} vs ${
      encounter?.away?.name
    }.pdf`;
    link.click();
  }
}
