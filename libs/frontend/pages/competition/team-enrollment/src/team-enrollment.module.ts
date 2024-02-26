import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';
import { TeamEnrollmentComponent } from './pages';

export const ROUTES: Routes = [
  {
    path: '',
    component: TeamEnrollmentComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['[:id]_edit:enrollment-competition', 'edit-any:enrollment-competition'],
      },
    },
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(ROUTES)],
})
export class TeamEnrollmentModule {}
