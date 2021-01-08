import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-select-game',
  templateUrl: './select-game.component.html',
  styleUrls: ['./select-game.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectGameComponent implements OnInit {
  @Input()
  formGroup: FormGroup;
  formControl = new FormControl();
  options: string[] = ['One', 'Two', 'Three'];
  filteredOptions: Observable<string[]>;

  ngOnInit() {
    this.formControl.disable();
    this.formGroup.addControl('game', this.formControl);

    this.formGroup.get('team').valueChanges.subscribe((r) => {
      if (r != null) {
        this.formControl.enable();
      } else if (this.formControl.enabled) {
        this.formControl.disable();
      }
    });

    this.filteredOptions = this.formControl.valueChanges.pipe(
      filter((r) => r),
      startWith(''),
      map((value) => this._filter(value))
    );
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.options.filter(
      (option) => option.toLowerCase().indexOf(filterValue) === 0
    );
  }
}
