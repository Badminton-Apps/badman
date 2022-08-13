import { NgModule } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SelectClubComponent } from './select-club';
import { SelectEventComponent } from './select-event/select-event.component';
import { SelectEncounterComponent } from './select-encounter';
import { SelectTeamComponent } from './select-team';
import { SelectPlayerComponent } from './select-player/select-player.component';
import { SharedModule } from '../../shared.module';

const materialModules = [
  MatAutocompleteModule,
  MatInputModule,
  MatOptionModule,
  MatSelectModule,
];

const components = [
  SelectEncounterComponent,
  SelectTeamComponent,
  SelectClubComponent,
  SelectEventComponent,
  SelectPlayerComponent,
];

@NgModule({
  declarations: [...components, SelectPlayerComponent],
  imports: [SharedModule, ...materialModules],
  exports: [...components],
})
export class SelctionComponentsModule {}
