import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { EditEventCompetitionComponent } from './pages/edit-competition-event';
import { ImportComponent } from './pages/import/import.component';

const routes: Routes = [
  {
    path: 'import',
    component: ImportComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['import:competition', 'import:tournament'],
      },
    },
  },
  {
    path: 'competition',
    children: [
      {
        path: ':id/edit',
        children: [
          {
            path: '',
            component: EditEventCompetitionComponent,
          },
        ],
        canActivate: [AuthGuard],
        data: {
          claims: {
            any: 'edit:competition',
          },
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventManagementRoutingModule {}
