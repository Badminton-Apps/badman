import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TeamEnrollmentComponent } from './pages';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', pathMatch: 'full', component: TeamEnrollmentComponent },
    ]),
  ],
})
export class TeamEnrollmentModule {}
