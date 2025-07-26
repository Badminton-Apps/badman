import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { PageHeaderComponent } from '@badman/frontend-components';
import { MtxGridColumn, MtxGridModule } from '@ng-matero/extensions/grid';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'badman-ranking-overview',
    templateUrl: './overview.page.html',
    styleUrls: ['./overview.page.scss'],
    imports: [
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        TranslatePipe,
        MtxGridModule,
        PageHeaderComponent,
    ]
})
export class OverviewPageComponent {
  columns: MtxGridColumn[] = [
    { header: 'Name', field: 'name' },
    {
      header: 'Weight',
      field: 'weight',
      type: 'number',
      typeParameter: {
        digitsInfo: '1.2-2',
      },
    },
    { header: 'Gender', field: 'gender' },
    { header: 'Mobile', field: 'mobile' },
    { header: 'City', field: 'city' },
    {
      header: 'Date',
      field: 'date',
      type: 'date',
      typeParameter: {
        format: 'yyyy-MM-dd',
      },
    },
  ];

  list = EXAMPLE_DATA;
}

export const EXAMPLE_DATA = [
  {
    position: 1,
    name: 'Boron',
    tag: [{ color: 'red', value: [1, 2] }],
    weight: 10.811,
    symbol: 'B',
    gender: 'male',
    mobile: '13198765432',
    tele: '567891234',
    city: 'Berlin',
    address: 'Bernauer Str.111,13355',
    date: '1423456765768',
    website: 'www.matero.com',
    company: 'matero',
    email: 'Boron@gmail.com',
    status: false,
    cost: 4,
  },
  {
    position: 2,
    name: 'Helium',
    tag: [{ color: 'blue', value: [3, 4] }],
    weight: 8.0026,
    symbol: 'He',
    gender: 'female',
    mobile: '13034676675',
    tele: '80675432',
    city: 'Shanghai',
    address: '88 Songshan Road',
    date: '1423456765768',
    website: 'www.matero.com',
    company: 'matero',
    email: 'Helium@gmail.com',
    status: true,
    cost: 5,
  },
  {
    position: 3,
    name: 'Nitrogen',
    tag: [{ color: 'yellow', value: [5, 6] }],
    weight: 14.0067,
    symbol: 'N',
    gender: 'male',
    mobile: '15811112222',
    tele: '345678912',
    city: 'Sydney',
    address: 'Circular Quay, Sydney NSW 2000',
    date: '1423456765768',
    website: 'www.matero.com',
    company: 'matero',
    email: 'Nitrogen@gmail.com',
    status: true,
    cost: 2,
  },
];
