import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TeamEnrollmentComponent } from './pages';
import { AuthGuard } from '@auth0/auth0-angular';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        pathMatch: 'full',
        component: TeamEnrollmentComponent,
        canActivate: [AuthGuard],
        data: {
          claims: {
            any: ['[:id]_edit:club', 'edit-any:club'],
          },
        },
      },
    ]),
  ],
})
export class TeamEnrollmentModule {}
