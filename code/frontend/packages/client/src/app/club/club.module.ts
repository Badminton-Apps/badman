import { MatGoogleMapsAutocompleteModule } from '@angular-material-extensions/google-maps-autocomplete';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SharedModule } from 'app/_shared';
import { ClubRoutingModule } from './club-routing.module';
import { TeamDialogComponent, TeamFieldsComponent, TeamPlayersComponent } from './dialogs';
import { LocationFieldsComponent } from './dialogs/location-dialog/components/location-fields/location-fields.component';
import { LocationDialogComponent } from './dialogs/location-dialog/location-dialog.component';
import { DetailClubComponent, OverviewClubsComponent } from './pages';
import { TeamOverviewComponent } from './pages/detail-club/components/team-overview/team-overview.component';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSortModule,
  MatTableModule,
  ReactiveFormsModule,
  MatIconModule,
  MatTabsModule,
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatOptionModule,
  MatSelectModule,
  MatTooltipModule,

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
  ],

  imports: [SharedModule, ...materialModules, ClubRoutingModule],
})
export class ClubModule {}
