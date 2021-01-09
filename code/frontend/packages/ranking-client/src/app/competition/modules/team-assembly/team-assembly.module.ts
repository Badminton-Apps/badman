import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
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

const materialModules = [
  MatAutocompleteModule,
  MatFormFieldModule,
  ReactiveFormsModule,
  MatInputModule 
];

@NgModule({
  declarations: [
    TeamAssemblyComponent,
    SelectTeamComponent,
    SelectGameComponent,
    AssemblyComponent,
  ],
  imports: [SharedModule, ...materialModules, TeamAssemblyRoutingModule],
})
export class TeamAssemblyModule {}
