import {
  Directive,
  AfterViewInit,
  ElementRef,
  HostBinding,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Optional,
  PLATFORM_ID,
  Renderer2,
  Self,
  Injector,
  ChangeDetectorRef,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  ControlValueAccessor,
  FormGroupDirective,
  NgControl,
  NgForm,
  Validator,
} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  CanDisable,
  CanUpdateErrorState,
  ErrorStateMatcher,
  mixinDisabled,
  mixinErrorState,
} from '@angular/material/core';
import { MatFormFieldControl } from '@angular/material/form-field';
import { QuillEditorBase, QuillService } from 'ngx-quill';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';

// Boilerplate for applying mixins to _MatQuillBase
class MatQuillBase extends QuillEditorBase {
  stateChanges = new Subject<void>();

  constructor(
    public _defaultErrorStateMatcher: ErrorStateMatcher,
    public _parentForm: NgForm,
    public _parentFormGroup: FormGroupDirective,
    public ngControl: NgControl,
    injector: Injector,
    cdr: ChangeDetectorRef,
    elementRef: ElementRef,
    domSanitizer: DomSanitizer,
    platformId: string,
    renderer: Renderer2,
    zone: NgZone,
    service: QuillService
  ) {
    super(
      injector,
      elementRef,
      cdr,
      domSanitizer,
      platformId,
      renderer,
      zone,
      service
    );
  }
}

const _MatQuillMixinBase = mixinErrorState(mixinDisabled(MatQuillBase));

@Directive()
export abstract class _MatQuillBase
  extends _MatQuillMixinBase
  implements
    CanDisable,
    CanUpdateErrorState,
    ControlValueAccessor,
    MatFormFieldControl<any>,
    OnChanges,
    OnDestroy,
    Validator
{
  static ngAcceptInputType_disabled: boolean | string | null | undefined;
  static ngAcceptInputType_required: boolean | string | null | undefined;

  abstract controlType: string;
  focused = false;
  abstract id: string;
  private contentChangedSubscription: Subscription;
  private blurSubscription: Subscription;
  private focusSubscription: Subscription;

  @Input()
  override disabled = false;

  get empty() {
    return !coerceBooleanProperty(this.value);
  }

  @Input()
  override placeholder!: string;

  @Input()
  override required = false;

  @HostBinding('attr.aria-describedby') _describedBy = '';
  setDescribedByIds(ids: string[]) {
    this._describedBy = ids.join(' ');
  }

  constructor(
    defaultErrorStateMatcher: ErrorStateMatcher,
    @Optional() parentForm: NgForm,
    @Optional() parentFormGroup: FormGroupDirective,
    @Optional() @Self() public override ngControl: NgControl,
    cdr: ChangeDetectorRef,
    elementRef: ElementRef,
    domSanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) platformId: string,
    renderer: Renderer2,
    zone: NgZone,
    injector: Injector,
    service: QuillService
  ) {
    super(
      defaultErrorStateMatcher,
      parentForm,
      parentFormGroup,
      ngControl,
      injector,
      cdr,
      elementRef,
      domSanitizer,
      platformId,
      renderer,
      zone,
      service
    );

    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    this.contentChangedSubscription = this.onContentChanged
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.updateErrorState();
        this.stateChanges.next();
      });

    this.blurSubscription = this.onBlur.subscribe(() => {
      this.focused = false;
      if (!!this.ngControl && !this.ngControl.control?.touched) {
        this.ngControl.control?.markAsTouched();
        this.updateErrorState();
      }
      this.stateChanges.next();
    });

    this.focusSubscription = this.onFocus.subscribe(() => {
      this.focused = true;
      this.stateChanges.next();
    });
  }

  override ngOnDestroy() {
    this.contentChangedSubscription.unsubscribe();
    this.blurSubscription.unsubscribe();
    this.focusSubscription.unsubscribe();
    super.ngOnDestroy();
  }
  /*
   * GETTERS & SETTERS
   */

  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  get value(): any {
    try {
      return this.valueGetter(this.quillEditor, this.editorElem);
    } catch (e) {
      return;
    }
  }
  set value(value: string) {
    this.writeValue(value);
    this.stateChanges.next();
  }

  /*
   * METHODS
   */

  blur() {
    (this.editorElem.childNodes as NodeListOf<HTMLElement>)[0]['blur']();
  }

  focus() {
    this.quillEditor.focus();
  }

  onContainerClick(event: MouseEvent) {
    if (!this.focused) {
      this.quillEditor.focus();
    }
  }
}
