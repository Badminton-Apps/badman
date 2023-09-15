import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CanChangeEncounterGuard } from './guards/change-encounter.guard';
import { ChangeEncounterComponent } from './pages';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        pathMatch: 'full',
        component: ChangeEncounterComponent,
        canActivate: [CanChangeEncounterGuard],
        data: {
          claims: {
            any: ['*_change:encounter', 'change-any:encounter'],
          },
        },
      },
    ]),
  ],
})
export class ChangeEncounterModule {}
