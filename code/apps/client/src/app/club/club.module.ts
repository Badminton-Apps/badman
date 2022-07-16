import { MatGoogleMapsAutocompleteModule } from '@angular-material-extensions/google-maps-autocomplete';
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
import { CompetitionComponentsModule } from '../competition/components';
import { SharedModule } from '../_shared';
import { ClubRoutingModule } from './club-routing.module';
import { ClubFieldsComponent, RoleFieldsComponent } from './components';
import {
  AddPlayerComponent,
  LocationDialogComponent,
  LocationFieldsComponent,
  TeamDialogComponent,
  TeamFieldsComponent,
  TeamPlayersComponent,
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
  MatGoogleMapsAutocompleteModule,
];

@NgModule({
  declarations: [
    OverviewClubsComponent,
    DetailClubComponent,
    TeamOverviewComponent,

    LocationDialogComponent,
    LocationFieldsComponent,

    TeamDialogComponent,
    TeamFieldsComponent,
    TeamPlayersComponent,

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
    CompetitionComponentsModule,
    ClubRoutingModule,
  ],
})
export class ClubModule {}
