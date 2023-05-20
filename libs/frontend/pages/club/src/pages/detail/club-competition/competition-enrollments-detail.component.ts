import {
  Directive,
  HostBinding,
  HostListener,
  Input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { SubEventCompetition } from '@badman/frontend-models';

@Directive({
  selector: '[badmanEnrollmentDetailRow]',
  standalone: true,
})
export class EnrollmentDetailRowDirective {
  private row?: SubEventCompetition;
  private tRef?: TemplateRef<SubEventCompetition>;
  private opened = false;

  @HostBinding('class.expanded')
  get expended(): boolean {
    return this.opened;
  }

  @Input()
  set badmanEnrollmentDetailRow(value: SubEventCompetition) {
    if (value !== this.row) {
      this.row = value;
    }
  }

  @Input()
  set badmanEnrollmentDetailRowTpl(value: TemplateRef<SubEventCompetition>) {
    if (value !== this.tRef) {
      this.tRef = value;
    }
  }

  constructor(public vcRef: ViewContainerRef) {}

  @HostListener('click')
  onClick(): void {
    this.toggle();
  }

  toggle(): void {
    if (this.opened) {
      this.vcRef.clear();
    } else {
      this.render();
    }
    this.opened = this.vcRef.length > 0;
  }

  private render(): void {
    this.vcRef.clear();
    if (this.tRef && this.row) {
      this.vcRef.createEmbeddedView(this.tRef, {
        $implicit: this.row,
      } as SubEventCompetition);
    }
  }
}
