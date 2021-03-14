import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { AddClubComponent, EditClubComponent } from './pages';
import { AddRoleComponent } from './pages/add-role/add-role.component';
import { AddTeamComponent } from './pages/add-team/add-team.component';
import { EditRoleComponent } from './pages/edit-role/edit-role.component';
import { EditTeamComponent } from './pages/edit-team/edit-team.component';

const routes: Routes = [
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
    path: ':id/edit',
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['edit:club', 'edit:teams', ''],
      },
    },
    children: [
      {
        path: 'team',
        children: [
          { path: 'add', component: AddTeamComponent },
          { path: ':teamId', component: EditTeamComponent },
        ],
      },
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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClubManagementRoutingModule {}
