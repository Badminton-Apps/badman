import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { CreatePageComponent } from './pages';

const MODULE_ROUTES: Routes = [
  {
    path: '',
    component: CreatePageComponent,
    data: { breadcrumb: { skip: true } },
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
})
export class AssemblyModule {}
