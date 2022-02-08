import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { Club, Player } from 'app/_shared';

@Component({
  selector: 'app-merge-player',
  templateUrl: './merge-player.component.html',
  styleUrls: ['./merge-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MergePlayerComponent implements OnInit {
  @Input() player!: Player;

  club?: Club;

  ngOnInit(): void {
    if ((this.player.clubs?.length ?? 0) > 0) {
      this.club = this.player.clubs?.[0];
    }
  }
}
