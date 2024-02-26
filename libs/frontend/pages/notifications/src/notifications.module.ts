import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OverviewPageComponent } from './pages';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: OverviewPageComponent,
      },
    ]),
  ],
})
export class NotificationsModule {}
