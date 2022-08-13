import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerSearchComponent } from './components';
import { MatOptionModule } from '@angular/material/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TranslateModule } from '@ngx-translate/core';
import { MatInputModule } from '@angular/material/input';

@NgModule({
  declarations: [PlayerSearchComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatInputModule,
    TranslateModule,
  ],
  exports: [PlayerSearchComponent],
})
export class PlayerSearchModule {}
