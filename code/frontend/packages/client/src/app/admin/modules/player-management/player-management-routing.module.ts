import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditPlayerComponent, LinkAccountComponent } from './pages';

const routes: Routes = [
  {
    path: ':id/edit',
    component: EditPlayerComponent,
  },
  {
    path: 'link-accounts',
    component: LinkAccountComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlayerManagementRoutingModule {}
