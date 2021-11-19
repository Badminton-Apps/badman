import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { RankingSystem, RankingSystemGroup, SystemService } from 'app/_shared';

@Component({
  templateUrl: './edit-ranking-system.component.html',
  styleUrls: ['./edit-ranking-system.component.scss'],
})
export class EditRankingSystemComponent implements OnInit {
  system$!: Observable<RankingSystem>;
  rankingGroups$!: Observable<RankingSystemGroup[]>;

  constructor(
    private systemService: SystemService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.system$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => this.systemService.getSystem(id!))
    ); 
    this.rankingGroups$ = this.systemService.getSystemsGroups();
  }

  async save(system: RankingSystem) {
    await this.systemService.updateSystem(system).toPromise();
    await this.router.navigate(['admin', 'ranking']);
  }
}
