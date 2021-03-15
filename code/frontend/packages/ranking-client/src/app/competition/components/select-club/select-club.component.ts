import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from 'app/_shared';
import { AuthService, ClubService } from 'app/_shared/services';
import { Observable } from 'rxjs';
import { filter, map, startWith, switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-select-club',
  templateUrl: './select-club.component.html',
  styleUrls: ['./select-club.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectClubComponent implements OnInit {
  @Input()
  formGroup: FormGroup;

  @Input()
  requiredPermission: string[];

  formControl = new FormControl();
  options: Club[];
  filteredOptions: Observable<Club[]>;

  constructor(
    private clubService: ClubService,
    private authSerice: AuthService
  ) {}

  async ngOnInit() {
    this.formGroup.addControl('club', this.formControl);

    // Get all where the user has rights
    this.options = await this.authSerice.userPermissions$
      .pipe(
        take(1),
        map((r) => r.filter((x) => x.indexOf('enlist:team') != -1)),
        map((r) => r.map((c) => c.replace('_enlist:team', ''))),
        switchMap((ids) => this.clubService.getClubs({ ids, first: 999 })),
        map((data) => {
          const count = data.clubs?.total || 0;
          if (count) {
            return data.clubs.edges.map((x) => new Club(x.node));
          } else {
            return [];
          }
        })
      )
      .toPromise();

      // When we have exactly 1 club, we might as well set it
    if (this.options.length == 1) {
      this.formControl.setValue(this.options[0]);
      this.formControl.disable();
    }

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
