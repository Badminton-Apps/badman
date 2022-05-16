import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import {
  RankingSystem,
  RankingSystemGroup,
  SystemService,
} from '../../../../../_shared';

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
    await this.router.navigate(['admin', 'ranking']);
  }
}
