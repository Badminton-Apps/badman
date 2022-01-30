import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { EventService, PdfService, Player } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import * as moment from 'moment';
import { lastValueFrom, startWith, switchMap } from 'rxjs';
import { TeamAssemblyService } from '../../services/team-assembly.service';

@Component({
  templateUrl: './team-assembly.component.html',
  styleUrls: ['./team-assembly.component.scss'],
})
export class TeamAssemblyComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});
  loaded: boolean = false;
  pdfLoading: boolean = false;

  constructor(
    private assemblyService: TeamAssemblyService,
    private eventService: EventService,
    private encoutnerService: EncounterService,
    private pdfService: PdfService,
    private titleService: Title,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    const today = moment();
    const queryYear = parseInt(this.activatedRoute.snapshot.queryParams['year'], 10);
    const year = isNaN(queryYear) ? (today.month() >= 6 ? today.year() : today.year() - 1) : queryYear;

    this.titleService.setTitle(`Team Assembly`);

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
    this.pdfLoading = true;
    const encounterId = this.formGroup.get('encounter')?.value;
    var encounter = await lastValueFrom(this.encoutnerService.getEncounter(encounterId));
    const fileName = `${moment(encounter?.date).format('YYYY-MM-DD HH:mm')} - ${encounter?.home?.name} vs ${
      encounter?.away?.name
    }.pdf`;

    await lastValueFrom(
      this.assemblyService
        .getTeamAssembly({
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
        .pipe(switchMap((html) => this.pdfService.generatePdf(html, fileName)))
    );

    this.pdfLoading = false;
  }
}
