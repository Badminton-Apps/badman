import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MatMomentDateModule,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CompetitionComponentsModule } from 'app/competition/components';
import { SharedModule } from 'app/_shared';
import { TeamAssemblyComponent } from './pages';
import { AssemblyComponent } from './pages/team-assembly/components/assembly/assembly.component';
import { TeamAssemblyRoutingModule } from './team-assembly-routing.module';

const materialModules = [
  MatAutocompleteModule,
  MatFormFieldModule,
  ReactiveFormsModule,
  MatInputModule,
  MatDatepickerModule,
  MatMomentDateModule,
];

@NgModule({
  declarations: [TeamAssemblyComponent, AssemblyComponent],
  imports: [
    SharedModule,
    ...materialModules,
    TeamAssemblyRoutingModule,
    CompetitionComponentsModule,
  ],
  providers: [
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
  ],
})
export class TeamAssemblyModule {}
