import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, flatMap, map, startWith, debounceTime } from 'rxjs/operators';
import { PlayerService } from '../../../../services/player/player.service';
import { User } from './../../../../models';

@Component({
  selector: 'app-player-search',
  templateUrl: './player-search.component.html',
  styleUrls: ['./player-search.component.scss']
})
export class PlayerSearchComponent implements OnInit {
  myControl = new FormControl();
  filteredOptions: Observable<User[]>;
  constructor(private playerService: PlayerService, private router: Router) {}

  ngOnInit() {
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      map(value => (typeof value === 'string' ? value : value.name)),
      filter(x => x),
      filter(x => x.length > 3),
      debounceTime(600),
      flatMap(r => this.playerService.searchPlayers(r)),
      map(result => (result as any).playerSearch)
    );
  }

  displayFn(user: User): string {
    return user && user.firstName ? `${user.firstName} ${user.lastName}` : '';
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    if (event.option.value.id) {
      this.router.navigate(['/player', event.option.value.id]);
    }
  }
}
