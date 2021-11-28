import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Claim, Player, PlayerService, RankingPlace, RankingSystem, SystemService } from 'app/_shared';
import { ClaimService } from 'app/_shared/services/security/claim.service';
import { combineLatest, Observable, lastValueFrom, tap } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
@Component({
  templateUrl: './edit-player.component.html',
  styleUrls: ['./edit-player.component.scss'],
})
export class EditPlayerComponent implements OnInit {
  player$!: Observable<Player>;
  system?: RankingSystem;

  constructor(
    private playerService: PlayerService,
    private systemService: SystemService,
    private claimService: ClaimService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(map((x) => x.get('id')));

    const system$ = this.systemService.getPrimarySystem().pipe(
      filter((x) => !!x),
      tap((x) => (this.system = x ?? undefined))
    );

    this.player$ = combineLatest([id$, system$]).pipe(
      switchMap(([playerId, system]) => this.playerService.getPlayer(playerId!, system!.id!))
    );
  }

  async claimChanged(args: { claim: Claim; checked: boolean }, player: Player) {
    await lastValueFrom(this.claimService.updateGlobalUserClaim(player.id!, args.claim.id!, args.checked));
  }

  async onRankingPlaceChanged(rankingPlace: Partial<RankingPlace>, player: Player) {
    await lastValueFrom(this.playerService.updatePlayerRanking(rankingPlace, player.id!));
  }
  async onPlayerUpdated(player: Partial<Player>) {
    await lastValueFrom(this.playerService.updatePlayer(player));
  }
}
