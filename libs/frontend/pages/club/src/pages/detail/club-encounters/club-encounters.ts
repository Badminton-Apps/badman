import { NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EncounterCompetition, Team } from '@badman/frontend-models';
import { MtxGrid, MtxGridColumn } from '@ng-matero/extensions/grid';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { ClubEncounterService, openRequestFilter, validationFilter } from './club-encounters.service';

@Component({
    selector: 'badman-club-encounters',
    templateUrl: './club-encounters.html',
    styleUrls: ['./club-encounters.scss'],
    imports: [
        NgClass,
        MatCheckbox,
        FormsModule,
        MatRadioGroup,
        MatRadioButton,
        MatButtonModule,
        MtxGrid,
        MtxSelectModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatIconModule,
        MatTooltipModule,
        MatSlideToggleModule,
        TranslateModule,
    ]
})
export class ClubEncountersComponent {
  // injects
  readonly service = inject(ClubEncounterService);
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
    {
      field: 'validation',
      header: this.translate.stream('all.club.encounters.validation.title'),
    },
  ];

  filterTeam(team: Team) {
    this.service.state.filterOnTeam(team?.id);
  }

  toggleOnlyChanged(state: MatSlideToggleChange) {
    this.service.state.filterOnChangedRequest(state.checked);
  }



  toggleHomeGames(state: MatSlideToggleChange) {
    this.service.state.filterOnHomeGames(state.checked);
  }

  filterOpenRequests(state: openRequestFilter) {
    this.service.state.filterOnOpenRequests(state);
  }
  
  filterValidGames(state: validationFilter) {
    this.service.state.filterOnValidGames(state);
  }

  getInfo(encounter: EncounterCompetition) {
    let icon = 'check';
    let infoClass = 'success';
    const tooltip = [];

    if ((encounter.validateEncounter?.warnings?.length ?? 0) > 0) {
      infoClass = 'warning';
      icon = 'warning';
      tooltip.push(...(encounter.validateEncounter?.warnings.map((e) => e.message) ?? []));
    }

    if ((encounter.validateEncounter?.errors?.length ?? 0) > 0) {
      icon = 'error';
      infoClass = 'error';

      tooltip.push(...(encounter.validateEncounter?.errors.map((e) => e.message) ?? []));
    }

    // translate all tooltips and join them with a \n\r
    const tooltips = tooltip.map((t) => this.translate.instant(t)).join('\n\r\n\r');

    return {
      icon,
      tooltip: tooltips,
      infoClass,
    };
  }
}
