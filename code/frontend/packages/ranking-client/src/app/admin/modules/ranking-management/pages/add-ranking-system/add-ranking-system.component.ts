import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { RankingSystem, RankingSystemGroup, SystemService } from 'app/_shared';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  templateUrl: './add-ranking-system.component.html',
  styleUrls: ['./add-ranking-system.component.scss'],
})
export class AddRankingSystemComponent {
  rankingGroups$: Observable<RankingSystemGroup[]>;

  constructor(private systemSerice: SystemService, private router: Router) {
    this.rankingGroups$ = this.systemSerice.getSystemsGroups();
  }

  async add(system: RankingSystem) {
    await this.systemSerice.addSystem(system).toPromise();
    await this.router.navigate(['admin', 'calculate-simulation']);
  }
}
