import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { BreadcrumbService } from 'xng-breadcrumb';
import { EditTeamComponent } from '../../components';

@Component({
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,

    // Material
    MatIconModule,
    MatButtonModule,
    MatMenuModule,

    EditTeamComponent,
  ],
})
export class EditPageComponent implements OnInit {
  team!: Team;

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.team = this.route.snapshot.data['team'];
    const teamName = `${this.team.name}`;

    this.seoService.update({
      title: teamName,
      description: `Team ${teamName}`,
      type: 'website',
      keywords: ['team', 'badminton'],
    });
    this.breadcrumbsService.set(
      'club/:id',
      this.route.snapshot.data['club'].name
    );
    this.breadcrumbsService.set('club/:id/team/:id', teamName);
  }
}
