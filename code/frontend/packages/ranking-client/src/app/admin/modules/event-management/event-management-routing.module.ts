import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditEventCompetitionComponent } from './pages/edit-competition-event';
import { ImportComponent } from './pages/import/import.component';

const routes: Routes = [
  { path: 'import', component: ImportComponent },
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
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventManagementRoutingModule {}
