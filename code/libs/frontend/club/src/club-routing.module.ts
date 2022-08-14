import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';
import {
  AddClubComponent,
  AddRoleComponent,
  DetailClubComponent,
  EditClubComponent,
  EditRoleComponent,
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
      },
      {
        path: 'edit',
        canActivate: [AuthGuard],
        data: {
          claims: {
            any: ['[:id]_edit:club', 'edit-any:club'],
          },
        },
        children: [
          {
            path: 'role',
            children: [
              { path: 'add', component: AddRoleComponent },
              { path: ':roleId', component: EditRoleComponent },
            ],
          },
          {
            path: '',
            component: EditClubComponent,
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClubRoutingModule {}
