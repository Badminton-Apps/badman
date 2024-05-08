import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, model, untracked } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Player } from '@badman/frontend-models';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { SelectPlayersService } from './select-player.service';

@Component({
  selector: 'badman-select-player',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MtxSelectModule,
    TranslateModule,
  ],
  templateUrl: './select-player.component.html',
  styleUrls: ['./select-player.component.scss'],
})
export class SelectPlayerSignalsComponent {
  private readonly dataService = new SelectPlayersService();
  query$ = new Subject<string>();

  form = this.dataService.filter;

  disabled = input(false);
  label = input('all.pickers.select-player');

  possiblePlayers = computed(() => {
    let players = this.dataService.players();

    untracked(() => {
      const customFilter = this.filter();

      if (customFilter) {
        players = customFilter(players);
      }
    });

    return players;
  });

  filter = input<(results: Player[]) => Player[]>((value) => value);

  // selections
  player = model<string | null>(null);

  where = model<{ [key: string]: unknown }>({});

  // not sure if this is the right way to do this, otherwise it's just the same as unused private variable
  constructor() {
    effect(() => {
      if (this.player()) {
        this.dataService.filter.patchValue({
          emptyWhere: {
            id: this.player(),
          },
          where: this.where(),
        });
      } else {
        this.dataService.filter.patchValue({});
      }

      this.query$.subscribe((query) => {
        this.dataService.filter.patchValue({ query });
      });
    });

    effect(
      () => {
        if (!this.player() && this.possiblePlayers().length > 0) {
          this.player.set(this.possiblePlayers()[0].id);
        }
      },
      {
        allowSignalWrites: true,
      },
    );
  }
}
