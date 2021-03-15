import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable } from 'rxjs';
import {
  debounceTime,
  filter,
  flatMap,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { PlayerService } from '../../../../services/player/player.service';
import { Player } from './../../../../models';

@Component({
  selector: 'app-player-search',
  templateUrl: './player-search.component.html',
  styleUrls: ['./player-search.component.scss'],
})
export class PlayerSearchComponent implements OnInit {
  @Output() onSelectPlayer = new EventEmitter<Player>();

  @Input()
  label: string = 'Search';

  formControl = new FormControl();
  filteredOptions: Observable<Player[]>;
  constructor(private playerService: PlayerService) {}

  ngOnInit() {
    this.filteredOptions = this.formControl.valueChanges.pipe(
      startWith(''),
      filter((x) => x),
      map((value) => (typeof value === 'string' ? value : value?.fullName)),
      filter((x) => x?.length > 3),
      debounceTime(600),
      switchMap((r) => this.playerService.searchPlayers({ query: r }))
    );
  }

  displayFn(user: Player): string {
    return user && user.fullName;
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    this.onSelectPlayer.next(event.option.value);
    this.formControl.reset();
  }
}
