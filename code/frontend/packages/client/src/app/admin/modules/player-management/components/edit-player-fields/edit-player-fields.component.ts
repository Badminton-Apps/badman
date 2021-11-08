import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService, Player } from 'app/_shared';
import { debounceTime } from 'rxjs/operators';

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

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    const firstNameControl = new FormControl(this.player.firstName, Validators.required);
    const lastNameControl = new FormControl(this.player.lastName, Validators.required);
    const memberIdControl = new FormControl(this.player.memberId, Validators.required);
    const compPlayer = new FormControl(this.player.competitionPlayer);
    const subControl = new FormControl(this.player.sub);

    memberIdControl.disable();
    subControl.disable();

    this.auth.hasClaim$('link:player').subscribe((r) => {
      if (r) {
        memberIdControl.enable();
        subControl.enable();
      }
    });

    this.fg = new FormGroup({
      firstName: firstNameControl,
      lastName: lastNameControl,
      memberId: memberIdControl,
      compPlayer: compPlayer,
      sub: subControl,
    });

    this.fg.valueChanges.pipe(debounceTime(600)).subscribe((value) => {
      if (this.fg.valid) {
        this.onPlayerChanged.next({
          id: this.player.id,
          firstName: this.fg.value.firstName,
          lastName: this.fg.value.lastName,
          memberId: this.fg.value.memberId,
          competitionPlayer: this.fg.value.compPlayer,
          sub: this.fg.value.sub,
        });
      }
    });
  }
}
