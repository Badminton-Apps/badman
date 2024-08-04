import { JsonPipe } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { PageHeaderComponent } from '@badman/frontend-components';
import { Club, EncounterCompetition, Team } from '@badman/frontend-models';
import { MtxGrid, MtxGridColumn } from '@ng-matero/extensions/grid';
import { MtxSelect } from '@ng-matero/extensions/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompetitionEncounterService } from './competition-encounters.service';
import moment from 'moment';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'badman-competition-encounters',
  templateUrl: './competition-encounters.page.html',
  styleUrls: ['./competition-encounters.page.scss'],
  standalone: true,
  imports: [
    JsonPipe,
    MatCheckbox,
    FormsModule,
    MatRadioGroup,
    MatRadioButton,
    MatButtonModule,
    MtxGrid,
    MtxSelect,
    MatFormField,
    MatLabel,
    MatInput,
    MatSlideToggleModule,
    PageHeaderComponent,
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
    this.service.state.filterClub(club?.id);
  }

  filterTeam(team: Team) {
    this.service.state.filterTeam(team?.id);
  }

  toggleOnlyChanged(state: MatSlideToggleChange) {
    this.service.state.filterChanged(state.checked);
  }

  toggleOpenRequests(state: MatSlideToggleChange) {
    this.service.state.filterOnOpenRequests(state.checked);
  }
}
