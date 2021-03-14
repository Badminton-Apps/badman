import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PermissionsComponent } from './pages/permissions/permissions.component';

const routes: Routes = [
  { path: 'user/:id', component: PermissionsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SecurityManagementRoutingModule { }
