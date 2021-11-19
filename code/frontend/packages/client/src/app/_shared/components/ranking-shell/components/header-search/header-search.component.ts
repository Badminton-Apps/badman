import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { merge, Observable, of, ReplaySubject } from 'rxjs';
import { debounceTime, filter, map, startWith, switchMap } from 'rxjs/operators';
import { Club, Player } from '../../../../models';
import { PlayerService } from '../../../../services/player/player.service';

@Component({
  selector: 'app-header-search',
  templateUrl: './header-search.component.html',
  styleUrls: ['./header-search.component.scss'],
})
export class HeaderSearchComponent implements OnInit {
  @Output() onSelectPlayer = new EventEmitter<Player>();

  @Input()
  label: string = 'Search';

  @Input()
  clearOnSelection: boolean = true;

  @Input()
  where!: {};

  @Input()
  player!: Player;

  @Input()
  searchOutsideClub = true;

  formControl!: FormControl;
  filteredOptions$!: Observable<Player[]>;
  clear$: ReplaySubject<Player[]> = new ReplaySubject(0);

  constructor(private playerService: PlayerService) {}

  ngOnInit() {
    this.formControl = new FormControl(this.player);

    const search$ = this.formControl.valueChanges.pipe(
      startWith(''),
      filter((x) => !!x),
      filter((x) => typeof x === 'string'),
      filter((x) => x?.length > 3),
      debounceTime(600),
      switchMap((query) => {
        return this.playerService.searchPlayers({
          query: query
        });
      }),
      // Distinct by id
      map((result) => result?.filter((value, index, self) => self.findIndex((m) => m.id === value.id) === index))
    );

    this.filteredOptions$ = merge(search$, this.clear$);
  }

  displayFn(user: Player): string {
    return user && user.fullName;
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    this._selectPlayer(event.option.value);
  }

  private _selectPlayer(player: Player) {
    this.onSelectPlayer.next(player);
    if (this.clearOnSelection) {
      this.formControl.reset();
      this.clear$.next([]);
    }
  }
}
