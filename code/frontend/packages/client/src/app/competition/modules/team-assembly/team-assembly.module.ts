import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
  SelectClubComponent,
  SelectGameComponent,
  SelectTeamComponent,
  TeamAssemblyComponent,
} from './pages';
import { TeamAssemblyRoutingModule } from './team-assembly-routing.module';
import { SharedModule } from 'app/_shared';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { AssemblyComponent } from './pages/team-assembly/components/assembly/assembly.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatMomentDateModule,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';

const materialModules = [
  MatAutocompleteModule,
  MatFormFieldModule,
  ReactiveFormsModule,
  MatInputModule,
  MatDatepickerModule,
  MatMomentDateModule,
];

@NgModule({
  declarations: [
    TeamAssemblyComponent,
    SelectClubComponent,
    SelectTeamComponent,
    SelectGameComponent,
    AssemblyComponent,
  ],
  imports: [SharedModule, ...materialModules, TeamAssemblyRoutingModule],
  providers: [
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
  ],
})
export class TeamAssemblyModule {}
