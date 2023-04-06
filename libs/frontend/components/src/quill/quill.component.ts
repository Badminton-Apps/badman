import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, HostBinding
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatFormFieldControl,
  MatFormFieldModule
} from '@angular/material/form-field';
import { QuillModule } from 'ngx-quill';
import { _MatQuillBase } from './quill.base';

// Increasing integer for generating unique ids for mat-quill components.
let nextUniqueId = 0;

const SELECTOR = 'badman-quill';

@Component({
  selector: SELECTOR,
  exportAs: 'quill',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    // Core modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    QuillModule,
    MatFormFieldModule,
  ],
  templateUrl: './quill.component.html',
  styleUrls: ['./quill.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: QuillComponent }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuillComponent extends _MatQuillBase {
  static override ngAcceptInputType_disabled:
    | boolean
    | string
    | null
    | undefined;
  static override ngAcceptInputType_required:
    | boolean
    | string
    | null
    | undefined;

  controlType = SELECTOR;
  @HostBinding() id = `${SELECTOR}-${nextUniqueId++}`;
}
