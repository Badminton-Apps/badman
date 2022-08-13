import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  SelctionComponentsModule,
  SharedModule,
} from '@badman/frontend/shared';
import { TeamAssemblyComponent } from './pages';
import { AssemblyComponent } from './pages/team-assembly/components/assembly/assembly.component';
import { TeamAssemblyPlayerComponent } from './pages/team-assembly/components/team-assembly-player/team-assembly-player.component';
import { TeamAssemblyRoutingModule } from './team-assembly-routing.module';

const materialModules = [
  MatAutocompleteModule,
  MatInputModule,
  MatButtonModule,
  DragDropModule,
  MatDividerModule,
  MatTooltipModule,
  MatProgressBarModule,
  MatIconModule,
];

@NgModule({
  declarations: [
    TeamAssemblyComponent,
    AssemblyComponent,
    TeamAssemblyPlayerComponent,
  ],
  imports: [
    SharedModule,
    ...materialModules,
    TeamAssemblyRoutingModule,
    SelctionComponentsModule,
  ],
})
export class TeamAssemblyModule {}
