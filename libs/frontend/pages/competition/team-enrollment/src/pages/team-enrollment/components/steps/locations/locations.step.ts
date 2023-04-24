import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'badman-locations-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locations.step.html',
  styleUrls: ['./locations.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsStepComponent implements OnInit {
  @Input()
  group!: FormGroup;

  @Input()
  value?: FormArray

  ngOnInit() {
    // if (this.group) {
    //   this.value = this.group?.get('location') as FormControl<string>;
    // }

    // if (!this.value) {
    //   this.value = new FormControl<string | undefined>(undefined);
    // }

    // if (this.group) {
    //   this.group.addControl('club', this.value);
    // }


    console.log(this.group);
  }
}
