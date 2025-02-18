import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Club, EncounterCompetition, Team } from '@badman/frontend-models';
import { MtxGrid, MtxGridColumn } from '@ng-matero/extensions/grid';
import { MtxSelect } from '@ng-matero/extensions/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { CompetitionEncounterService } from './competition-encounters.service';

@Component({
  selector: 'badman-competition-encounters',
  templateUrl: './competition-encounters.html',
  styleUrls: ['./competition-encounters.scss'],
  imports: [
    FormsModule,
    MatButtonModule,
    MtxGrid,
    MtxSelect,
    MatFormField,
    MatLabel,
    MatSlideToggleModule,
    TranslateModule,
  ],
})
export class CompetitionEncountersComponent {
  // injects
  readonly service = inject(CompetitionEncounterService);
  private readonly translate = inject(TranslateService);

  encounters = this.service.encounters;
  clubs = this.service.clubs;
  teams = this.service.teams;
  loaded = this.service.state.loaded;
  loading = computed(() => !this.loaded());

  columns: MtxGridColumn<EncounterCompetition>[] = [
    {
      field: 'home.name',
      header: this.translate.stream('all.competition.home'),
      sortable: true,
    },
    {
      field: 'away.name',
      header: this.translate.stream('all.competition.away'),
      sortable: true,
    },
    {
      field: 'date',
      header: this.translate.stream('all.competition.date'),
      sortable: true,
      formatter: (enc) => moment(enc.date).format('llll'),
    },
    {
      field: 'originalDate',
      header: this.translate.stream('all.competition.originalDate'),
      sortable: true,
      formatter: (enc) => {
        if (!enc.originalDate || moment(enc.originalDate).isSame(enc.date)) {
          return '';
        }

        return moment(enc.originalDate).format('llll');
      },
    },
  ];

  filterClub(club: Club) {
    this.service.state.filterOnClub(club?.id);
  }

  filterTeam(team: Team) {
    this.service.state.filterOnTeam(team?.id);
  }

  toggleOnlyChanged(state: MatSlideToggleChange) {
    this.service.state.filterOnChangedRequest(state.checked);
  }

  toggleOpenRequests(state: MatSlideToggleChange) {
    this.service.state.filterOnOpenRequests(state.checked);
  }
}
