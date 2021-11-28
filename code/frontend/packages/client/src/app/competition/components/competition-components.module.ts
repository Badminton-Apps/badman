import { NgModule } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from 'app/_shared';
import { SelectClubComponent } from './select-club';
import { SelectEventComponent } from './select-event/select-event.component';
import { SelectEncounterComponent } from './select-encounter';
import { SelectTeamComponent } from './select-team'; 
import { MomentModule } from 'ngx-moment';

const materialModules = [
  MatAutocompleteModule,
  MatInputModule,
  MatOptionModule,
  MatSelectModule,
  MomentModule,
];

const components = [
  SelectEncounterComponent,
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
