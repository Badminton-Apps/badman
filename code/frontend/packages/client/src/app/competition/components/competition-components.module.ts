import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SelectClubComponent } from './select-club';
import { SelectEventComponent } from './select-event/select-event.component';
import { SelectGameComponent } from './select-game';
import { SelectTeamComponent } from './select-team';

const materialModules = [
  MatAutocompleteModule,
  MatFormFieldModule,
  ReactiveFormsModule,
  MatInputModule,
  MatOptionModule
];

const components = [
  SelectGameComponent,
  SelectTeamComponent,
  SelectClubComponent,
  SelectEventComponent,
];

@NgModule({
  declarations: [...components],
  imports: [CommonModule, ...materialModules],
  exports: [...components],
}) 
export class CompetitionComponentsModule {}
