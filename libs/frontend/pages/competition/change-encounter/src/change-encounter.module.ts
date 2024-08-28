import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthGuard } from '@badman/frontend-auth';
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
        canActivate: [AuthGuard],
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
