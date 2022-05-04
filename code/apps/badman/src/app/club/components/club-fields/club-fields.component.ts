import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { ClaimService, Club, UseForTeamName } from '../../../_shared';

@Component({
  selector: 'badman-club-fields',
  templateUrl: './club-fields.component.html',
  styleUrls: ['./club-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      this.club.useForTeamName,
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
        const matches = r.match(/\b(\w)/g);
        abbrControl.setValue(matches.join(''));
      }
    });

    this.clubForm.valueChanges.pipe(debounceTime(600)).subscribe((r) => {
      if (this.clubForm.valid) {
        this.save.next({ id: this.club.id, ...this.clubForm.value });
      }
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
