import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';
import { DetailClubComponent, OverviewClubsComponent } from './pages';
import { AddClubComponent } from './pages/add-club/add-club.component';
import { AddRoleComponent } from './pages/add-role';
import { EditClubComponent } from './pages/edit-club';
import { EditRoleComponent } from './pages/edit-role';

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
