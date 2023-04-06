import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  PlayerSearchComponent,
} from '@badman/frontend-components';
import { Player, Team } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, tap } from 'rxjs';

@Component({
  selector: 'badman-team-fields',
  templateUrl: './fields.component.html',
  styleUrls: ['./fields.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    FormsModule,

    // Material
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatOptionModule,
    HasClaimComponent,
    MatSelectModule,

    // Own modules
    HasClaimComponent,
    PlayerSearchComponent,
  ],
})
export class TeamFieldComponent implements OnInit {
  @Input()
  team!: Team;

  @Input()
  teamNumbers!: number[];

  @Output()
  teamUpdated = new EventEmitter<Team>();

  @Output()
  numberChanged = new EventEmitter<{
    oldNumber: number;
    newNumber: number;
  }>();

  teamForm?: FormGroup;

  ngOnInit(): void {
    const numberControl = new FormControl(this.team.teamNumber);
    const typeControl = new FormControl(this.team.type);

    const captainIdControl = new FormControl(this.team.captain?.id);
    const phoneControl = new FormControl(this.team.phone);
    const emailControl = new FormControl(this.team.email);

    this.teamForm = new FormGroup({
      teamNumber: numberControl,
      type: typeControl,
      captainId: captainIdControl,
      phone: phoneControl,
      email: emailControl,
    });

    numberControl.valueChanges.subscribe((r) => this.onNumberChange(r ?? -1));

    this.teamForm.valueChanges
      .pipe(
        tap((r) => {
          this.team.teamNumber = r.teamNumber;
          this.team.type = r.type;
          this.team.captainId = r.captainId;
          this.team.phone = r.phone;
          this.team.email = r.email;
        }),
        debounceTime(600)
      )
      .subscribe(() => this.teamUpdated.emit(this.team));
  }

  async onCaptainSelect(player: Partial<Player>) {
    this.team.captainId = player.id;
    this.team.captain = player as Player;

    this.teamForm?.patchValue({
      captainId: player.id,
      email: player.email,
      phone: player.phone,
    });
  }

  onNumberChange(newNumber: number) {
    console.log('onNumberChange', newNumber);
    this.numberChanged.emit({
      oldNumber: this.team.teamNumber ?? -1,
      newNumber,
    });
  }
}
