import { Component, Signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { PageHeaderComponent } from '@badman/frontend-components';
import { Club } from '@badman/frontend-models';
import { ClubMembershipType } from '@badman/utils';
import { MtxGrid, MtxGridColumn } from '@ng-matero/extensions/grid';
import { MtxSelect } from '@ng-matero/extensions/select';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { TransferService } from '../../services/transfer.service';
import { MatInput } from '@angular/material/input';

@Component({
  selector: 'badman-ranking-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  standalone: true,
  imports: [
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
    PageHeaderComponent,
    TranslateModule,
  ],
})
export class OverviewPageComponent {
  // injects
  service = inject(TransferService);

  transfers = this.service.state.transfers;
  loaded = this.service.state.loaded;

  currentClubs = computed(
    () =>
      this.transfers()?.map((r) => r.player?.clubs?.find((r: Club) => r.clubMembership?.active)) ??
      [],
  ) as Signal<Club[]>;

  columns: MtxGridColumn[] = [
    { header: 'Name', field: 'player.fullName', sortable: true },
    { header: 'New club', field: 'club.name', sortable: true },
    {
      header: 'Current club',
      field: 'nothing',
      formatter: (data) => data.player.clubs?.find((r: Club) => r.clubMembership?.active).name,
      sortable: true,
    },
    {
      header: 'Membership type',
      field: 'membershipType',
      formatter: (data) => {
        switch (data.membershipType) {
          case ClubMembershipType.NORMAL:
            return 'Transfer';
          case ClubMembershipType.LOAN:
            return 'Uitlening';
          default:
            return 'Unknown';
        }
      },
      sortable: true,
    },
    {
      header: 'Start',
      field: 'start',
      formatter: (data) => moment(data.start).format('YYYY-MM-DD HH:mm:ss'),
      sortable: true,
    },
    {
      header: 'End',
      field: 'end',
      formatter: (data) => (data.end ? moment(data.end).format('YYYY-MM-DD HH:mm:ss') : '--'),
      sortable: true,
    },
    {
      header: 'Operation',
      field: 'operation',
      width: '180px',
      pinned: 'right',
      right: '0px',
      type: 'button',
      buttons: [
        {
          type: 'icon',
          text: 'accept',
          icon: 'check',
          tooltip: 'accept',
          click: () => alert('accept'),
        },
        {
          type: 'icon',
          text: 'reject',
          icon: 'close',
          tooltip: 'reject',
          click: () => alert('reject'),
        },
      ],
    },
  ];
}
