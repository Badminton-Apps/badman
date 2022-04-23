import { ChangeDetectionStrategy, Component, EventEmitter, Injectable, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClaimService, Player, PlayerService } from 'app/_shared';
import { debounceTime, filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-player-fields',
  templateUrl: './edit-player-fields.component.html',
  styleUrls: ['./edit-player-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPlayerFieldsComponent implements OnInit {
  @Input()
  player!: Player;

  @Output() onPlayerChanged = new EventEmitter<Partial<Player>>();

  fg!: FormGroup;

  constructor(
    private claimService: ClaimService,
    private playerService: PlayerService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const firstNameControl = new FormControl(this.player.firstName, Validators.required);
    const lastNameControl = new FormControl(this.player.lastName, Validators.required);
    const memberIdControl = new FormControl(this.player.memberId, Validators.required);
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
      sub: subControl,
    });

    this.fg.valueChanges
      .pipe(
        debounceTime(600),
        filter((_) => this.fg.valid),
        filter(
          (v) =>
            v.firstName !== this.player.firstName ||
            v.lastName !== this.player.lastName ||
            v.memberId !== this.player.memberId ||
            v.sub !== this.player.sub
        ),
        switchMap((v) =>
          this.playerService.updatePlayer({
            id: this.player.id,
            firstName: this.fg.value.firstName,
            lastName: this.fg.value.lastName,
            memberId: this.fg.value.memberId,
            sub: this.fg.value.sub,
          })
        )
      )
      .subscribe((value) => {
        this._snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }
}
