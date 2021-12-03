import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { ClaimService, Player, PlayerService, RankingSystem } from 'app/_shared';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
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
      switchMap((id) => this.playerService.getPlayer(id!))
    );
  }

  public hasPermission(claim: string[]) {
    return this.claimService.hasAnyClaims$(claim);
  }
}
