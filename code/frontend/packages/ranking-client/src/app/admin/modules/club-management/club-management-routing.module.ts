import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import {
  AddClubComponent,
  DetailClubComponent,
  EditClubComponent,
  OverviewClubsComponent,
} from './pages';

const routes: Routes = [
  {
    path: '',
    component: OverviewClubsComponent,
  },
  {
    path: 'add',
    component: AddClubComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        all: 'add:club',
      },
    },
  },
  {
    path: ':id',
    children: [
      {
        path: '',
        component: DetailClubComponent,
        canActivate: [AuthGuard],
        data: {
          claims: {
            all: 'view:club',
          },
        },
      },
      {
        path: 'edit',
        component: EditClubComponent,
        canActivate: [AuthGuard],
        data: {
          claims: {
            all: 'edit:club',
          },
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClubManagementRoutingModule {}
