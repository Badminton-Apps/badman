import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from 'app/_shared';
import { ClubService } from 'app/_shared/services';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-select-club',
  templateUrl: './select-club.component.html',
  styleUrls: ['./select-club.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectClubComponent implements OnInit {
  @Input()
  formGroup: FormGroup;
  formControl = new FormControl();
  options: Club[];
  filteredOptions: Observable<Club[]>;

  constructor(private clubService: ClubService) {}

  async ngOnInit() {
    this.formGroup.addControl('club', this.formControl);

    // TODO: Convert to observable way
    this.options = await this.clubService
      .getClubs(100, null, "")
      .pipe(
        map((data) => {
          const count = data.clubs?.total || 0;
          if (count) {
            return data.clubs.edges.map((x) => x.node);
          } else {
            return [];
          }
        })
      )
      .toPromise();
    this.filteredOptions = this.formControl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value))
    );
  }

  private _filter(value: string | Club): Club[] {
    // when selected the filter is with the selected object
    if (typeof value === 'string') {
      const filterValue = value.toLowerCase();

      return this.options.filter(
        (option) => option.name.toLowerCase().indexOf(filterValue) === 0
      );
    }
  }

  getOptionText(option) {
    return option?.name;
  }
}
