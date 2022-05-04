import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Player, RankingSystem, PlayerService, ClaimService } from '../../../_shared';
@Component({
  templateUrl: './edit-player.component.html',
  styleUrls: ['./edit-player.component.scss'],
})
export class EditPlayerComponent implements OnInit {
  player$!: Observable<Player>;
  system?: RankingSystem;

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  constructor(
    private playerService: PlayerService,
    private claimService: ClaimService,
    private route: ActivatedRoute
  ) {}
  ngOnInit(): void {
    this.player$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => {
        if (!id) {
          throw new Error('No id');
        }
        return this.playerService.getPlayer(id);
      })
    );
  }

  public hasPermission(claim: string[]) {
    return this.claimService.hasAnyClaims$(claim);
  }
}
