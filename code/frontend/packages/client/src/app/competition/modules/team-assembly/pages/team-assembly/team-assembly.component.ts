import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import {
  CompetitionEncounter,
  CompetitionEvent,
  EncounterService,
  PdfService,
  Player,
  SystemService,
} from 'app/_shared';
import * as moment from 'moment';
import { lastValueFrom, map, switchMap } from 'rxjs';
import { TeamAssemblyService } from '../../services/team-assembly.service';

@Component({
  templateUrl: './team-assembly.component.html',
  styleUrls: ['./team-assembly.component.scss'],
})
export class TeamAssemblyComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});
  loaded: boolean = false;
  pdfLoading: boolean = false;

  selectedEventControl: FormControl = new FormControl();
  events?: CompetitionEvent[];

  constructor(
    private assemblyService: TeamAssemblyService,
    private apollo: Apollo,
    private encoutnerService: EncounterService,
    private systemService: SystemService,
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
    this.formGroup.addControl('event', this.selectedEventControl);

    this.apollo
      .query<{ competitionEvents: { edges: { node: Partial<CompetitionEvent> }[] } }>({
        query: gql`
          query GetSubevents($year: Int!) {
            competitionEvents(where: { startYear: $year }) {
              edges {
                node {
                  id
                  startYear
                  usedRankingAmount
                  usedRankingUnit
                  subEvents {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: {
          year: year,
        },
      })
      .pipe(map((result) => result.data.competitionEvents?.edges?.map((c) => new CompetitionEvent(c.node))))
      .subscribe((events: CompetitionEvent[]) => {
        this.events = events;
        this.loaded = true;
      });
  }

  encounterSelected(encounter: CompetitionEncounter) {
    this.selectedEventControl?.setValue(
      this.events?.find((e) => e.subEvents?.find((s) => s.id === encounter.draw?.subeventId))
    );
  }

  async download() {
    // Mark as downloading
    this.pdfLoading = true;

    // Auto reeset after 5 seconds
    setTimeout(() => {
      this.pdfLoading = false;
    }, 5000);

    // Get info
    const encounterId = this.formGroup.get('encounter')?.value;
    var encounter = await lastValueFrom(this.encoutnerService.getEncounter(encounterId));
    const fileName = `${moment(encounter?.date).format('YYYY-MM-DD HH:mm')} - ${encounter?.home?.name} vs ${
      encounter?.away?.name
    }.pdf`;

    // Generate pdf
    await lastValueFrom(
      this.systemService.getPrimarySystem().pipe(
        switchMap((system) =>
          this.assemblyService.getTeamAssembly({
            systemId: system!.id!,
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
        ),
        switchMap((html) => this.pdfService.generatePdf(html, fileName))
      )
    );

    // Reset loading
    this.pdfLoading = false;
  }
}
