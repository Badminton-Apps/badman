import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ClaimService } from '@badman/frontend-auth';
import { Club } from '@badman/frontend-models';
import { UseForTeamName } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  skip,
} from 'rxjs/operators';

@Component({
  selector: 'badman-club-fields',
  templateUrl: './club-fields.component.html',
  styleUrls: ['./club-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormsModule,

    // Other modules
    MatInputModule,
    MatOptionModule,
    MatSelectModule,

    // My Modules
  ],
})
export class ClubFieldsComponent implements OnInit {
  @Input()
  club: Club = {} as Club;

  @Output() save = new EventEmitter<Club>();

  clubForm!: FormGroup;

  exampleTeamName?: string;

  constructor(private claimService: ClaimService) {}

  ngOnInit() {
    const nameControl = new FormControl(this.club.name, Validators.required);
    const fullNameControl = new FormControl(this.club.fullName);
    const clubIdControl = new FormControl(
      this.club.clubId,
      Validators.required
    );
    const abbrControl = new FormControl(
      this.club.abbreviation,
      Validators.required
    );
    const useForTeamNameControl = new FormControl(
      this.club.useForTeamName ?? 'name',
      Validators.required
    );

    this.clubForm = new FormGroup({
      name: nameControl,
      fullName: fullNameControl,
      abbreviation: abbrControl,
      useForTeamName: useForTeamNameControl,
      clubId: clubIdControl,
    });

    this.clubForm.disable();
    this.claimService.hasAnyClaims$(['edit-any:club']).subscribe((r) => {
      if (r) {
        this.clubForm.enable();
      }
    });

    this.clubForm.valueChanges.subscribe(() => this._setExampleTeamName());

    nameControl.valueChanges.subscribe((r) => {
      if (!abbrControl.touched) {
        const matches = r?.match(/\b(\w)/g);
        abbrControl.setValue(matches?.join(''));
      }
    });

    this.clubForm.valueChanges
      .pipe(
        debounceTime(600),
        filter(() => this.clubForm.valid),
        map(
          () => ({ id: this.club.id, ...this.clubForm.value } as Partial<Club>)
        ),
        distinctUntilChanged(),
        skip(1)
      )
      .subscribe((value) => {
        this.save.next(value);
      });

    this._setExampleTeamName();
  }

  private _setExampleTeamName() {
    switch (this.clubForm.value.useForTeamName) {
      case UseForTeamName.FULL_NAME:
        this.exampleTeamName = `${this.clubForm.value.fullName ?? ''} 1G`;
        break;
      case UseForTeamName.ABBREVIATION:
        this.exampleTeamName = `${this.clubForm.value.abbreviation ?? ''} 1G`;
        break;

      default:
      case UseForTeamName.NAME:
        this.exampleTeamName = `${this.clubForm.value.name ?? ''} 1G`;
        break;
    }
  }
}
