import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TeamEnrollmentComponent, TeamEnrollmentsComponent } from './pages';
import { AuthGuard } from '@auth0/auth0-angular';

export const ROUTES: Routes = [
  {
    path: '',
    component: TeamEnrollmentsComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: [
          '[:id]_edit:enrollment',
          'edit-any:enrollment',
          '[:id]_view:enrollment',
          'view-any:enrollment',
        ],
      },
    },
  },
  {
    path: 'new',
    component: TeamEnrollmentComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['[:id]_edit:enrollment', 'edit-any:enrollment'],
      },
    },
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(ROUTES)],
})
export class TeamEnrollmentModule {}
