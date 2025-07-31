
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BadmanBlockModule, PlayerSearchComponent } from '@badman/frontend-components';
import {
  Club,
  EntryCompetitionPlayer,
  Player,
  SubEventCompetition,
  Team,
} from '@badman/frontend-models';
import { TranslatePipe } from '@ngx-translate/core';
import { PickEventDialogComponent } from '../../../../dialogs';

@Component({
    selector: 'badman-club-edit-team',
    templateUrl: './club-edit-team.component.html',
    styleUrls: ['./club-edit-team.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    TranslatePipe,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    MatInputModule,
    PlayerSearchComponent,
    BadmanBlockModule
]
})
export class ClubEditTeamComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  whenPlayerAdded = output<Partial<Player>>();
  whenPlayerRemoved = output<Partial<Player>>();
  whenPlayerMetaUpdated = output<Partial<EntryCompetitionPlayer>>();
  whenSubEventChanged = output<{
    event: string;
    subEvent: string;
  }>();

  club = input.required<Club>();

  team = input.required<Team>();

  subEvent?: SubEventCompetition;

  players?: Partial<EntryCompetitionPlayer>[];
  teamIndex?: number;

  where!: { [key: string]: unknown };

  @ViewChild('changeRanking')
  changeRankingTemplateRef?: TemplateRef<HTMLElement>;
  changeRankingFormGroup?: FormGroup;

  ngOnInit(): void {
    this.subEvent = this.team().entry?.subEventCompetition;

    this.teamIndex = this.team().entry?.meta?.competition?.teamIndex;
    this.players = this.team().entry?.meta?.competition?.players;

    this.where = {
      gender:
        this.team().type == 'MX' || this.team().type == 'NATIONAL' ? undefined : this.team().type,
    };
  }

  changeSubEvent() {
    this.dialog
      .open(PickEventDialogComponent, {
        data: {
          season: this.team().season,
          eventId: this.subEvent?.eventCompetition?.id,
          subEventId: this.subEvent?.id,
          type: this.team()?.type,
        },
      })
      .afterClosed()
      .subscribe((event) => {
        if (event) {
          this.whenSubEventChanged.emit(event);
        }
      });
  }

  onLevelException(player: Partial<EntryCompetitionPlayer>) {
    this.whenPlayerMetaUpdated.emit({
      ...player,
      levelException: !player.levelException,
    });
  }

  onEditRanking(player: Partial<EntryCompetitionPlayer>) {
    if (!this.changeRankingTemplateRef) {
      return;
    }

    this.changeRankingFormGroup = new FormGroup({
      single: new FormControl(player.single),
      double: new FormControl(player.double),
      mix: new FormControl(player.mix),
    });

    const dialogRef = this.dialog.open(this.changeRankingTemplateRef);
    dialogRef.afterClosed().subscribe(() => {
      if (this.changeRankingFormGroup?.valid) {
        this.whenPlayerMetaUpdated.emit({
          ...player,
          single: this.changeRankingFormGroup?.get('single')?.value,
          double: this.changeRankingFormGroup?.get('double')?.value,
          mix: this.changeRankingFormGroup?.get('mix')?.value,
        });
      }
    });
  }
}
