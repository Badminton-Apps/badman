import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SecurityManagementRoutingModule } from './security-management-routing.module';
import { PermissionsComponent } from './pages/permissions/permissions.component';
import { SharedModule } from 'app/_shared';


@NgModule({
  declarations: [PermissionsComponent],
  imports: [
    SharedModule,
    SecurityManagementRoutingModule
  ]
})
export class SecurityManagementModule { }
