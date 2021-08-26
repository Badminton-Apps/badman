import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompetitionComponentsModule } from 'app/competition/components';
import { SharedModule } from 'app/_shared';
import { TeamAssemblyComponent } from './pages';
import { AssemblyComponent } from './pages/team-assembly/components/assembly/assembly.component';
import { TeamAssemblyPlayerComponent } from './pages/team-assembly/components/team-assembly-player/team-assembly-player.component';
import { TeamAssemblyRoutingModule } from './team-assembly-routing.module';

const materialModules = [
  MatAutocompleteModule,
  MatFormFieldModule,
  ReactiveFormsModule,
  MatInputModule,
  MatDatepickerModule,
  MatMomentDateModule,
  MatButtonModule,
  DragDropModule,
  MatDividerModule,
  MatTooltipModule,
  MatProgressBarModule,
  MatIconModule
];

@NgModule({
  declarations: [TeamAssemblyComponent, AssemblyComponent, TeamAssemblyPlayerComponent],
  imports: [SharedModule, ...materialModules, TeamAssemblyRoutingModule, CompetitionComponentsModule],
  providers: [{ provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } }],
})
export class TeamAssemblyModule {}
