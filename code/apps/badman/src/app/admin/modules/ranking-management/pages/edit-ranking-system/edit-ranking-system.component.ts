import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { RankingSystem, RankingGroup, SystemService } from '../../../../../_shared';

@Component({
  templateUrl: './edit-ranking-system.component.html',
  styleUrls: ['./edit-ranking-system.component.scss'],
})
export class EditRankingSystemComponent implements OnInit {
  system$!: Observable<RankingSystem>;
  rankingGroups$!: Observable<RankingGroup[]>;

  constructor(
    private systemService: SystemService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.system$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => {
        if (!id) {
          throw new Error('No id');
        }
        return this.systemService.getSystem(id);
      })
    ); 
    this.rankingGroups$ = this.systemService.getSystemsGroups();
  }

  async save(system: RankingSystem) {
    await this.systemService.updateSystem(system).toPromise();
    await this.router.navigate(['admin', 'ranking']);
  }
}
