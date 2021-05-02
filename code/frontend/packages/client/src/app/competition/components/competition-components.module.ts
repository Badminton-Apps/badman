import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from 'app/_shared';
import { SelectClubComponent } from './select-club';
import { SelectEventComponent } from './select-event/select-event.component';
import { SelectGameComponent } from './select-game';
import { SelectTeamComponent } from './select-team';

const materialModules = [
  MatAutocompleteModule,
  MatFormFieldModule,
  ReactiveFormsModule,
  MatInputModule,
  MatOptionModule,
  MatSelectModule
];

const components = [
  SelectGameComponent,
  SelectTeamComponent,
  SelectClubComponent,
  SelectEventComponent,
];

@NgModule({
  declarations: [...components],
  imports: [SharedModule, ...materialModules],
  exports: [...components],
}) 
export class CompetitionComponentsModule {}
