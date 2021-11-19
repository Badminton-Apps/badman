import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { lastValueFrom, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { debounceTime, filter, map, startWith, switchMap } from 'rxjs/operators';
import { PlayerService } from '../../../../services/player/player.service';
import { NewPlayerComponent } from '../new-player/new-player.component';
import { Club, Player } from './../../../../models';

@Component({
  selector: 'app-player-search',
  templateUrl: './player-search.component.html',
  styleUrls: ['./player-search.component.scss'],
})
export class PlayerSearchComponent implements OnChanges, OnInit {
  @Output() onSelectPlayer = new EventEmitter<Player>();

  @Input()
  label: string = 'players.search.label';

  @Input()
  allowCreation: boolean = false;

  @Input()
  clearOnSelection: boolean = true;

  @Input()
  where!: {};

  @Input()
  player!: string | Player;

  @Input()
  ranking!: Date;

  @Input()
  club!: string | Club;

  @Input()
  searchOutsideClub = true;

  clubId?: string;

  @Input()
  ignorePlayers?: Player[];

  ignorePlayersIds?: string[];

  formControl!: FormControl;
  filteredOptions$!: Observable<Player[]>;
  clear$: ReplaySubject<Player[]> = new ReplaySubject(0);

  constructor(private playerService: PlayerService, private dialog: MatDialog) {}

  ngOnChanges(changes: SimpleChanges) {
    if (!(changes['player']?.isFirstChange() ?? true)) {
      this.setPlayer();
    }
    if (changes['ignorePlayers']) {
      this.ignorePlayersIds = (this.ignorePlayers?.map((r) => r.id) ?? []).filter(
        (v, i, a) => a.indexOf(v) === i
      ) as string[];
    }
  }

  ngOnInit() {
    this.formControl = new FormControl();
    this.setPlayer();

    const search$ = this.formControl.valueChanges.pipe(
      startWith(''),
      filter((x) => !!x),
      filter((x) => typeof x === 'string'),
      filter((x) => x?.length > 3),
      debounceTime(600),
      switchMap((r) => {
        this.clubId = this.club instanceof Club ? this.club?.id : this.club ?? undefined;

        const obs = this.clubId
          ? this.playerService.searchClubPlayers(this.clubId, {
              query: r,
              where: this.where,
              ranking: this.ranking,
            })
          : of([]);

        return obs.pipe(
          map((results) => {
            return {
              query: r,
              results,
            };
          })
        );
      }),
      switchMap((response) => {
        if (response?.results?.length && response?.results?.length > 0) {
          return of(response.results);
        } else if (this.searchOutsideClub) {
          return this.playerService.searchPlayers({
            query: response.query,
            where: this.where,
            includeClub: true,
            ranking: this.ranking,
          });
        } else {
          return of([]);
        }
      }),
      // Distinct by id
      map((result) => result?.filter((value, index, self) => self.findIndex((m) => m.id === value.id) === index))
    );

    this.filteredOptions$ = merge(search$, this.clear$);
  }

  private setPlayer() {
    of(this.player)
      .pipe(
        switchMap((p) => {
          if (typeof p == 'string') {
            return lastValueFrom(this.playerService.getPlayer(p));
          }
          return of(p);
        })
      )
      .subscribe((player) => {
        if (player) {
          this.formControl.setValue(player, { emitEvent: false });
        }
      });
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
          const dbPlayer = await lastValueFrom(
            this.playerService.addPlayer({
              memberId: player.memberId,
              firstName: player.firstName,
              lastName: player.lastName,
              gender: player.gender,
            })
          );
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
      this.clear$.next([]);
    }
  }
}
