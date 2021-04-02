import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailClubComponent, OverviewClubsComponent } from './pages';

const routes: Routes = [
  {
    path: '',
    component: OverviewClubsComponent,
  },
  {
    path: ':id',
    children: [
      {
        path: '',
        component: DetailClubComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClubRoutingModule {}
