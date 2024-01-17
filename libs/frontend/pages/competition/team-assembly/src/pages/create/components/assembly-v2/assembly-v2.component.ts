import { CommonModule } from '@angular/common';
import { Component, Injector, Input, Signal, effect, inject } from '@angular/core';
import { Player } from '@badman/frontend-models';
import { AssemblyService } from './assembly.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgxResize, ResizeResult } from 'ngxtension/resize';
import { AssemblyMessageComponent } from '../assembly-message/assembly-message.component';

@Component({
  selector: 'badman-assembly-v2',
  standalone: true,
  imports: [
    CommonModule,
    AssemblyMessageComponent,

    TranslateModule,
    NgxResize,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './assembly-v2.component.html',
  styleUrl: './assembly-v2.component.scss',
})
export class AssemblyV2Component {
  data = inject(AssemblyService);
  private readonly injector = inject(Injector);

  @Input({ required: true }) teamId!: Signal<string | undefined>;
  @Input({ required: true }) encounterId!: Signal<string | undefined>;

  notSmallScreen = true;

  constructor() {
    effect(() => {
      this.data.state.setInfo({
        teamId: this.teamId(),
        encounterId: this.encounterId(),
      });
    });
  }

  testGlenn() {
    this.data.state.setDouble({
      index: 1,
      index2: 0,
      player: {
        id: '90fcc155-3952-4f58-85af-f90794165c89',
      } as Player,
    });
  }

  testShane() {
    this.data.state.setDouble({
      index: 1,
      index2: 1,
      player: {
        id: 'c2140fa9-6ea6-4a41-9c7d-c7d27aed14bd',
      } as Player,
    });
  }

  clearDouble(index: 1 | 2 | 3 | 4, index2: 0 | 1) {
    this.data.state.setDouble({
      index,
      index2,
      player: undefined,
    });
  }

  isException(id?: string) {
    if (!id) {
      return false;
    }

    return this.data.state['metaPlayers']()?.find((p: Player) => p.id === id)?.levelException ?? false;
  }

  onResized(event: ResizeResult) {
    this.notSmallScreen = event.width > 200;
  }
}
