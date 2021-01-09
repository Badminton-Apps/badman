import { NgModule } from '@angular/core';
import { CompetitionComponentsModule } from 'app/competition/components';
import { SharedModule } from 'app/_shared';
import { TeamAssemblyComponent } from './pages';
import { AssemblyComponent } from './pages/team-assembly/components/assembly/assembly.component';
import { TeamAssemblyRoutingModule } from './team-assembly-routing.module';

const materialModules = [];

@NgModule({
  declarations: [TeamAssemblyComponent, AssemblyComponent],
  imports: [
    SharedModule,
    ...materialModules,
    TeamAssemblyRoutingModule,
    CompetitionComponentsModule,
  ],
})
export class TeamAssemblyModule {}
