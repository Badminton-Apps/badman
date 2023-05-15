import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';

@Component({
  selector: 'badman-competition-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,

    TranslateModule,
    ReactiveFormsModule,
    MomentModule,
    HasClaimComponent,

    // Material Modules
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatSelectModule,

    // Own components
    PageHeaderComponent,
  ],
})
export class OverviewPageComponent {}
