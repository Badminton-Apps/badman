import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TeamModule } from '@badman/frontend-team';
import { CompetitionComponentsModule } from '@badman/frontend-competition';
import { SharedModule } from '@badman/frontend-shared';
import { ClubRoutingModule } from './club-routing.module';
import { ClubFieldsComponent, RoleFieldsComponent } from './components';
import { NgMapsPlacesModule } from '@ng-maps/places';
import {
  AddPlayerComponent,
  LocationDialogComponent,
  LocationFieldsComponent,
} from './dialogs';
import {
  AddClubComponent,
  AddRoleComponent,
  ClubEditLocationComponent,
  ClubEditRoleComponent,
  ClubEditTeamComponent,
  DetailClubComponent,
  EditClubComponent,
  EditRoleComponent,
  OverviewClubsComponent,
  TeamOverviewComponent,
} from './pages';
import { PlayerSearchModule } from '@badman/frontend-components-player-search';

const materialModules = [
  MatButtonModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSortModule,
  MatTableModule,
  MatIconModule,
  MatTabsModule,
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatOptionModule,
  MatSelectModule,
  MatTooltipModule,
  MatSnackBarModule,

  // AgmCoreModule,
  NgMapsPlacesModule,
];

const ownModules = [PlayerSearchModule];

@NgModule({
  declarations: [
    OverviewClubsComponent,
    DetailClubComponent,
    TeamOverviewComponent,

    LocationDialogComponent,
    LocationFieldsComponent,

    AddClubComponent,
    EditClubComponent,
    EditRoleComponent,
    ClubFieldsComponent,
    RoleFieldsComponent,
    AddPlayerComponent,
    AddRoleComponent,
    ClubEditRoleComponent,
    ClubEditLocationComponent,
    ClubEditTeamComponent,
  ],

  imports: [
    SharedModule,
    ...materialModules,
    ...ownModules,
    CompetitionComponentsModule,
    ClubRoutingModule,
    TeamModule,
  ],
})
export class ClubModule {}
