import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input } from '@angular/core';
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
import {
  HasClaimComponent,
  SelectCountryComponent,
  SelectCountrystateComponent,
} from '@badman/frontend-components';
import { UseForTeamName } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';

type ClubFieldsForm = FormGroup<{
  name: FormControl<string>;
  clubId: FormControl<string>;
  fullName: FormControl<string>;
  abbreviation: FormControl<string>;
  useForTeamName: FormControl<UseForTeamName>;
  country: FormControl<string>;
  subdivision: FormControl<string>;
}>;

@Component({
  selector: 'badman-club-fields',
  templateUrl: './club-fields.component.html',
  styleUrls: ['./club-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormsModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    HasClaimComponent,
    SelectCountryComponent,
    SelectCountrystateComponent,
  ],
})
export class ClubFieldsComponent implements OnInit {
  private readonly claimService = inject(ClaimService);

  group = input.required<FormGroup>();

  controlName = input('country');

  control = input<ClubFieldsForm>(
    (this.group().get(this.controlName()) ??
      new FormGroup({
        name: new FormControl('', Validators.required),
        clubId: new FormControl('', Validators.required),
        fullName: new FormControl('', Validators.required),
        abbreviation: new FormControl('', Validators.required),
        useForTeamName: new FormControl(UseForTeamName.NAME, Validators.required),
        country: new FormControl('', Validators.required),
        subdivision: new FormControl('', Validators.required),
      })) as ClubFieldsForm,
  );

  exampleTeamName?: string;
  

  canEditAnyClub = computed(() => this.claimService.hasAnyClaims(['edit-any:club']));


  ngOnInit() {
    if (this.group() && !this.group().get(this.controlName())) {
      this.group().addControl(this.controlName(), this.control());
    }

    effect(() => {
      this.group().disable();
      if (this.canEditAnyClub()) {
        this.group().enable();
      }
    })

    this.group().valueChanges.subscribe(() => this._setExampleTeamName());

    this.group()
      .get('name')
      ?.valueChanges.subscribe((r) => {
        if (!this.group().get('abbreviation')?.touched) {
          const matches = r?.match(/\b(\w)/g);
          this.group().get('abbreviation')?.setValue(matches?.join(''));
        }
      });

    this._setExampleTeamName();
  }

  private _setExampleTeamName() {
    switch (this.group().value.useForTeamName) {
      case UseForTeamName.FULL_NAME:
        this.exampleTeamName = `${this.group().value.fullName ?? ''} 1G`;
        break;
      case UseForTeamName.ABBREVIATION:
        this.exampleTeamName = `${this.group().value.abbreviation ?? ''} 1G`;
        break;

      default:
      case UseForTeamName.NAME:
        this.exampleTeamName = `${this.group().value.name ?? ''} 1G`;
        break;
    }
  }
}
