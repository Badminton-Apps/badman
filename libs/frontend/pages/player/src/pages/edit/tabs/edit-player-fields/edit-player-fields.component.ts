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
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClaimService } from '@badman/frontend-auth';
import { HasClaimComponent } from '@badman/frontend-components';
import { Player } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime, filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'badman-player-fields',
  templateUrl: './edit-player-fields.component.html',
  styleUrls: ['./edit-player-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    HasClaimComponent,
    MatSelectModule,
    TranslateModule,
  ],
})
export class EditPlayerFieldsComponent implements OnInit {
  @Input()
  player!: Player;

  @Output()
  playerChanged = new EventEmitter<Partial<Player>>();

  fg!: FormGroup;

  constructor(
    private claimService: ClaimService,
    private apollo: Apollo,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const firstNameControl = new FormControl(
      this.player.firstName,
      Validators.required
    );
    const lastNameControl = new FormControl(
      this.player.lastName,
      Validators.required
    );
    const memberIdControl = new FormControl(
      this.player.memberId,
      Validators.required
    );
    const genderControl = new FormControl(
      this.player.gender,
      Validators.required
    );
    const subControl = new FormControl(this.player.sub);

    memberIdControl.disable();
    subControl.disable();

    this.claimService.hasClaim$('link:player').subscribe((r) => {
      if (r) {
        memberIdControl.enable();
        subControl.enable();
      }
    });

    this.fg = new FormGroup({
      firstName: firstNameControl,
      lastName: lastNameControl,
      memberId: memberIdControl,
      gender: genderControl,
      sub: subControl,
    });

    this.fg.valueChanges
      .pipe(
        debounceTime(600),
        filter(() => this.fg.valid),
        filter(
          (v) =>
            v.firstName !== this.player.firstName ||
            v.lastName !== this.player.lastName ||
            v.memberId !== this.player.memberId ||
            v.sub !== this.player.sub ||
            v.gender !== this.player.gender
        ),
        switchMap(() =>
          this.apollo.mutate<{ updatePlayer: Player }>({
            mutation: gql`
              mutation UpdatePlayer($data: PlayerUpdateInput!) {
                updatePlayer(data: $data) {
                  id
                  firstName
                  lastName
                  memberId
                  gender
                }
              }
            `,
            variables: {
              data: {
                id: this.player.id,
                firstName: this.fg.value.firstName,
                lastName: this.fg.value.lastName,
                memberId: this.fg.value.memberId,
                gender: this.fg.value.gender,
                sub: this.fg.value.sub,
              },
            },
          })
        )
      )
      .subscribe(() => {
        this._snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }
}
