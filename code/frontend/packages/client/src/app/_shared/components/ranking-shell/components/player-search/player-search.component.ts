import { MatDialog } from '@angular/material/dialog';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { merge, Observable, ReplaySubject } from 'rxjs';
import { debounceTime, filter, startWith, switchMap } from 'rxjs/operators';
import { PlayerService } from '../../../../services/player/player.service';
import { Club, Player } from './../../../../models';
import { NewPlayerComponent } from '../new-player/new-player.component';

@Component({
  selector: 'app-player-search',
  templateUrl: './player-search.component.html',
  styleUrls: ['./player-search.component.scss'],
})
export class PlayerSearchComponent implements OnInit {
  @Output() onSelectPlayer = new EventEmitter<Player>();

  @Input()
  label: string = 'Search';

  @Input()
  allowCreation: boolean = false;

  @Input()
  clearOnSelection: boolean = true;

  @Input()
  where: {};

  @Input()
  player: Player;

  @Input()
  style = 'no-header';

  @Input()
  club: string | Club;

  clubId: string;

  @Input()
  ignorePlayers: Player[];

  ignorePlayersIds: string[];

  formControl: FormControl;
  filteredOptions$: Observable<Player[]>;
  clear$: ReplaySubject<Player[]> = new ReplaySubject(0);

  constructor(private playerService: PlayerService, private dialog: MatDialog) {}

  ngOnInit() {
    this.formControl = new FormControl(this.player);
    this.ignorePlayersIds = this.ignorePlayers?.map((r) => r.id) ?? [];
    const search$ = this.formControl.valueChanges.pipe(
      startWith(''),
      filter((x) => !!x),
      filter((x) => typeof x === 'string'),
      filter((x) => x?.length > 3),
      debounceTime(600),
      switchMap(async (r) => {
        this.clubId = this.club instanceof Club ? this.club?.id : this.club ?? undefined;

        // first try searching for club
        let results = this.clubId
          ? await this.playerService
              .searchClubPlayers(this.clubId, {
                query: r,
                where: this.where,
              })
              .toPromise()
          : null ?? [];

        // Check without club
        if (results.length == 0) {
          results =
            (await this.playerService
              .searchPlayers({
                query: r,
                where: this.where,
                includeClub: true,
              })
              .toPromise()) ?? [];
        }

        return results;
      })
    );

    this.filteredOptions$ = merge(search$, this.clear$);
  }

  displayFn(user: Player): string {
    return user && user.fullName;
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    if (event.option.value?.id == null) {
      let dialogRef = this.dialog.open(NewPlayerComponent, {
        data: { input: event.option.value },
      });

      dialogRef.afterClosed().subscribe(async (player: Partial<Player>) => {
        if (player) {
          const dbPlayer = await this.playerService
            .addPlayer({
              memberId: player.memberId,
              firstName: player.firstName,
              lastName: player.lastName,
              gender: player.gender,
            })
            .toPromise();
          if (!this.clearOnSelection) {
            this.formControl.setValue(player);
          }
          this._selectPlayer(dbPlayer);
        }
      });
    } else {
      this._selectPlayer(event.option.value);
    }
  }

  private _selectPlayer(player: Player) {
    this.onSelectPlayer.next(player);
    if (this.clearOnSelection) {
      this.formControl.reset();
      this.clear$.next(null);
    }
  }
}
