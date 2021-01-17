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
  tap,
} from 'rxjs/operators';
import { PlayerService } from '../../../../services/player/player.service';
import { Player, User } from './../../../../models';

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
  filteredOptions: Observable<User[]>;
  constructor(private playerService: PlayerService) {}

  ngOnInit() {
    this.filteredOptions = this.formControl.valueChanges.pipe(
      startWith(''),
      filter((x) => x),
      map((value) =>
        typeof value === 'string'
          ? value
          : `${value.lastName} ${value.firstName}`
      ),
      filter((x) => x.length > 3),
      debounceTime(600),
      flatMap((r) => this.playerService.searchPlayers(r)),
      map((result) => (result as any).playerSearch)
    );
  }

  displayFn(user: User): string {
    return user && user.firstName ? `${user.firstName} ${user.lastName}` : '';
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    this.onSelectPlayer.next(event.option.value);
    this.formControl.reset();
  }
}
