import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'badman-filter-players',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div [formGroup]="formGroup">
      <label for="firstName">First Name</label>
      <input type="text" id="firstName" formControlName="firstName" />
      <label for="lastName">Last Name</label>
      <input type="text" id="lastName" formControlName="lastName" />
    </div>
  `,
})
export default class FilterPlayersComponent {
  @Input({ required: true })
  formGroup!: FormGroup;
}
