import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { AddClubComponent, EditClubComponent } from './pages';
import { AddRoleComponent } from './pages/add-role/add-role.component';
import { EditRoleComponent } from './pages/edit-role/edit-role.component';

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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClubManagementRoutingModule {}
