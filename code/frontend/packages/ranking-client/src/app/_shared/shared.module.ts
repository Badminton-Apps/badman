import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  LanguageComponent,
  NotificationComponent,
  PlayerSearchComponent,
  RankingShellComponent,
  UserInfoComponent,
} from './components';
import { BetaComponent } from './components/beta/beta.component';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { AuthInterceptor } from './interceptors';
import { EnumToArrayPipe, LevelToLetterPipe, LoadingPipe } from './pipes';
import { ClaimComponent } from './components/claim/claim.component';
import { HasClaimComponent } from './components/security/has-claim/has-claim.component';

const materialModules = [
  MatAutocompleteModule,
  MatBadgeModule,
  MatButtonModule,
  MatFormFieldModule,
  MatIconModule,
  MatListModule,
  MatMenuModule,
  MatSidenavModule,
  MatToolbarModule,
  MatSelectModule,
  MatExpansionModule,
  MatDialogModule,
  MatSlideToggleModule,
];

const exportedComponents = [
  TranslateModule,
  CommonModule,
  LoadingPipe,
  LevelToLetterPipe,
  EnumToArrayPipe,
  BetaComponent,
  PlayerSearchComponent,
  ClaimComponent,
  HasClaimComponent,
];

@NgModule({
  declarations: [
    RankingShellComponent,
    PlayerSearchComponent,
    UserInfoComponent,
    NotificationComponent,
    LoadingPipe,
    LevelToLetterPipe,
    LanguageComponent,
    EnumToArrayPipe,
    ConfirmationDialogComponent,
    BetaComponent,
    ClaimComponent,
    HasClaimComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule.forChild(),
    ...materialModules,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  exports: [...exportedComponents],
})
export class SharedModule {}
