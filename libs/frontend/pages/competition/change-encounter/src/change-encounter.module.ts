import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ChangeEncounterComponent } from './pages';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', pathMatch: 'full', component: ChangeEncounterComponent },
    ]),
  ],
})
export class ChangeEncounterModule {}
