import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditSettingsComponent } from './pages';
import { NotificationRoutingModule } from './notification-routing.module';
import { GraphQLModule } from '@badman/frontend-graphql';
import { HasClaimModule } from '@badman/frontend-authentication';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  imports: [
    CommonModule,

    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatOptionModule,
    MatSelectModule,
    MatButtonModule,
    FlexLayoutModule,

    NotificationRoutingModule,
    GraphQLModule,
    HasClaimModule,
    TranslateModule,
  ],
  declarations: [EditSettingsComponent],
})
export class NotificationsModule {}
