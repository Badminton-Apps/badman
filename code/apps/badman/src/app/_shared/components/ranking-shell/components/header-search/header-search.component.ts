import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { merge, Observable, of, ReplaySubject } from 'rxjs';
import { debounceTime, filter, map, startWith, switchMap } from 'rxjs/operators';
import { Club, CompetitionEvent, Player, TournamentEvent } from '../../../../models';
import { PlayerService } from '../../../../services/player/player.service';

@Component({
  selector: 'badman-header-search',
  templateUrl: './header-search.component.html',
  styleUrls: ['./header-search.component.scss'],
})
export class HeaderSearchComponent implements OnInit {
  @Input()
  label: string = 'search.placeholder';

  formControl!: FormControl;
  filteredOptions$!: Observable<{ value: Player | CompetitionEvent | TournamentEvent; type: string }[]>;
  clear$: ReplaySubject<{ value: Player | CompetitionEvent | TournamentEvent; type: string }[]> = new ReplaySubject(0);

  constructor(private playerService: PlayerService, private router: Router) {}

  ngOnInit() {
    this.formControl = new FormControl();
    const search$ = this.formControl.valueChanges.pipe(
      startWith(''),
      filter((x) => !!x),
      filter((x) => typeof x === 'string'),
      filter((x) => x?.length > 1),
      debounceTime(600),
      switchMap((query) => this.playerService.headerSearch(query)),
      // Distinct by id
      map((result) =>
        result?.filter((value, index, self) => self.findIndex((m) => m?.value?.id === value?.value?.id) === index)
      )
    );

    this.filteredOptions$ = merge(search$, this.clear$);
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    this.formControl.setValue(null);
    switch (event.option.value.type) {
      case 'Player':
        this.router.navigate(['/player', event.option.value.value.slug]);
        break;
      case 'EventCompetition':
        this.router.navigate(['/competition', event.option.value.value.slug]);
        break;
      case 'EventTournament':
        this.router.navigate(['/tournament', event.option.value.value.slug]);
        break;
      case 'Club':
        this.router.navigate(['/club', event.option.value.value.slug]);
        break;
    }
  }
}
