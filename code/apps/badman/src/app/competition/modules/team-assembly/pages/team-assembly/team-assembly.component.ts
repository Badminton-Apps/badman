import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import * as moment from 'moment';
import { lastValueFrom, map, switchMap } from 'rxjs';
import {
  CompetitionEncounter,
  EventCompetition,
  EncounterService,
  PdfService,
  Player,
  SystemService,
} from '../../../../../_shared';
import { TeamAssemblyService } from '../../services/team-assembly.service';

@Component({
  templateUrl: './team-assembly.component.html',
  styleUrls: ['./team-assembly.component.scss'],
})
export class TeamAssemblyComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});
  loaded = false;
  pdfLoading = false;

  selectedEventControl: FormControl = new FormControl();
  events?: EventCompetition[];

  constructor(
    private assemblyService: TeamAssemblyService,
    private apollo: Apollo,
    private systemService: SystemService,
    private pdfService: PdfService,
    private titleService: Title,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    const today = moment();
    const queryYear = parseInt(
      this.activatedRoute.snapshot.queryParams['year'],
      10
    );
    const year = isNaN(queryYear)
      ? today.month() >= 6
        ? today.year()
        : today.year() - 1
      : queryYear;

    this.titleService.setTitle(`Team Assembly`);
    this.formGroup.addControl('year', new FormControl(year));
    this.formGroup.addControl('event', this.selectedEventControl);

    this.apollo
      .query<{
        eventCompetitions: { rows: Partial<EventCompetition>[] };
      }>({
        query: gql`
          query GetSubevents($year: Int!) {
            eventCompetitions(where: { startYear: $year }) {
              rows {
                id
                startYear
                usedRankingAmount
                usedRankingUnit
                subEventCompetitions {
                  id
                }
              }
            }
          }
        `,
        variables: {
          year: year,
        },
      })
      .pipe(
        map((result) =>
          result.data.eventCompetitions?.rows?.map(
            (c) => new EventCompetition(c)
          )
        )
      )
      .subscribe((events: EventCompetition[]) => {
        this.events = events;
        this.loaded = true;
      });
  }

  encounterSelected(encounter: CompetitionEncounter) {
    this.selectedEventControl?.setValue(
      this.events?.find((e) =>
        e.subEventCompetitions?.find(
          (s) => s.id === encounter.drawCompetition?.subeventId
        )
      )
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
    const result = await lastValueFrom(
      this.apollo.query<{
        encounterCompetition: Partial<CompetitionEncounter>;
      }>({
        query: gql`
          query GetEncounterQuery($id: ID!) {
            encounterCompetition(id: $id) {
              id
              home {
                id
                name
              }
              away {
                id
                name
              }
            }
          }
        `,
        variables: {
          id: encounterId,
        },
      })
    );

    const encounter = new CompetitionEncounter(
      result.data.encounterCompetition
    );
    const fileName = `${moment(encounter?.date).format('YYYY-MM-DD HH:mm')} - ${
      encounter?.home?.name
    } vs ${encounter?.away?.name}.pdf`;

    // Generate pdf
    await lastValueFrom(
      this.systemService.getPrimarySystem().pipe(
        switchMap((system) => {
          if (!system || !system.id) {
            throw new Error('No system found');
          }

          return this.assemblyService.getTeamAssembly({
            systemId: system.id,
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
              subtitude:
                this.formGroup
                  .get('substitude')
                  ?.value?.map((r: Player) => r?.id) ?? [],
            },
          });
        }),
        switchMap((html) => this.pdfService.generatePdf(html, fileName))
      )
    );

    // Reset loading
    this.pdfLoading = false;
  }
}
